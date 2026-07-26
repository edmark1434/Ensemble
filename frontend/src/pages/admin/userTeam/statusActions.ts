import type { MenuItem } from './components/RowActionsMenu';

export type StatusActionId =
  | 'ban'
  | 'unban'
  | 'suspend'
  | 'unsuspend'
  | 'lock'
  | 'unlock'
  | 'warn'
  | 'pardon';

/** Normalize account status for comparisons. */
export function normalizeAccountStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase();
}

/**
 * Status actions depend on current account state.
 * Reverse actions replace Ban/Suspend/Lock when already applied.
 */
export function getManageActionsForStatus(
  status?: string | null,
  options?: { hasViolations?: boolean }
): MenuItem[] {
  const s = normalizeAccountStatus(status);
  const items: MenuItem[] = [];

  if (s === 'banned') {
    items.push({ id: 'unban', label: 'Unban', section: 'manage' });
  } else if (s === 'suspended') {
    items.push({ id: 'unsuspend', label: 'Unsuspend', section: 'manage' });
    items.push({ id: 'lock', label: 'Lock', section: 'manage' });
    items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  } else if (s === 'locked') {
    items.push({ id: 'unlock', label: 'Unlock', section: 'manage' });
    items.push({ id: 'suspend', label: 'Suspend', danger: true, section: 'manage' });
    items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  } else {
    items.push({ id: 'suspend', label: 'Suspend', danger: true, section: 'manage' });
    items.push({ id: 'lock', label: 'Lock', section: 'manage' });
    items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  }

  items.push({ id: 'warn', label: 'Issue warning', section: 'manage' });

  if (options?.hasViolations || s === 'banned' || s === 'suspended' || s === 'locked') {
    items.push({ id: 'pardon', label: 'Pardon & restore', section: 'manage' });
  }

  return items;
}

export function getPrimaryRowActions(): MenuItem[] {
  return [
    { id: 'view', label: 'View profile' },
    { id: 'credit', label: 'Credits & wallet' },
    { id: 'verification', label: 'Verification' },
    { id: 'history', label: 'Violations & disputes' },
    { id: 'export', label: 'Export JSON', section: 'tools' },
  ];
}

export function buildRowActionItems(
  status?: string | null,
  options?: { hasViolations?: boolean }
): MenuItem[] {
  return [...getPrimaryRowActions(), ...getManageActionsForStatus(status, options)];
}

export function exportAccountJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
