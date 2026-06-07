import { $, esc, richText } from '../utils/dom';
import {
  shuffle,
  pickProportional,
  sessionId,
  fmtTime,
  generateRadarSVG,
  hashPIN,
} from '../utils/helpers';
import { store, State, Option } from './store';
import { idb, saveProgress, syncQueue } from '../services/db';
import { showToast } from '../components/toast';
import { telemetry } from '../services/telemetry';
import { fetchGlobalStats } from '../features/leaderboard/leaderboard';
import { sbClient } from '../services/supabase';

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

export const state = new Proxy({} as State, {
  get(_t, prop: keyof State) {
    return store.getState()[prop];
  },
  set() {
    throw new Error('State must be mutated via store.dispatch()');
  },
});

export function buildSession(opts: ExamOpts) {
  const qs = window.QUESTIONS;
  const want = Math.max(1, Math.min(qs.length, opts.count | 0));
  const pool = pickProportional(qs, want);

  const items = pool.map((q) => ({
    id: q.id,
    group: q.group,
    text: q.text,
    options: shuffle(q.options) as Option[],
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
      isFlashcardMode: false,
      sessionId: sessionId(),
      startedAt,
      durationSec,
      endsAt,
      timerHandle: null,
    },
  });

  window.__focusLoss = 0;
}

export function renderQuestion() {
  const it = state.items[state.idx];
  if (!it) return;
  $('#q-num')!.textContent = `Question ${state.idx + 1} of ${state.items.length}`;
  $('#q-text')!.innerHTML = richText(it.text);

  const host = $('#q-opts')!;
  host.innerHTML = '';
  host.setAttribute('role', 'radiogroup');
  host.setAttribute('aria-label', 'Answer options');
  it.options.forEach((op, i) => {
    const letter = String.fromCharCode(65 + i);
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
    store.dispatch({
      type: 'FLAG_QUESTION',
      payload: { idx: state.idx, flagged: (e.target as HTMLInputElement).checked },
    });
    renderPalette();
  };
  ($('#btn-prev') as HTMLButtonElement).disabled = state.idx === 0;
  $('#btn-next')!.textContent = state.idx === state.items.length - 1 ? 'Last →' : 'Next →';
}

export function renderPalette() {
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
  if (store.getBroadcastDepth() === 0) {
    saveProgress(store.getState());
  }
}

export function renderProgress() {
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

export function tickTimer() {
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
        reviewLockReason:
          'The 120-minute timer ran out before you could submit. Retake the exam and finish before time expires to unlock explanations.',
      },
    });
    finishExam(true);
  }
}

export function startTimer() {
  stopTimer();
  tickTimer();
  const handle = window.setInterval(tickTimer, 500);
  store.dispatch({ type: 'RESUME_EXAM', payload: { timerHandle: handle } as Partial<State> });
}

export function stopTimer() {
  store.dispatch({ type: 'CLEAR_TIMER' });
}

export function startExam(opts: ExamOpts) {
  if (state.items.length > 0 && !state.finished) return;
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
  window.showView?.('view-running');
  renderQuestion();
  renderPalette();
  renderProgress();
  document.body.classList.add('no-select');

  telemetry.onViolation = () => finishExam(true);
  telemetry.start(window.__isProctorMode);

  startTimer();
}

export function finishExam(force: boolean) {
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
      reviewLockReason,
    },
  });

  renderResultDOM();
}

export function renderResultDOM() {
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

  const card = $('#result-card');
  if (card) {
    card.classList.toggle('is-pass', passed);
    card.classList.toggle('is-fail', !passed);
  }

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

  const valEl = $('#score-val');
  if (valEl) {
    const target = score1000;
    const started = performance.now();
    const dur = 1100;
    function step(t: number) {
      const k = Math.min(1, (t - started) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      valEl!.textContent = String(Math.round(target * eased));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const pctEl = $('#score-pct');
  if (pctEl) pctEl.textContent = `${pct}% correct`;

  $('#r-correct')!.textContent = String(correct);
  $('#r-incorrect')!.textContent = String(incorrect);
  $('#r-skipped')!.textContent = String(skipped);
  $('#r-time')!.textContent = fmtTime(usedSec);

  const tag = $('#pass-tag');
  if (tag) {
    tag.textContent = passed ? '✓ PASS (mock threshold)' : '✗ BELOW THRESHOLD';
    tag.classList.toggle('pass', passed);
    tag.classList.toggle('fail', !passed);
  }
  $('#result-session')!.textContent = state.sessionId;

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

  if (window.submitToSupabase) {
    const wrongIdxs: number[] = [];
    let totalAnswered = 0;
    state.items.forEach((it, idx) => {
      if (it.chosenLetter) totalAnswered++;
      const chosen = it.options.find((o) => o.letter === it.chosenLetter);
      if (!chosen || !chosen.correct) {
        wrongIdxs.push(idx + 1);
      }
    });
    if (totalAnswered > 0 && !state.untimed && state.items.length === 60) {
      window.submitToSupabase(score1000, wrongIdxs, usedSec);
    } else {
      console.warn('Exam was practice/partial or abandoned. Skipped saving to Supabase.');
    }
  }

  const domainStats: Record<string, DomainStat> = {};
  state.items.forEach((it) => {
    const g = it.group || 'misc';
    if (!domainStats[g]) domainStats[g] = { total: 0, correct: 0 };
    domainStats[g].total++;
    const chosen = it.options.find((o) => o.letter === it.chosenLetter);
    if (chosen && chosen.correct) domainStats[g].correct++;
  });

  localStorage.setItem('ccaf-last-domain-stats', JSON.stringify(domainStats));

  const dbEl = document.getElementById('domain-breakdown');
  if (dbEl) {
    const domainNames: Record<string, string> = {
      research_pipeline: 'Research Pipeline',
      code_exploration: 'Code Exploration',
      customer_support: 'Customer Support',
      extraction_pipeline: 'Extraction Pipeline',
      misc: 'Miscellaneous',
    };
    const radarHtml = generateRadarSVG(domainStats, domainNames);

    let html =
      '<div class="domain-breakdown" style="display:flex; flex-direction:column; align-items:center;">';
    html += '<h4>📊 Performance Radar</h4>';
    html += radarHtml;
    html += '</div>';

    dbEl.innerHTML = html;
  }

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
      (reviewBtn as HTMLButtonElement).disabled = false;
    } else {
      gate.classList.add('locked');
      gate.classList.remove('unlocked');
      gateIcon.textContent = '🔒';
      gateTitle.textContent = 'Review is locked';
      gateMsg.textContent = state.reviewLockReason;
      (reviewBtn as HTMLButtonElement).disabled = true;
    }
  }

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

  const shareBtn = document.getElementById('btn-share');
  const shareMenu = document.getElementById('share-menu');
  if (shareBtn && shareMenu) {
    shareMenu.classList.add('hidden');
    const shareText = `${passed ? '✅ Passed' : '📊 Scored'} ${score1000}/1000 on the Claude Certified Architect mock exam! ${passed ? '🎉' : 'Still learning!'}\n\nTry it free → https://ccaf.cyberskill.dev`;
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

  window.showView?.('view-result');
}

export function renderReview() {
  const host = $('#review-list');
  if (!host) return;
  host.innerHTML = '';
  state.items.forEach((it, i) => {
    const chosen = it.chosenLetter;
    const correctOpt = it.options.find((o) => o.correct);
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
        <button class="btn ghost small" onclick="window.loadComments('${it.id}', 'comments-${it.id}')">Load / Add Comments</button>
      </div>
      <div id="comments-${it.id}" class="comments-list hidden">
        <div class="comments-content" style="margin-bottom:15px; font-size:0.9rem;"></div>
        <div style="display:flex; gap:10px;">
          <input type="text" id="comment-input-${it.id}" placeholder="Add a comment..." style="flex:1; padding:8px; border:1px solid var(--line); border-radius:4px; background:var(--bg); color:var(--ink);" />
          <button class="btn primary small" onclick="window.postComment('${it.id}', 'comments-${it.id}')">Post</button>
        </div>
      </div>
    `;
    card.appendChild(commBox);

    host.appendChild(card);
  });
}

export async function submitToSupabase(score: number, wrongAnswers: number[], timeTaken: number) {
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

  if (!sbClient) return;
  let p_email: string | null = null;
  let p_pin_hash: string | null = null;
  let p_nickname: string | null = nickname || null;

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
      setTimeout(fetchGlobalStats, 2000);
    }
  } catch (e) {
    console.error('Supabase exception:', e);
  }
}
