import { createClient } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';
import { encQuestions } from './questions';
import { $, esc, richText } from './utils/dom';
import { shuffle, pickProportional, sessionId, fmtTime, generateRadarSVG } from './utils/helpers';
import { store, State } from './core/store';
import { idb, saveProgress, syncQueue } from './services/db';
import { showToast } from './components/toast';
import { telemetry } from './services/telemetry';
import './components/progress';
import { initI18n, setLanguage } from './core/i18n';
import DecryptionWorker from './workers/decryption.worker?worker';

import { fetchGlobalStats, renderLeaderboard } from './features/leaderboard/leaderboard';
import { loadDashboard } from './features/dashboard/dashboard';
import { sbClient } from './services/supabase';
import * as ExamEngine from './core/ExamEngine';
import { FlashcardEngine } from './features/exam/FlashcardEngine';
import { hashPIN } from './utils/helpers';

declare global {
  interface Window {
    ON_EXAM?: boolean;
    __focusLoss?: number;
    __isProctorMode?: boolean;
    finishExamForProctor?: () => void;
    __startDevToolsCheck?: () => void;
    __stopDevToolsCheck?: () => void;

    QUESTIONS: any[];
    setQuestions: (qs: any[]) => void;
    loadQuestions: () => Promise<void>;
    submitToSupabase?: (score: number, wrong: number[], time: number) => void;
    wireExam?: () => void;
    verifyUser?: () => Promise<boolean>;
    sbClient?: any;
    finishFlashcards?: () => void;
    saveAdminQuestion?: (id: string, q: any) => void;
    showView?: (id: string) => void;
    startExam?: (opts: ExamOpts) => void;
    loadComments?: (q: string, c: string) => Promise<void>;
    postComment?: (q: string, c: string) => void;
    supabase?: { createClient: (url: string, key: string) => any };
  }
}

interface ExamOpts {
  count: number;
  minutes: number;
  untimed: boolean;
  shuffleOptions?: boolean;
  review?: boolean;
}

interface DomainStat {
  total: number;
  correct: number;
}

/* =======================================================================
   CCAF Mock — Exam Engine
   ======================================================================= */
(function () {
  'use strict';

  // ---- globals moved up ----

  // ---- questions setup ----
  window.QUESTIONS = [];
  window.setQuestions = function (qs: any[]) {
    window.QUESTIONS = qs;
  };

  function getQuestions(): any[] {
    return window.QUESTIONS;
  }

  // ---- removed imports ----

  // ===== Global Error Boundary =====
  window.addEventListener('error', function (e) {
    console.error('[CCAF Error Boundary] Unhandled error:', e.error || e.message);
    const errUI = document.createElement('div');
    errUI.style.cssText =
      'position:fixed;bottom:10px;right:10px;background:var(--bad);color:#fff;padding:10px;border-radius:8px;z-index:9999;font-size:0.85rem;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    errUI.innerHTML = `<strong>Error</strong><br/>${esc(e.message || 'Unknown error occurred.')}`;
    document.body.appendChild(errUI);
    setTimeout(() => errUI.remove(), 5000);
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[CCAF Error Boundary] Unhandled Promise Rejection:', e.reason);
  });

  // ---- central state proxy (Read Only) ----

  // Cross-Tab Concurrency Sync Hook
  store.subscribe((newState) => {
    // Determine the correct view based on the state
    let targetView = 'view-start';
    if (newState.isFlashcardMode && !newState.finished) targetView = 'view-flashcard';
    else if (newState.items.length > 0 && !newState.finished) targetView = 'view-running';
    else if (newState.finished) targetView = 'view-result';

    // If targetView is currently hidden, show it
    const targetEl = document.getElementById(targetView);
    if (targetEl && targetEl.classList.contains('hidden') && targetView !== 'view-start') {
      showView(targetView);
    }

    // Force re-render of active components if running
    if (targetView === 'view-running') {
      ExamEngine.renderQuestion();
      ExamEngine.renderPalette();
      ExamEngine.renderProgress();
    } else if (targetView === 'view-result') {
      ExamEngine.renderResultDOM(); // which renders the result page
    }
  });

  // ---- view switching ----
  let isTransitioning = false;
  let pendingView: string | null = null;

  function showView(id: string) {
    const updateDOM = () => {
      [
        'view-start',
        'view-running',
        'view-result',
        'view-review',
        'view-admin',
        'view-flashcard',
      ].forEach((v) => {
        const el = document.getElementById(v);
        if (!el) return;
        if (v === id) el.classList.remove('hidden');
        else el.classList.add('hidden');
      });
      const sec = document.getElementById('exam');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (!document.startViewTransition) {
      updateDOM();
      return;
    }

    if (isTransitioning) {
      pendingView = id;
      return;
    }

    isTransitioning = true;
    const transition = document.startViewTransition(() => updateDOM());

    transition.finished
      .finally(() => {
        isTransitioning = false;
        if (pendingView) {
          const next = pendingView;
          pendingView = null;
          showView(next);
        }
      })
      .catch((e) => {
        console.error('[CCAF Error Boundary] View Transition Aborted:', e);
      });
  }

  // ---- wire up ----
  function readOpts() {
    return {
      count: parseInt(($('#opt-count') as HTMLInputElement).value, 10) || 60,
      minutes: parseInt(($('#opt-minutes') as HTMLInputElement).value, 10) || 120,
      // Shuffle options and review explanations are always on now.
      shuffleOptions: true,
      review: true,
      untimed: false,
    };
  }

  function wire() {
    // static info
    const qcEl = document.getElementById('question-count-info');
    if (qcEl) qcEl.textContent = getQuestions().length.toString();

    const start = $('#btn-start');
    let starting = false;
    if (start)
      start.addEventListener('click', async () => {
        if (starting) return;
        starting = true;
        try {
          if (window.verifyUser) {
            const v = await window.verifyUser();
            if (!v) return;
          }
          window.startExam?.(readOpts());
        } finally {
          starting = false;
        }
      });

    const practice = $('#btn-practice');
    if (practice)
      practice.addEventListener('click', async () => {
        if (starting) return;
        starting = true;
        try {
          if (window.verifyUser) {
            const v = await window.verifyUser();
            if (!v) return;
          }
          const o = readOpts();
          o.untimed = true;
          window.startExam?.(o);
        } finally {
          starting = false;
        }
      });

    const next = $('#btn-next');
    if (next)
      next.addEventListener('click', () => {
        if (ExamEngine.state.idx < ExamEngine.state.items.length - 1) {
          store.dispatch({ type: 'SET_INDEX', payload: ExamEngine.state.idx + 1 });
          ExamEngine.renderQuestion();
          ExamEngine.renderPalette();
          ExamEngine.renderProgress();
        } else {
          ExamEngine.finishExam(false);
        }
      });

    const prev = $('#btn-prev');
    if (prev)
      prev.addEventListener('click', () => {
        if (ExamEngine.state.idx > 0) {
          store.dispatch({ type: 'SET_INDEX', payload: ExamEngine.state.idx - 1 });
          ExamEngine.renderQuestion();
          ExamEngine.renderPalette();
          ExamEngine.renderProgress();
        }
      });

    // Flag handler is set in renderQuestion() via flagBox.onchange — no duplicate here.

    const submit1 = $('#btn-submit');
    const submit2 = $('#btn-submit-2');
    if (submit1) submit1.addEventListener('click', () => ExamEngine.finishExam(false));
    if (submit2) submit2.addEventListener('click', () => ExamEngine.finishExam(false));

    const cancelExam = $('#btn-cancel-exam');
    if (cancelExam)
      cancelExam.addEventListener('click', () => {
        if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
          store.dispatch({ type: 'CLEAR_TIMER' });

          document.body.classList.remove('no-select');
          if (window.__isProctorMode && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          showView('view-start');
        }
      });

    const review = $('#btn-review');
    if (review)
      review.addEventListener('click', () => {
        if (!ExamEngine.state.reviewEnabled) {
          showToast(
            ExamEngine.state.reviewLockReason ||
              'Finish all questions before the timer ends to unlock review.'
          );
          return;
        }
        ExamEngine.renderReview();
        showView('view-review');
      });

    const back = $('#btn-back-to-result');
    if (back) back.addEventListener('click', () => showView('view-result'));

    const retake = $('#btn-retake');
    const retake2 = $('#btn-retake-2');
    [retake, retake2].forEach(
      (b) =>
        b &&
        b.addEventListener('click', () => {
          ExamEngine.stopTimer();
          store.dispatch({
            type: 'START_EXAM',
            payload: {
              items: [],
              untimed: false,
              isFlashcardMode: false,
              sessionId: '',
              startedAt: 0,
              durationSec: 0,
              endsAt: 0,
              timerHandle: null,
            },
          });
          window.__isProctorMode = false;
          window.__focusLoss = 0;

          document.body.classList.remove('no-select');
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          showView('view-start');
        })
    );

    // keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const running = !$('#view-running').classList.contains('hidden');
      if (!running) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      const it = ExamEngine.state.items[ExamEngine.state.idx];
      if (!it) return;
      const k = e.key;
      if (k >= '1' && k <= '9') {
        const i = parseInt(k, 10) - 1;
        const op = it.options[i];
        if (op) {
          store.dispatch({
            type: 'ANSWER_QUESTION',
            payload: { idx: ExamEngine.state.idx, letter: op.letter },
          });
          ExamEngine.renderQuestion();
          ExamEngine.renderPalette();
          ExamEngine.renderProgress();
        }
        e.preventDefault();
      } else if (k === 'ArrowLeft') {
        if (ExamEngine.state.idx > 0) {
          store.dispatch({ type: 'SET_INDEX', payload: ExamEngine.state.idx - 1 });
          ExamEngine.renderQuestion();
          ExamEngine.renderPalette();
          ExamEngine.renderProgress();
        }
      } else if (k === 'ArrowRight') {
        if (ExamEngine.state.idx < ExamEngine.state.items.length - 1) {
          store.dispatch({ type: 'SET_INDEX', payload: ExamEngine.state.idx + 1 });
          ExamEngine.renderQuestion();
          ExamEngine.renderPalette();
          ExamEngine.renderProgress();
        }
      } else if (k === 'f' || k === 'F') {
        store.dispatch({
          type: 'FLAG_QUESTION',
          payload: { idx: ExamEngine.state.idx, flagged: !it.flagged },
        });
        ($('#flag-box') as HTMLInputElement).checked = !it.flagged;
        ExamEngine.renderPalette();
      }
    });

    // warn on refresh/close during exam
    window.addEventListener('beforeunload', (e) => {
      const running = !$('#view-running').classList.contains('hidden');
      if (running && !ExamEngine.state.finished) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
    // Admin back button (moved from inline onclick)
    const adminBack = $('#btn-admin-back');
    if (adminBack) adminBack.addEventListener('click', () => showView('view-start'));

    // Flashcard end session button (moved from inline onclick)
    const fcEnd = $('#btn-fc-end');
    if (fcEnd)
      fcEnd.addEventListener('click', () => {
        if (window.finishFlashcards) window.finishFlashcards();
      });
  }

  window.wireExam = wire;
  window.showView = showView;
  window.startExam = ExamEngine.startExam;
})();

window.loadQuestions = async function () {
  let localQuestions = [];
  if (encQuestions) {
    try {
      localQuestions = await new Promise((resolve, reject) => {
        const worker = new DecryptionWorker();
        worker.onmessage = (e) => {
          if (e.data.success) {
            resolve(e.data.questions);
          } else {
            reject(new Error(e.data.error));
          }
          worker.terminate();
        };
        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
        };
        worker.postMessage({ encQuestions });
      });
      window.QUESTIONS = localQuestions; // Set it globally too
    } catch (e) {
      console.error('Failed to decode local questions via worker', e);
    }
  }

  if (sbClient) {
    try {
      const { data, error } = await sbClient
        .from('questions')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        window.setQuestions(data);
      } else {
        window.setQuestions(localQuestions);
        // Seed DB if empty and user is admin
        if (new URLSearchParams(window.location.search).get('admin')) {
          for (let q of localQuestions) {
            await sbClient.from('questions').upsert(q);
          }
        }
      }
    } catch (e) {
      console.warn('Supabase questions error, using local', e);
      window.setQuestions(localQuestions);
    }
  } else {
    window.setQuestions(localQuestions);
  }
};

window.loadComments = async function (questionId: string, containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.classList.toggle('hidden');
  if (container.classList.contains('hidden')) return;

  const contentEl = container.querySelector('.comments-content');
  contentEl.innerHTML = 'Loading...';

  if (!sbClient) {
    contentEl.innerHTML = 'Offline mode - comments disabled.';
    return;
  }

  try {
    const { data, error } = await sbClient
      .from('question_comments')
      .select('*')
      .eq('question_id', questionId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (data && data.length > 0) {
      contentEl.innerHTML = data
        .map(
          (c) => `
            <div style="margin-bottom:10px; padding:10px; background:var(--bg); border:1px solid var(--line); border-radius:4px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.8rem; color:var(--ink-soft);">
              <strong>${(c.nickname || 'Anonymous').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])}</strong>
              <span>${new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            <div>${c.comment.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])}</div>
          </div>
        `
        )
        .join('');
    } else {
      contentEl.innerHTML = 'No comments yet. Be the first!';
    }
  } catch (e) {
    contentEl.innerHTML = 'Failed to load comments.';
  }
};

window.postComment = async function (questionId: string, containerId: string) {
  if (!sbClient) return showToast('You are offline.');
  const email = document.getElementById('auth-email')
    ? (document.getElementById('auth-email') as HTMLInputElement).value.trim()
    : '';
  const nickname = document.getElementById('auth-nickname')
    ? (document.getElementById('auth-nickname') as HTMLInputElement).value.trim()
    : '';
  if (!email || !nickname)
    return showToast('Please set an email and nickname on the Start screen to comment.');

  const inputEl = document.getElementById(`comment-input-${questionId}`) as HTMLInputElement;
  if (!inputEl || !inputEl.value.trim()) return;

  try {
    const { error } = await sbClient.from('question_comments').insert({
      question_id: questionId,
      user_email: email,
      nickname: nickname,
      comment: inputEl.value.trim(),
    });
    if (error) throw error;

    inputEl.value = '';
    // Reload comments
    document.getElementById(containerId)?.classList.add('hidden');
    window.loadComments(questionId, containerId).catch(console.error);
  } catch (e) {
    showToast('Failed to post comment: ' + (e instanceof Error ? e.message : String(e)));
  }
};

// ---- Verify user (called before exam starts) ----
window.verifyUser = async function () {
  const email = document.getElementById('auth-email')
    ? (document.getElementById('auth-email') as HTMLInputElement).value.trim()
    : '';
  const pin = document.getElementById('auth-pin')
    ? (document.getElementById('auth-pin') as HTMLInputElement).value.trim()
    : '';
  const nickname = document.getElementById('auth-nickname')
    ? (document.getElementById('auth-nickname') as HTMLInputElement).value.trim()
    : '';

  if (!email && !pin) return true; // guest mode
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please provide a valid email format.');
    return false;
  }
  if (!sbClient) return true; // Supabase offline — allow anyway
  if ((email && !pin) || (!email && pin) || !/^\d{6}$/.test(pin)) {
    showToast('Please provide both a valid email and a 6-digit PIN, or leave both blank.');
    return false;
  }

  const startBtn = document.getElementById('btn-start');
  const practiceBtn = document.getElementById('btn-practice');
  const ogStart = startBtn ? startBtn.innerHTML : '';
  const ogPractice = practiceBtn ? practiceBtn.innerHTML : '';

  if (startBtn) startBtn.innerHTML = 'Verifying...';
  if (practiceBtn) practiceBtn.innerHTML = 'Verifying...';

  try {
    const p_pin_hash = await hashPIN(pin);
    const { data, error } = await sbClient.rpc('verify_mock_user', {
      p_email: email,
      p_pin_hash: p_pin_hash,
      p_nickname: nickname || null,
    });

    if (error) {
      console.error('Verification error:', error);
      showToast('Error connecting to server. Please try again.');
      return false;
    }
    if (data && !data.success) {
      showToast('Authentication failed: ' + data.error);
      return false;
    }

    // If verified, try to load their history for the dashboard
    loadDashboard(email, p_pin_hash);

    return true;
  } catch (e) {
    console.error(e);
    showToast('Something went wrong during verification.');
    return false;
  } finally {
    if (startBtn) startBtn.innerHTML = ogStart;
    if (practiceBtn) practiceBtn.innerHTML = ogPractice;
  }
};

// ---- Submit result ----
window.submitToSupabase = ExamEngine.submitToSupabase;

async function flushSyncQueue() {
  if (!navigator.onLine || !sbClient) return;
  const q = (await syncQueue.get()) as Array<Record<string, unknown>>;
  if (q.length === 0) return;
  console.log(`Flushing ${q.length} offline submissions...`);
  for (const payload of q) {
    const { data, error } = await sbClient.rpc('submit_exam_result', payload);
    // Remove item only if it succeeded or if it returned an explicit error object indicating success
    if (!error && data?.success) {
      await syncQueue.remove(payload.offline_id as string);
    } else {
      console.warn('Failed to flush offline payload', payload, error, data);
    }
  }
  fetchGlobalStats();
}

window.addEventListener('online', flushSyncQueue);
flushSyncQueue().catch(console.error);

const lbSearchInput = document.getElementById('lb-search');
const lbDateStartInput = document.getElementById('lb-date-start');
const lbDateEndInput = document.getElementById('lb-date-end');
if (lbSearchInput) lbSearchInput.addEventListener('input', renderLeaderboard);
if (lbDateStartInput) lbDateStartInput.addEventListener('change', renderLeaderboard);
if (lbDateEndInput) lbDateEndInput.addEventListener('change', renderLeaderboard);

// ---- Dark Mode ----
function initDarkMode() {
  const toggle = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('ccaf-dark-mode');

  // Light theme by default — only apply dark if user explicitly chose it
  if (saved === 'true') {
    document.documentElement.classList.add('dark-mode');
    if (toggle) toggle.textContent = '🌙';
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark-mode');
      toggle.textContent = isDark ? '🌙' : '☀️';
      localStorage.setItem('ccaf-dark-mode', isDark.toString());
      // Add a subtle spin animation
      toggle.style.transform = 'scale(1.1) rotate(360deg)';
      setTimeout(() => (toggle.style.transform = ''), 300);
    });
  }
}

// ---- Auto-load dashboard on email/pin blur ----
function initAuthListeners() {
  const emailEl = document.getElementById('auth-email') as HTMLInputElement;
  const pinEl = document.getElementById('auth-pin') as HTMLInputElement;

  // Auto-login from localStorage (PIN is stored as hash)
  const savedEmail = localStorage.getItem('ccaf-email');
  const savedPinHash = localStorage.getItem('ccaf-pin-hash');
  // Migration: if old plaintext pin exists, hash it and migrate
  const legacyPin = localStorage.getItem('ccaf-pin');
  if (savedEmail && legacyPin && !savedPinHash) {
    hashPIN(legacyPin)
      .then((h) => {
        if (!h) return;
        localStorage.setItem('ccaf-pin-hash', h);
        localStorage.removeItem('ccaf-pin');
        loadDashboard(savedEmail, h).catch(console.error);
      })
      .catch((e) => console.error('PIN migration failed', e));
    if (emailEl) emailEl.value = savedEmail;
    if (pinEl) pinEl.value = legacyPin;
  } else if (savedEmail && savedPinHash && emailEl) {
    emailEl.value = savedEmail;
    // Don't populate pin field with hash — leave it blank (user can re-enter if needed)
    loadDashboard(savedEmail, savedPinHash).catch(console.error);
  }

  if (pinEl) {
    pinEl.addEventListener('blur', async () => {
      const email = emailEl?.value.trim();
      const pin = pinEl.value.trim();
      if (email && /^\d{6}$/.test(pin)) {
        const pinHash = await hashPIN(pin);
        localStorage.setItem('ccaf-email', email);
        localStorage.setItem('ccaf-pin-hash', pinHash);
        localStorage.removeItem('ccaf-pin'); // clean up any legacy
        loadDashboard(email, pinHash).catch(console.error);
      }
    });
  }
}

// Init everything on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.loadQuestions();
  } catch (e) {
    console.error('[CCAF] loadQuestions failed', e);
  }

  // Initialise i18n
  initI18n();
  const langSelector = document.getElementById('lang-selector') as HTMLSelectElement;
  if (langSelector) {
    langSelector.value = localStorage.getItem('lang') || 'en';
    langSelector.addEventListener('change', (e) => {
      setLanguage((e.target as HTMLSelectElement).value);
    });
  }
  if (window.wireExam) window.wireExam();
  fetchGlobalStats().catch(console.error);
  initDarkMode();

  initAuthListeners();
  const fcEngine = new FlashcardEngine();
  fcEngine.initAdminAndFlashcards();
});
