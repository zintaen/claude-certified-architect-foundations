import { $, richText } from '../../utils/dom';
import { store } from '../../core/store';
import { showToast } from '../../components/toast';
import { idb } from '../../services/db';
import { state, renderResultDOM } from '../../core/ExamEngine';

export class FlashcardEngine {
  private fcIndex = 0;
  private fcPool: any[] = [];

  constructor() {}

  async initAdminAndFlashcards() {
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

        let domainStats: Record<string, any> = {};
        try {
          domainStats = JSON.parse(lastStatsStr);
        } catch (e) {}

        let weakestGroup: string | null = null;
        let lowestPct = 100;

        Object.entries(domainStats).forEach(([key, val]) => {
          const v = val as any;
          const pct = v.total ? Math.round((100 * v.correct) / v.total) : 0;
          if (pct < lowestPct) {
            lowestPct = pct;
            weakestGroup = key;
          }
        });

        let pool = qs;
        if (weakestGroup) {
          pool = qs.filter((q: any) => q.group === weakestGroup);
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
          window.startExam?.(o as any);
          // Restore immediately after starting so subsequent logic uses original pool
          window.setQuestions(originalQs);
        };

        if (window.verifyUser) {
          window
            .verifyUser()
            .then((valid: boolean) => {
              if (valid) execute();
              else window.setQuestions(originalQs);
            })
            .catch(() => {
              window.setQuestions(originalQs);
            });
        } else {
          execute();
        }
      });
    }

    // ---- 2. Flashcard Mode (Leitner System) ----
    const btnFlashcard = document.getElementById('btn-flashcard');

    // Load Leitner from IndexedDB into store on startup
    try {
      const savedLeitner = await idb.get('ccaf-leitner');
      if (savedLeitner) {
        store.dispatch({ type: 'SET_LEITNER_DATA', payload: savedLeitner });
      }
    } catch (e) {}

    this.updateDueCount();

    window.finishFlashcards = async () => {
      await idb.delete('ccaf-fc-pool');
      await idb.delete('ccaf-fc-index');
      // Reset store so subscribe() no longer thinks we're in flashcard mode
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
      document.getElementById('view-flashcard')?.classList.add('hidden');
      document.getElementById('view-start')?.classList.remove('hidden');
      this.updateDueCount();
    };

    if (btnFlashcard) {
      btnFlashcard.addEventListener('click', async () => {
        let savedPoolStr: string | null = null;
        let savedIndexStr: string | null = null;

        try {
          savedPoolStr = await idb.get('ccaf-fc-pool');
          savedIndexStr = await idb.get('ccaf-fc-index');
        } catch (e) {}

        if (savedPoolStr) {
          try {
            const ids = JSON.parse(savedPoolStr);
            this.fcPool = ids.map((id: string) => qs.find((q: any) => q.id === id)).filter(Boolean);
            this.fcIndex = parseInt(savedIndexStr || '0', 10) || 0;
            if (this.fcIndex >= this.fcPool.length) {
              this.fcIndex = 0;
              this.fcPool = [];
            }
          } catch (e) {
            this.fcPool = [];
          }
        }

        if (this.fcPool.length === 0) {
          // Generate new pool of Due cards
          const leitner = store.getState().leitner || {};
          const now = Date.now();
          this.fcPool = qs
            .filter((q: any) => {
              const data = leitner[q.id];
              return !data || data.nextReview <= now;
            })
            .sort(() => Math.random() - 0.5);
          this.fcIndex = 0;
        }

        if (this.fcPool.length === 0) {
          return showToast('You are caught up! No cards due for review.');
        }

        await idb.set('ccaf-fc-pool', JSON.stringify(this.fcPool.map((q: any) => q.id)));
        await idb.set('ccaf-fc-index', String(this.fcIndex));

        // Set store to flashcard mode so subscribe() callback knows we're in flashcard mode
        store.dispatch({
          type: 'START_EXAM',
          payload: {
            items: this.fcPool.map((q: any) => ({ ...q, chosenLetter: '', flagged: false })),
            untimed: true,
            isFlashcardMode: true,
            sessionId: `fc-${Date.now()}`,
            startedAt: Date.now(),
            durationSec: 0,
            endsAt: 0,
            timerHandle: null,
          },
        });

        document.getElementById('view-start')?.classList.add('hidden');
        document.getElementById('view-flashcard')?.classList.remove('hidden');
        this.renderFlashcard();
      });
    }

    // ---- 3. Admin Editor ----
    if (new URLSearchParams(window.location.search).get('admin')) {
      document.getElementById('view-start')?.classList.add('hidden');
      document.getElementById('view-admin')?.classList.remove('hidden');
      import('../../admin/admin').then((m) => m.initAdmin(qs)).catch(console.error);
    }
  }

  private updateDueCount() {
    const qs = window.QUESTIONS || [];
    const leitner = store.getState().leitner || {};
    const now = Date.now();
    const dueCount = qs.filter((q: any) => {
      const data = leitner[q.id];
      return !data || data.nextReview <= now;
    }).length;

    const badge = document.getElementById('fc-due-count');
    if (badge) badge.textContent = dueCount > 0 ? `(${dueCount} Due)` : '(Caught Up!)';
    return dueCount;
  }

  private renderFlashcard() {
    const q = this.fcPool[this.fcIndex];
    const card = document.getElementById('fc-card');
    const prog = document.getElementById('fc-progress');
    if (prog) {
      prog.setAttribute('total', this.fcPool.length.toString());
      prog.setAttribute('answered', this.fcIndex.toString());
    }

    let html = `<div class="review-item" style="border:none; padding:0; box-shadow:none; margin:0; background:transparent;">`;
    html += `<div class="review-q" style="margin-bottom:20px;">${richText(q.text)}</div>`;
    q.options.forEach((op: any, i: number) => {
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
    if (card) card.innerHTML = html;

    const btnNext = document.getElementById('fc-btn-next');
    if (btnNext) btnNext.classList.add('hidden');
    document.getElementById('fc-actions')?.classList.remove('hidden');

    let answered = false;
    q.options.forEach((op: any, i: number) => {
      const optDiv = document.getElementById(`fc-opt-${i}`);
      if (optDiv) {
        optDiv.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          this.rateCard(q, op, i);
        });
      }
    });
  }

  private async rateCard(q: any, op: any, i: number) {
    const letter = String.fromCharCode(65 + i);
    store.dispatch({
      type: 'PROCESS_FLASHCARD_ANSWER',
      payload: {
        idx: window.QUESTIONS.findIndex((x: any) => x.id === q.id),
        qId: q.id,
        letter,
        isCorrect: op.correct,
      },
    });

    // Persist to IndexedDB
    await idb.set('ccaf-leitner', store.getState().leitner);

    this.flipCard(q, i);
  }

  private flipCard(q: any, chosenIdx: number) {
    // Instant Feedback Visuals
    q.options.forEach((innerOp: any, j: number) => {
      const innerOptDiv = document.getElementById(`fc-opt-${j}`);
      const whyDiv = document.getElementById(`fc-why-${j}`);
      if (!innerOptDiv || !whyDiv) return;
      if (innerOp.correct) {
        innerOptDiv.classList.add('is-correct');
      } else if (chosenIdx === j) {
        innerOptDiv.classList.add('is-wrong');
      } else {
        innerOptDiv.style.opacity = '0.5';
      }
      whyDiv.classList.remove('hidden');
    });

    const btnNext = document.getElementById('fc-btn-next');
    if (btnNext) {
      btnNext.classList.remove('hidden');
      btnNext.onclick = () => this.nextCard();
    }
  }

  private async nextCard() {
    this.fcIndex++;
    await idb.set('ccaf-fc-index', String(this.fcIndex));
    if (this.fcIndex >= this.fcPool.length) {
      showToast("You've finished all flashcards for today!");
      window.finishFlashcards?.();
    } else {
      this.renderFlashcard();
    }
  }
}
