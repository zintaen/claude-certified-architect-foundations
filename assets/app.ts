
import { encQuestions } from './questions';
import { $, esc, richText } from './utils/dom';
import { shuffle, pickProportional, sessionId, fmtTime, generateRadarSVG } from './utils/helpers';
import { store, State } from './core/store';
import { idb, saveProgress, syncQueue } from './services/db';
import { showToast } from './components/toast';
import { telemetry } from './services/telemetry';
import './components/progress';
import { initI18n, setLanguage } from './core/i18n';

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
    startExam?: (opts: any) => void;
    loadComments?: (q: string, c: string) => void;
    postComment?: (q: string, c: string) => void;
  }
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
  const state = new Proxy({} as State, {
    get(_t, prop: keyof State) { return store.getState()[prop]; },
    set() { throw new Error('State must be mutated via store.dispatch()'); }
  });

  // ---- view switching ----
  function showView(id) {
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
      // scroll to exam section on view change
      const sec = document.getElementById('exam');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => updateDOM());
    } else {
      updateDOM();
    }
  }

  function buildSession(opts) {
    const qs = getQuestions();
    const want = Math.max(1, Math.min(qs.length, opts.count | 0));
    const pool = pickProportional(qs, want);
    
    const items = pool.map((q) => ({
      id: q.id,
      group: q.group,
      text: q.text,
      options: shuffle(q.options) as any,
      chosenLetter: null,
      flagged: false,
    }));
    
    const durationSec = opts.untimed ? 0 : Math.max(60, (opts.minutes | 0) * 60);
    const startedAt = Date.now();
    const endsAt = durationSec ? startedAt + durationSec * 1000 : 0;

    store.dispatch({
      type: 'START_EXAM',
      payload: {
        items,
        untimed: !!opts.untimed,
        sessionId: sessionId(),
        startedAt,
        durationSec,
        endsAt,
        timerHandle: null
      }
    });

    window.__focusLoss = 0;
  }

  // ---- render ----
  function renderQuestion() {
    const it = state.items[state.idx];
    if (!it) return;
    $('#q-num').textContent = `Question ${state.idx + 1} of ${state.items.length}`;
    $('#q-text').innerHTML = richText(it.text);

    const host = $('#q-opts');
    host.innerHTML = '';
    host.setAttribute('role', 'radiogroup');
    host.setAttribute('aria-label', 'Answer options');
    it.options.forEach((op, i) => {
      const letter = String.fromCharCode(65 + i); // show as A/B/C/D in current display order
      const row = document.createElement('label');
      row.className = 'opt' + (it.chosenLetter === op.letter ? ' sel' : '');
      row.dataset.letter = op.letter;
      row.setAttribute('role', 'radio');
      row.setAttribute('aria-checked', it.chosenLetter === op.letter ? 'true' : 'false');
      row.innerHTML = `
        <input type="radio" name="opt-${state.idx}" ${it.chosenLetter === op.letter ? 'checked' : ''} />
        <span class="letter">${letter}</span>
        <span class="txt">${richText(op.text)}</span>
      `;
      row.addEventListener('click', (e) => {
        e.preventDefault();
        store.dispatch({ type: 'ANSWER_QUESTION', payload: { idx: state.idx, letter: op.letter } });
        renderQuestion();
        renderPalette();
        renderProgress();
      });
      host.appendChild(row);
    });

    const flagBox = $('#flag-box') as HTMLInputElement;
    flagBox.checked = !!it.flagged;
    flagBox.onchange = (e) => {
      store.dispatch({ type: 'FLAG_QUESTION', payload: { idx: state.idx, flagged: (e.target as HTMLInputElement).checked } });
      renderPalette();
    };
    $('#btn-prev').disabled = state.idx === 0;
    $('#btn-next').textContent = state.idx === state.items.length - 1 ? 'Last →' : 'Next →';
  }

  function renderPalette() {
    const host = $('#palette');
    if (!host) return;
    host.innerHTML = '';
    state.items.forEach((it, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = '';
      if (it.chosenLetter) btn.classList.add('answered');
      if (it.flagged) btn.classList.add('flagged');
      if (i === state.idx) btn.classList.add('current');
      btn.textContent = String(i + 1);
      btn.addEventListener('click', () => {
        store.dispatch({ type: 'SET_INDEX', payload: i });
        renderQuestion();
        renderPalette();
        renderProgress();
      });
      host.appendChild(btn);
    });
    saveProgress(state);
  }

  function renderProgress() {
    const total = state.items.length;
    const done = state.items.filter((x) => x.chosenLetter).length;
        const examProgress = $('#exam-progress');
    if (examProgress) {
      examProgress.setAttribute('total', total.toString());
      examProgress.setAttribute('answered', done.toString());
    }

    const submitBtn1 = document.getElementById('btn-submit');
    const submitBtn2 = document.getElementById('btn-submit-2');

    let btnText = 'Submit';
    let disableSubmit = false;

    if (done < total) {
      btnText = `Answer all ${total} Qs to Submit`;
      disableSubmit = true;
    } else {
      btnText = state.untimed ? 'Finish Practice (Not Saved)' : 'Submit Exam (Will be Saved)';
      disableSubmit = false;
    }

    if (submitBtn1) {
      submitBtn1.textContent = btnText;
      (submitBtn1 as HTMLButtonElement).disabled = disableSubmit;
    }
    if (submitBtn2) {
      submitBtn2.textContent = btnText;
      (submitBtn2 as HTMLButtonElement).disabled = disableSubmit;
    }
  }

  // ---- timer ----
  function tickTimer() {
    const el = $('#timer');
    if (!el) return;
    if (state.untimed) {
      el.textContent = '∞  untimed';
      el.classList.remove('warn', 'danger');
      return;
    }
    const left = Math.max(0, Math.floor((state.endsAt - Date.now()) / 1000));
    el.textContent = fmtTime(left);
    el.classList.toggle('warn', left <= 600 && left > 60);
    el.classList.toggle('danger', left <= 60);
    if (left <= 0) {
      store.dispatch({ 
        type: 'END_EXAM', 
        payload: { 
          timedOut: true, 
          focusLoss: state.focusLoss,
          reviewEnabled: false,
          reviewLockReason: 'The 120-minute timer ran out before you could submit. Retake the exam and finish before time expires to unlock explanations.'
        } 
      });
      finishExam(true);
    }
  }
  function startTimer() {
    stopTimer();
    tickTimer();
    store.dispatch({ type: 'RESUME_EXAM', payload: { timerHandle: window.setInterval(tickTimer, 500) } as Partial<State> });
  }
  function stopTimer() {
    store.dispatch({ type: 'CLEAR_TIMER' });
  }

  // ---- start ----
  function startExam(opts) {
    window.__isProctorMode = !opts.untimed;

    if (window.__isProctorMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed', err);
        });
      }
    }

    window.finishExamForProctor = () => finishExam(true);

    buildSession(opts);

    const sidEl = document.getElementById('session-id');
    if (sidEl) sidEl.textContent = state.sessionId;
    showView('view-running');
    renderQuestion();
    renderPalette();
    renderProgress();
    document.body.classList.add('no-select');
    
    telemetry.onViolation = () => finishExam(true);
    telemetry.start(window.__isProctorMode);

    startTimer();
  }

  // Proctor mode fullscreen change listener
  document.addEventListener('fullscreenchange', () => {
    if (
      window.__isProctorMode &&
      !document.fullscreenElement &&
      !state.finished
    ) {
      showToast('Proctor Mode Violation: You exited fullscreen. Your exam is terminated.');
      finishExam(true);
    }
  });

  // ---- finish & score ----
  function finishExam(force) {
    if (state.finished) return;
    if (!force) {
      const unanswered = state.items.filter((x) => !x.chosenLetter).length;
      if (unanswered > 0) {
        showToast(`You must answer all ${state.items.length} questions before submitting.`);
        return;
      }
      if (!window.confirm(`Submit now? You'll see your score and review.`)) return;
    }

    telemetry.stop();
    stopTimer();

    document.body.classList.remove('no-select');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    const total = state.items.length;
    let correct = 0,
      incorrect = 0,
      skipped = 0;
    state.items.forEach((it) => {
      if (!it.chosenLetter) {
        skipped++;
        return;
      }
      const chosen = it.options.find((o) => o.letter === it.chosenLetter);
      if (chosen && chosen.correct) correct++;
      else incorrect++;
    });
    const score1000 = Math.round((correct / total) * 1000);
    const passed = score1000 >= 700;
    const pct = Math.round((correct / total) * 100);
    const usedSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));

    // Review gate: unlocked only if every question was answered AND the timer
    // didn't expire. Untimed mode still requires full completion.
    const allAnswered = skipped === 0;
    
    let reviewEnabled = true;
    let reviewLockReason = '';
    
    if (!allAnswered) {
      reviewEnabled = false;
      reviewLockReason = `You left ${skipped} question${skipped === 1 ? '' : 's'} unanswered. Finish all 60 questions to unlock explanations.`;
    } else if (!state.untimed && state.timedOut) {
      reviewEnabled = false;
      reviewLockReason =
        'The 120-minute timer ran out before you could submit. Retake the exam and finish before time expires to unlock explanations.';
    }

    store.dispatch({
      type: 'END_EXAM',
      payload: {
        timedOut: state.timedOut,
        focusLoss: telemetry.getFocusLosses(),
        reviewEnabled,
        reviewLockReason
      }
    });

    // theme the whole card based on pass/fail
    const card = $('#result-card');
    if (card) {
      card.classList.toggle('is-pass', passed);
      card.classList.toggle('is-fail', !passed);
    }

    // animate ring (r=96 now → C = 2π·96 ≈ 603.19)
    const ring = $('#ring-fg');
    const circumference = 2 * Math.PI * 96;
    const offset = circumference * (1 - score1000 / 1000);
    if (ring) {
      ring.setAttribute('stroke-dasharray', circumference.toFixed(2));
      ring.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.22,.9,.32,1)';
      ring.setAttribute('stroke-dashoffset', circumference.toFixed(2));
      ring.setAttribute('stroke', passed ? 'url(#ringGradPass)' : 'url(#ringGrad)');
      requestAnimationFrame(() => {
        ring.setAttribute('stroke-dashoffset', offset.toFixed(2));
      });
    }

    // fill numbers — count-up animation
    const valEl = $('#score-val');
    if (valEl) {
      const target = score1000;
      const started = performance.now();
      const dur = 1100;
      function step(t) {
        const k = Math.min(1, (t - started) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        valEl.textContent = Math.round(target * eased);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    const pctEl = $('#score-pct');
    if (pctEl) pctEl.textContent = `${pct}% correct`;

    $('#r-correct').textContent = correct;
    $('#r-incorrect').textContent = incorrect;
    $('#r-skipped').textContent = skipped;
    $('#r-time').textContent = fmtTime(usedSec);

    const tag = $('#pass-tag');
    if (tag) {
      tag.textContent = passed ? '✓ PASS (mock threshold)' : '✗ BELOW THRESHOLD';
      tag.classList.toggle('pass', passed);
      tag.classList.toggle('fail', !passed);
    }
    $('#result-session').textContent = state.sessionId;

    // Outcome-specific headline
    const headEl = $('#result-head');
    if (headEl) {
      if (passed) {
        headEl.textContent = 'Nice — you cleared the bar 🎉';
      } else if (score1000 >= 600) {
        headEl.textContent = "So close — one more pass and you'll nail it";
      } else {
        headEl.textContent = "Keep going — here's where to tighten up";
      }
    }

    const sum = $('#result-summary');
    if (sum) {
      const focusNote = state.focusLoss
        ? ` You switched tabs ${state.focusLoss} time${state.focusLoss === 1 ? '' : 's'} during the session — the real proctor would have flagged that.`
        : '';
      const timeNote = state.timedOut ? ' The timer expired before submission.' : '';
      sum.textContent = `You answered ${correct} of ${total} correctly (${pct}%). On the 1,000-point scale that's ${score1000}. This mock uses 700 as a working pass benchmark; Anthropic doesn't publish the official cut score.${timeNote}${focusNote}`;
    }

    // Submit to Supabase
    if (window.submitToSupabase) {
      // gather incorrect indexes
      const wrongIdxs = [];
      let totalAnswered = 0;
      state.items.forEach((it, idx) => {
        if (it.chosenLetter) totalAnswered++;
        const chosen = it.options.find((o) => o.letter === it.chosenLetter);
        if (!chosen || !chosen.correct) {
          wrongIdxs.push(idx + 1); // 1-based index
        }
      });
      // Guard: Only submit if they answered at least one question AND it's a full 60-question timed exam
      if (totalAnswered > 0 && !state.untimed && state.items.length === 60) {
        window.submitToSupabase(score1000, wrongIdxs, usedSec);
      } else {
        console.warn(
          'Exam was practice/partial or abandoned. Skipped saving to Supabase to prevent data pollution.'
        );
      }
    }

    // Domain breakdown
    const domainNames = {
      research_pipeline: 'Research Pipeline',
      code_exploration: 'Code Exploration',
      customer_support: 'Customer Support',
      extraction_pipeline: 'Extraction Pipeline',
    };
    const domainStats = {};
    state.items.forEach((it) => {
      const g = it.group || 'misc';
      if (!domainStats[g]) domainStats[g] = { total: 0, correct: 0 };
      domainStats[g].total++;
      const chosen = it.options.find((o) => o.letter === it.chosenLetter);
      if (chosen && chosen.correct) domainStats[g].correct++;
    });

    // Save to localStorage so dashboard and Targeted Practice can use it
    localStorage.setItem('ccaf-last-domain-stats', JSON.stringify(domainStats));

    const dbEl = document.getElementById('domain-breakdown');
    if (dbEl) {
      const domainNames = {
        research_pipeline: 'Research Pipeline',
        code_exploration: 'Code Exploration',
        customer_support: 'Customer Support',
        extraction_pipeline: 'Extraction Pipeline',
        misc: 'Miscellaneous'
      };
      const radarHtml = generateRadarSVG(domainStats, domainNames);
      
      let html = '<div class="domain-breakdown" style="display:flex; flex-direction:column; align-items:center;">';
      html += '<h4>📊 Performance Radar</h4>';
      html += radarHtml;
      html += '</div>';
      
      dbEl.innerHTML = html;
    }

    // Review gate UI
    const gate = $('#review-gate');
    const gateIcon = $('#review-gate-icon');
    const gateTitle = $('#review-gate-title');
    const gateMsg = $('#review-gate-msg');
    const reviewBtn = $('#btn-review');
    if (gate && gateIcon && gateTitle && gateMsg && reviewBtn) {
      if (state.reviewEnabled) {
        gate.classList.add('unlocked');
        gate.classList.remove('locked');
        gateIcon.textContent = '🔓';
        gateTitle.textContent = 'Explanations unlocked';
        gateMsg.textContent =
          'Every option — correct and incorrect — has a full explanation in review mode.';
        reviewBtn.disabled = false;
      } else {
        gate.classList.add('locked');
        gate.classList.remove('unlocked');
        gateIcon.textContent = '🔒';
        gateTitle.textContent = 'Review is locked';
        gateMsg.textContent = state.reviewLockReason;
        reviewBtn.disabled = true;
      }
    }

    // ---- Confetti on pass ----
    if (passed) {
      const cc = document.getElementById('confetti-container');
      if (cc) {
        cc.classList.remove('hidden');
        cc.innerHTML = '';
        const colors = [
          '#F4BA17',
          '#E87726',
          '#45210E',
          '#6BAF3D',
          '#D06040',
          '#4AA8D8',
          '#E45D5D',
          '#9B59B6',
        ];
        for (let p = 0; p < 80; p++) {
          const piece = document.createElement('div');
          piece.className = 'confetti-piece';
          piece.style.left = Math.random() * 100 + '%';
          piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          piece.style.animationDelay = Math.random() * 2 + 's';
          piece.style.animationDuration = 2 + Math.random() * 2 + 's';
          piece.style.width = 6 + Math.random() * 8 + 'px';
          piece.style.height = 4 + Math.random() * 6 + 'px';
          piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
          cc.appendChild(piece);
        }
        setTimeout(() => {
          cc.classList.add('hidden');
          cc.innerHTML = '';
        }, 4500);
      }
    }

    // ---- Share buttons ----
    const shareBtn = document.getElementById('btn-share');
    const shareMenu = document.getElementById('share-menu');
    if (shareBtn && shareMenu) {
      shareMenu.classList.add('hidden'); // reset on each finish
      const shareText = `${passed ? '✅ Passed' : '📊 Scored'} ${score1000}/1000 on the Claude Certified Architect mock exam! ${passed ? '🎉' : 'Still learning!'}\n\nTry it free → https://ccaf.cyberskill.dev`;
      // Use .onclick to prevent stacking listeners on retakes (B6 fix)
      shareBtn.onclick = () => shareMenu.classList.toggle('hidden');
      const copyBtn = document.getElementById('share-copy');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard
            .writeText(shareText)
            .then(() => {
              const og = copyBtn.textContent;
              copyBtn.textContent = '✓ Copied!';
              setTimeout(() => (copyBtn.textContent = og), 2000);
            })
            .catch(() => {
              showToast('Copy failed. Please copy manually.');
            });
        };
      }
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://ccaf.cyberskill.dev')}`;
      const twEl = document.getElementById('share-twitter') as HTMLAnchorElement;
      const liEl = document.getElementById('share-linkedin') as HTMLAnchorElement;
      if (twEl) twEl.href = twUrl;
      if (liEl) liEl.href = liUrl;
    }

    showView('view-result');
  }

  // ---- review ----
  function renderReview() {
    const host = $('#review-list');
    if (!host) return;
    host.innerHTML = '';
    state.items.forEach((it, i) => {
      const chosen = it.chosenLetter;
      const correctOpt = it.options.find((o) => (o as any).correct);
      const wasCorrect = chosen && correctOpt && chosen === correctOpt.letter;

      const card = document.createElement('div');
      card.className = 'review-item';

      const head = document.createElement('div');
      head.className = 'review-head';
      head.innerHTML = `
        <div><strong>Question ${i + 1}</strong> <span class="pill mono">${esc(it.id)}</span></div>
        <div>${
          !chosen
            ? '<span class="pill pill-skip">Skipped</span>'
            : wasCorrect
              ? '<span class="pill pill-correct">Correct</span>'
              : '<span class="pill pill-wrong">Incorrect</span>'
        }</div>
      `;
      card.appendChild(head);

      const qt = document.createElement('div');
      qt.className = 'review-q';
      qt.innerHTML = richText(it.text);
      card.appendChild(qt);

      it.options.forEach((op, j) => {
        const letter = String.fromCharCode(65 + j);
        const row = document.createElement('div');
        row.className = 'r-opt';
        if (op.correct) row.classList.add('is-correct');
        if (chosen === op.letter && !op.correct) row.classList.add('is-wrong');
        if (chosen === op.letter) row.classList.add('is-chosen');
        row.innerHTML = `
          <div class="r-line">
            <span class="letter">${letter}</span>
            <span class="r-text">${richText(op.text)}</span>
            ${op.correct ? '<span class="tag good">Correct answer</span>' : ''}
            ${chosen === op.letter && !op.correct ? '<span class="tag bad">Your pick</span>' : ''}
            ${chosen === op.letter && op.correct ? '<span class="tag good">Your pick</span>' : ''}
          </div>
          <div class="why">${richText(op.explain)}</div>
        `;
        card.appendChild(row);
      });

      // Community Comments section
      const commBox = document.createElement('div');
      commBox.className = 'comments-section';
      commBox.style.marginTop = '20px';
      commBox.style.padding = '15px';
      commBox.style.background = 'var(--bg-2)';
      commBox.style.borderRadius = '8px';
      commBox.style.border = '1px solid var(--line)';

      commBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:1rem;">Community Comments</h4>
          <button class="btn ghost small" onclick="loadComments('${it.id}', 'comments-${it.id}')">Load / Add Comments</button>
        </div>
        <div id="comments-${it.id}" class="comments-list hidden">
          <div class="comments-content" style="margin-bottom:15px; font-size:0.9rem;"></div>
          <div style="display:flex; gap:10px;">
            <input type="text" id="comment-input-${it.id}" placeholder="Add a comment..." style="flex:1; padding:8px; border:1px solid var(--line); border-radius:4px; background:var(--bg); color:var(--ink);" />
            <button class="btn primary small" onclick="postComment('${it.id}', 'comments-${it.id}')">Post</button>
          </div>
        </div>
      `;
      card.appendChild(commBox);

      host.appendChild(card);
    });
  }

  // ---- wire up ----
  function readOpts() {
    return {
      count: parseInt($('#opt-count').value, 10) || 60,
      minutes: parseInt($('#opt-minutes').value, 10) || 120,
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
          if (window.verifyUser) { const v: any = await window.verifyUser(); if (!v) return; }
          (window as any).startExam(readOpts());
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
          if (window.verifyUser) { const v: any = await window.verifyUser(); if (!v) return; }
          const o = readOpts();
          o.untimed = true;
          (window as any).startExam(o);
        } finally {
          starting = false;
        }
      });

    const next = $('#btn-next');
    if (next)
      next.addEventListener('click', () => {
        if (state.idx < state.items.length - 1) {
          state.idx++;
          renderQuestion();
          renderPalette();
          renderProgress();
        } else {
          finishExam(false);
        }
      });

    const prev = $('#btn-prev');
    if (prev)
      prev.addEventListener('click', () => {
        if (state.idx > 0) {
          state.idx--;
          renderQuestion();
          renderPalette();
          renderProgress();
        }
      });

    const flag = $('#flag-box');
    if (flag)
      flag.addEventListener('change', () => {
        const it = state.items[state.idx];
        if (!it) return;
        it.flagged = flag.checked;
        renderPalette();
      });

    const submit1 = $('#btn-submit');
    const submit2 = $('#btn-submit-2');
    if (submit1) submit1.addEventListener('click', () => finishExam(false));
    if (submit2) submit2.addEventListener('click', () => finishExam(false));

    const cancelExam = $('#btn-cancel-exam');
    if (cancelExam)
      cancelExam.addEventListener('click', () => {
        if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
          if (state.timerHandle) {
            clearInterval(state.timerHandle);
            state.timerHandle = null;
          }

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
        if (!state.reviewEnabled) {
          showToast(
            state.reviewLockReason || 'Finish all questions before the timer ends to unlock review.'
          );
          return;
        }
        renderReview();
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
          stopTimer();
          state.finished = false;
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
      const it = state.items[state.idx];
      if (!it) return;
      const k = e.key;
      if (k >= '1' && k <= '9') {
        const i = parseInt(k, 10) - 1;
        const op = it.options[i];
        if (op) {
          it.chosenLetter = op.letter;
          renderQuestion();
          renderPalette();
          renderProgress();
        }
        e.preventDefault();
      } else if (k === 'ArrowLeft') {
        if (state.idx > 0) {
          state.idx--;
          renderQuestion();
          renderPalette();
          renderProgress();
        }
      } else if (k === 'ArrowRight') {
        if (state.idx < state.items.length - 1) {
          state.idx++;
          renderQuestion();
          renderPalette();
          renderProgress();
        }
      } else if (k === 'f' || k === 'F') {
        it.flagged = !it.flagged;
        $('#flag-box').checked = it.flagged;
        renderPalette();
      }
    });

    // warn on refresh/close during exam
    window.addEventListener('beforeunload', (e) => {
      const running = !$('#view-running').classList.contains('hidden');
      if (running && !state.finished) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  window.wireExam = wire;
  window.showView = showView;
  window.startExam = startExam;
})();

(function () {
  const SUPABASE_URL = 'https://idtmcfqcgvecrivvtsxv.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdG1jZnFjZ3ZlY3JpdnZ0c3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjYwNjAsImV4cCI6MjA5NTM0MjA2MH0.SBB3j0xIjJt4hp9PzD0tX4VOd2vY5gIu6BddspVVFn4';
  let sbClient = null;
  if ((window as any).supabase) {
    sbClient = (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sbClient = sbClient;
  } else {
    console.warn('Supabase SDK not loaded — online features disabled.');
  }

  window.loadQuestions = async function () {
    let localQuestions = [];
    if (encQuestions) {
      try {
        const b64 = encQuestions;
        const decoded = decodeURIComponent(escape(atob(b64)));
        localQuestions = JSON.parse(decoded);
        window.QUESTIONS = localQuestions; // Set it globally too
      } catch (e) {
        console.error('Failed to decode local questions', e);
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
      document.getElementById(containerId).classList.add('hidden');
      window.loadComments(questionId, containerId);
    } catch (e) {
      showToast('Failed to post comment: ' + e.message);
    }
  };

  async function hashPIN(pin) {
    if (!pin) return null;
    if (!/^\d{6}$/.test(pin)) return null;
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

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
  window.submitToSupabase = async function (score, wrongAnswers, timeTaken) {
    const email = document.getElementById('auth-email')
      ? (document.getElementById('auth-email') as HTMLInputElement).value.trim()
      : '';
    const pin = document.getElementById('auth-pin')
      ? (document.getElementById('auth-pin') as HTMLInputElement).value.trim()
      : '';
    const nickname = document.getElementById('auth-nickname')
      ? (document.getElementById('auth-nickname') as HTMLInputElement).value.trim()
      : '';

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn('Invalid email format. Skipping submission.');
      return;
    }

    if (!sbClient) return; // Supabase offline
    let p_email = null;
    let p_pin_hash = null;
    let p_nickname = nickname || null;

    if (email && pin) {
      p_email = email;
      p_pin_hash = await hashPIN(pin);
    }

    try {
      const payload = {
        p_email: p_email,
        p_pin_hash: p_pin_hash,
        p_score: score,
        p_wrong_answers: wrongAnswers,
        p_time_taken: timeTaken,
        p_nickname: p_nickname,
      };
      
      if (!navigator.onLine) {
        console.warn('Offline. Queuing submission for later.');
        await syncQueue.add(payload);
        return;
      }
      
      const { data, error } = await sbClient.rpc('submit_exam_result', payload);
      if (error) {
        console.error('Error submitting result:', error);
        await syncQueue.add(payload);
      } else if (data && !data.success) {
        showToast('Failed to save score: ' + data.error);
      } else {
        // success
        setTimeout(fetchGlobalStats, 2000);
      }
    } catch (e) {
      console.error('Supabase exception:', e);
    }
  };

  async function flushSyncQueue() {
    if (!navigator.onLine || !sbClient) return;
    const q = await syncQueue.get();
    if (q.length === 0) return;
    console.log(`Flushing ${q.length} offline submissions...`);
    const remaining = [];
    for (const payload of q) {
      const { error } = await sbClient.rpc('submit_exam_result', payload);
      if (error) remaining.push(payload);
    }
    if (remaining.length === 0) {
      await syncQueue.clear();
      fetchGlobalStats();
    } else {
      await idb.set('exam_sync_queue', remaining);
    }
  }

  window.addEventListener('online', flushSyncQueue);
  flushSyncQueue();

  // ---- Fetch global stats + leaderboard ----
  async function fetchGlobalStats() {
    if (!sbClient) return; // Supabase offline
    try {
      // Add 8s timeout to avoid infinite "Loading..." state (B25)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const { data, error } = await sbClient.rpc(
        'get_global_stats',
        {},
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (error) {
        console.error('Error fetching global stats:', error);
        showStatsError();
        return;
      }

      if (data) {
        const elTotal = document.getElementById('stat-total-exams');
        if (elTotal) elTotal.textContent = data.total_exams || 0;
        const elAvg = document.getElementById('stat-avg-score');
        if (elAvg) elAvg.textContent = data.avg_score || 0;
        const elPass = document.getElementById('stat-pass-rate');
        if (elPass) elPass.textContent = (data.pass_rate || 0) + '%';

        const hardestEl = document.getElementById('stat-hardest');
        if (data.hardest_questions && data.hardest_questions.length > 0) {
          hardestEl.innerHTML = '';
          data.hardest_questions.forEach((q) => {
            const div = document.createElement('div');
            div.className = 'hard-q-item';
            const span1 = document.createElement('span');
            span1.textContent = 'Question ' + q.index;
            const span2 = document.createElement('span');
            span2.textContent = q.misses + ' misses';
            div.appendChild(span1);
            div.appendChild(span2);
            hardestEl.appendChild(div);
          });
        } else {
          hardestEl.textContent = 'Not enough data';
        }

        // Leaderboard
        const lbBody = document.getElementById('leaderboard-body');
        const lbCount = document.getElementById('lb-count');
        if (lbBody && data.leaderboard && data.leaderboard.length > 0) {
          lbBody.innerHTML = '';
          data.leaderboard.forEach((entry, i) => {
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
            const passed = entry.score >= 700;
            const tr = document.createElement('tr');

            const tdRank = document.createElement('td');
            tdRank.className = 'lb-rank ' + rankClass;
            tdRank.textContent = medal;

            const tdName = document.createElement('td');
            tdName.textContent = entry.nickname || 'Anonymous';

            const tdStatus = document.createElement('td');
            tdStatus.className = 'lb-status';
            const badge = document.createElement('span');
            badge.className = 'lb-badge ' + (passed ? 'pass' : 'fail');
            badge.textContent = passed ? 'PASS' : 'FAIL';
            tdStatus.appendChild(badge);

            const tdDate = document.createElement('td');
            tdDate.className = 'lb-date';
            if (entry.taken_at) {
              const d = new Date(entry.taken_at);
              tdDate.textContent = d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            } else {
              tdDate.textContent = '—';
            }

            const tdScore = document.createElement('td');
            tdScore.className = 'lb-score';
            tdScore.textContent = entry.score + ' / 1000';

            tr.appendChild(tdRank);
            tr.appendChild(tdName);
            tr.appendChild(tdStatus);
            tr.appendChild(tdDate);
            tr.appendChild(tdScore);
            lbBody.appendChild(tr);
          });
          if (lbCount) {
            lbCount.textContent =
              data.leaderboard.length +
              ' practitioner' +
              (data.leaderboard.length === 1 ? '' : 's') +
              ' on the board';
          }
        } else if (lbBody) {
          lbBody.innerHTML =
            '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No scores yet. Be the first!</td></tr>';
        }
      }
    } catch (e) {
      console.error('Fetch stats exception:', e);
      showStatsError();
    }
  }

  function showStatsError() {
    const errMsg = 'Unavailable';
    const el = (id) => document.getElementById(id);
    if (
      el('stat-total-exams')?.textContent === '-' ||
      el('stat-total-exams')?.textContent === 'Loading...'
    ) {
      ['stat-total-exams', 'stat-avg-score', 'stat-pass-rate'].forEach((id) => {
        const e = el(id);
        if (e) e.textContent = errMsg;
      });
      const h = el('stat-hardest');
      if (h) h.textContent = errMsg;
    }
    const lb = el('leaderboard-body');
    if (lb && lb.querySelector('td')?.textContent?.includes('Loading')) {
      lb.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Stats unavailable — try refreshing later.</td></tr>';
    }
  }

  // ---- Personal Dashboard ----
  async function loadDashboard(email, pinHash) {
    if (!sbClient) return; // Supabase offline
    try {
      const { data, error } = await sbClient.rpc('get_user_history', {
        p_email: email,
        p_pin_hash: pinHash,
      });
      if (error || !data || !data.success) return;

      const results = data.results || [];

      const authForm = document.querySelector('.auth-form');
      const authMsg = document.querySelector('.auth-box p');
      const authHeader = document.querySelector('.auth-box h4');
      if (authForm && authMsg && authHeader && email) {
        authForm.classList.add('hidden');
        authHeader.textContent = '✅ Logged In';
        authMsg.textContent = `Authenticated as ${email}. Your progress is being synced.`;
      }

      if (results.length === 0) return;

      const container = document.getElementById('dashboard-container');
      if (!container) return;

      container.classList.remove('hidden');
      let html = '<div class="dashboard-box"><h4>👋 Welcome Back!</h4>';
      html += `<p class="sub">You've taken ${results.length} exam${results.length === 1 ? '' : 's'} so far. Here's your history:</p>`;

      const lastStatsStr = localStorage.getItem('ccaf-last-domain-stats');
      if (lastStatsStr) {
        try {
          const domainStats = JSON.parse(lastStatsStr);
          const domainNames = {
            research_pipeline: 'Research Pipeline',
            code_exploration: 'Code Exploration',
            customer_support: 'Customer Support',
            extraction_pipeline: 'Extraction Pipeline',
            misc: 'Miscellaneous'
          };
          const radarHtml = generateRadarSVG(domainStats, domainNames);
          html +=
            '<div class="domain-breakdown" style="margin: 15px 0 25px 0; display:flex; flex-direction:column; align-items:center;"><h5>📊 Your Last Attempt</h5>' + radarHtml + '</div>';
        } catch (e) {}
      }

      html += '<div class="history-list">';
      results.slice(0, 5).forEach((r) => {
        const d = new Date(r.taken_at);
        const dateStr = d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = r.time_taken
          ? `${Math.floor(r.time_taken / 60)}m ${r.time_taken % 60}s`
          : '-';
        const passClass = r.score >= 700 ? 'pass' : 'fail';
        html += `<div class="history-item">
          <div><div class="history-score ${passClass}">${r.score} / 1000</div><div class="history-meta">${dateStr} · ${timeStr}</div></div>
          <div class="history-score ${passClass}">${r.score >= 700 ? '✓ Pass' : '✗ Fail'}</div>
        </div>`;
      });
      html += '</div></div>';
      container.innerHTML = html;
    } catch (e) {
      console.error('Dashboard error:', e);
    }
  }

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
      hashPIN(legacyPin).then((h) => {
        localStorage.setItem('ccaf-pin-hash', h);
        localStorage.removeItem('ccaf-pin');
        loadDashboard(savedEmail, h);
      });
      if (emailEl) emailEl.value = savedEmail;
      if (pinEl) pinEl.value = legacyPin;
    } else if (savedEmail && savedPinHash && emailEl) {
      emailEl.value = savedEmail;
      // Don't populate pin field with hash — leave it blank (user can re-enter if needed)
      loadDashboard(savedEmail, savedPinHash);
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
          loadDashboard(email, pinHash);
        }
      });
    }
  }

  function initAdminAndFlashcards() {
    const qs = window.QUESTIONS || [];

    // ---- 1. Targeted Practice ----
    const btnTargeted = document.getElementById('btn-targeted');
    if (btnTargeted) {
      btnTargeted.addEventListener('click', () => {
        const lastStatsStr = localStorage.getItem('ccaf-last-domain-stats');
        if (!lastStatsStr) {
          showToast('Please complete at least one mock exam to unlock Targeted Practice.');
          return;
        }

        let domainStats = {};
        try {
          domainStats = JSON.parse(lastStatsStr);
        } catch (e) {}

        let weakestGroup = null;
        let lowestPct = 100;

        Object.entries(domainStats).forEach(([key, val]) => {
          const pct = (val as any).total ? Math.round((100 * (val as any).correct) / (val as any).total) : 0;
          if (pct < lowestPct) {
            lowestPct = pct;
            weakestGroup = key;
          }
        });

        let pool = qs;
        if (weakestGroup) {
          pool = qs.filter((q) => q.group === weakestGroup);
          if (pool.length === 0) pool = qs; // fallback
        }

        // We override the local QUESTIONS array just for this session
        const originalQs = window.QUESTIONS;
        window.setQuestions(pool);

        const o = {
          count: 10,
          minutes: 0,
          shuffleOptions: true,
          review: true,
          untimed: true,
        };

        const execute = () => {
          (window as any).startExam(o);
          // Restore immediately after starting so subsequent logic uses original pool
          window.setQuestions(originalQs);
        };

        if (window.verifyUser) {
          window.verifyUser().then((valid) => {
            if (valid) execute();
            else window.setQuestions(originalQs);
          });
        } else {
          execute();
        }
      });
    }

    // ---- 2. Flashcard Mode (Leitner System) ----
    let fcIndex = 0;
    let fcPool = [];
    const btnFlashcard = document.getElementById('btn-flashcard');

    // Load Leitner from localStorage into store on startup
    try {
      const savedLeitner = localStorage.getItem('ccaf-leitner');
      if (savedLeitner) {
        store.dispatch({ type: 'SET_LEITNER_DATA', payload: JSON.parse(savedLeitner) });
      }
    } catch (e) {}

    // Update the UI counter for "due today"
    function updateDueCount() {
      const leitner = store.getState().leitner;
      const now = Date.now();
      const dueCount = qs.filter(q => {
        const data = leitner[q.id];
        return !data || data.nextReview <= now;
      }).length;
      
      const badge = document.getElementById('fc-due-count');
      if (badge) badge.textContent = dueCount > 0 ? `(${dueCount} Due)` : '(Caught Up!)';
      return dueCount;
    }
    
    // Initial call
    updateDueCount();

    window.finishFlashcards = function () {
      localStorage.removeItem('ccaf-fc-pool');
      localStorage.removeItem('ccaf-fc-index');
      const viewCard = document.getElementById('view-flashcard');
      if (viewCard) viewCard.classList.add('hidden');
      document.getElementById('view-start').classList.remove('hidden');
      updateDueCount();
    };

    if (btnFlashcard) {
      btnFlashcard.addEventListener('click', () => {
        const savedPool = localStorage.getItem('ccaf-fc-pool');
        const savedIndex = localStorage.getItem('ccaf-fc-index');
        
        if (savedPool) {
          try {
            const ids = JSON.parse(savedPool);
            fcPool = ids.map((id) => qs.find((q) => q.id === id)).filter(Boolean);
            fcIndex = parseInt(savedIndex, 10) || 0;
            if (fcIndex >= fcPool.length) {
              fcIndex = 0;
              fcPool = [];
            }
          } catch (e) {
            fcPool = [];
          }
        }
        
        if (fcPool.length === 0) {
          // Generate new pool of Due cards
          const leitner = store.getState().leitner;
          const now = Date.now();
          fcPool = qs.filter(q => {
            const data = leitner[q.id];
            return !data || data.nextReview <= now;
          }).sort(() => Math.random() - 0.5);
          fcIndex = 0;
        }

        if (fcPool.length === 0) {
          return showToast('You are caught up! No cards due for review.');
        }

        localStorage.setItem('ccaf-fc-pool', JSON.stringify(fcPool.map((q) => q.id)));
        localStorage.setItem('ccaf-fc-index', String(fcIndex));

        document.getElementById('view-start').classList.add('hidden');
        document.getElementById('view-flashcard').classList.remove('hidden');
        renderFlashcard();
      });
    }

    function renderFlashcard() {
      const q = fcPool[fcIndex];
      const card = document.getElementById('fc-card');
      const prog = document.getElementById('fc-progress');
      if (prog) {
        prog.setAttribute('total', fcPool.length.toString());
        prog.setAttribute('answered', fcIndex.toString());
      }

      let html = `<div class="review-item" style="border:none; padding:0; box-shadow:none; margin:0; background:transparent;">`;
      html += `<div class="review-q" style="margin-bottom:20px;">${richText(q.text)}</div>`;
      q.options.forEach((op, i) => {
        const letter = String.fromCharCode(65 + i);
        html += `
          <div class="r-opt" id="fc-opt-${i}" style="transition: opacity 0.2s; cursor: pointer;">
            <div class="r-line">
              <span class="letter">${letter}</span>
              <span class="r-text">${richText(op.text)}</span>
            </div>
            <div class="why hidden" id="fc-why-${i}">${richText(op.explain)}</div>
          </div>
        `;
      });
      html += '</div>';
      card.innerHTML = html;

      const btnNext = document.getElementById('fc-btn-next');
      if (btnNext) btnNext.classList.add('hidden');
      document.getElementById('fc-actions').classList.remove('hidden');

      // Bind click listeners
      let answered = false;
      q.options.forEach((op, i) => {
        const optDiv = document.getElementById(`fc-opt-${i}`);
        if (optDiv) {
          optDiv.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            
            // Dispatch Leitner Box update
            const letter = String.fromCharCode(65 + i);
            store.dispatch({
              type: 'PROCESS_FLASHCARD_ANSWER',
              payload: { idx: window.QUESTIONS.findIndex(x => x.id === q.id), letter, isCorrect: op.correct }
            });
            
            // Persist to local storage
            localStorage.setItem('ccaf-leitner', JSON.stringify(store.getState().leitner));

            // Instant Feedback Visuals
            q.options.forEach((innerOp, j) => {
              const innerOptDiv = document.getElementById(`fc-opt-${j}`);
              const whyDiv = document.getElementById(`fc-why-${j}`);
              if (innerOp.correct) {
                innerOptDiv.classList.add('is-correct');
              } else if (i === j) {
                innerOptDiv.classList.add('is-wrong');
              } else {
                innerOptDiv.style.opacity = '0.5';
              }
              whyDiv.classList.remove('hidden');
            });
            
            // Show Next Card button
            if (btnNext) {
              btnNext.classList.remove('hidden');
            }
          });
        }
      });
    }

    const btnNext = document.getElementById('fc-btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        fcIndex++;
        localStorage.setItem('ccaf-fc-index', String(fcIndex));
        if (fcIndex >= fcPool.length) {
          showToast("You've finished all flashcards for today!");
          window.finishFlashcards();
        } else {
          renderFlashcard();
        }
      });
    }

    // ---- 3. Admin Editor ----
    if (new URLSearchParams(window.location.search).get('admin')) {
      document.getElementById('view-start').classList.add('hidden');
      document.getElementById('view-admin').classList.remove('hidden');
      import('./admin/admin').then((m) => m.initAdmin(qs)).catch(console.error);
    }
  }

  // Init everything on DOM ready
  document.addEventListener('DOMContentLoaded', async () => {
    await window.loadQuestions();
    
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
    fetchGlobalStats();
    initDarkMode();

    initAuthListeners();
    initAdminAndFlashcards(); // We will define this next
  });
})();
