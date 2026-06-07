import { sbClient } from '../../services/supabase';
import { showStatsError } from '../dashboard/dashboard';

let globalLeaderboardData: any[] = [];

export function renderLeaderboard() {
  const lbBody = document.getElementById('leaderboard-body');
  const lbCount = document.getElementById('lb-count');
  const searchInput = document.getElementById('lb-search') as HTMLInputElement;
  const dateStartInput = document.getElementById('lb-date-start') as HTMLInputElement;
  const dateEndInput = document.getElementById('lb-date-end') as HTMLInputElement;

  if (!lbBody) return;

  let filtered = globalLeaderboardData || [];

  if (searchInput && searchInput.value) {
    const q = searchInput.value.toLowerCase();
    filtered = filtered.filter((entry) =>
      (entry.nickname || 'Anonymous').toLowerCase().includes(q)
    );
  }

  if (dateStartInput && dateStartInput.value) {
    const start = new Date(dateStartInput.value).getTime();
    filtered = filtered.filter((entry) => new Date(entry.taken_at).getTime() >= start);
  }
  if (dateEndInput && dateEndInput.value) {
    const end = new Date(dateEndInput.value).getTime() + 86400000;
    filtered = filtered.filter((entry) => new Date(entry.taken_at).getTime() <= end);
  }

  filtered.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime();
  });

  if (filtered.length > 0) {
    lbBody.innerHTML = '';
    filtered.forEach((entry, i) => {
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
        filtered.length + ' practitioner' + (filtered.length === 1 ? '' : 's') + ' on the board';
    }
  } else {
    lbBody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No matches found.</td></tr>';
    if (lbCount) lbCount.textContent = '0 practitioners on the board';
  }
}

export async function fetchGlobalStats() {
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
      if (data.hardest_questions && data.hardest_questions.length > 0 && hardestEl) {
        hardestEl.innerHTML = '';
        data.hardest_questions.forEach((q: any) => {
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
      } else if (hardestEl) {
        hardestEl.textContent = 'Not enough data';
      }

      // Leaderboard
      globalLeaderboardData = data.leaderboard || [];
      renderLeaderboard();
    }
  } catch (e) {
    console.error('Fetch stats exception:', e);
    showStatsError();
  }
}
