import { sbClient } from '../../services/supabase';
import { generateRadarSVG } from '../../utils/helpers';
import { showToast } from '../../components/toast';

export function showStatsError() {
  const errMsg = 'Unavailable';
  const el = (id: string) => document.getElementById(id);
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

export async function loadDashboard(email: string, pinHash: string) {
  if (!sbClient) return; // Supabase offline
  try {
    let data = null;
    let error = null;
    try {
      const res = await sbClient.rpc('get_user_history', {
        p_email: email,
        p_pin_hash: pinHash,
      });
      data = res.data;
      error = res.error;
    } catch (err: any) {
      error = err;
    }
    if (error || !data || !data.success) {
      showToast('Authentication failed or service unreachable.');
      return;
    }

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
        const domainNames: Record<string, string> = {
          research_pipeline: 'Research Pipeline',
          code_exploration: 'Code Exploration',
          customer_support: 'Customer Support',
          extraction_pipeline: 'Extraction Pipeline',
          misc: 'Miscellaneous',
        };
        const radarHtml = generateRadarSVG(domainStats, domainNames);
        html +=
          '<div class="domain-breakdown" style="margin: 15px 0 25px 0; display:flex; flex-direction:column; align-items:center;"><h5>📊 Your Last Attempt</h5>' +
          radarHtml +
          '</div>';
      } catch (e) {}
    }

    html += '<div class="history-list">';
    results.slice(0, 5).forEach((r: any) => {
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
