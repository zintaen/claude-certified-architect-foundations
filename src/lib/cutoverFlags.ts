/**
 * Cutover read flags (DATA-002). All default off; each independently revertible.
 */
export type CutoverFlag = 'off' | 'on';

function flag(name: string): CutoverFlag {
  const v = (process.env[name] || 'off').toLowerCase();
  return v === 'on' ? 'on' : 'off';
}

export function serveFromDb(): boolean {
  return flag('SERVE_FROM_DB') === 'on';
}

export function dashboardFromDb(): boolean {
  return flag('DASHBOARD_FROM_DB') === 'on';
}

export function leaderboardFromDb(): boolean {
  return flag('LEADERBOARD_FROM_DB') === 'on';
}

export type DbGradePath = 'off' | 'shadow' | 'on';

export function dbGradePath(): DbGradePath {
  const v = (process.env.DB_GRADE_PATH || 'off').toLowerCase();
  if (v === 'shadow' || v === 'on') return v;
  return 'off';
}
