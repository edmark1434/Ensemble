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
 * Management actions depend on current status:
 * - Banned → Unban (not Ban)
 * - Suspended → Unsuspend
 * - Locked → Unlock
 * - Active → Ban / Suspend / Lock
 *
 * "Restore" was a catch-all for returning to Active; we use the clearer
 * unban / unsuspend / unlock labels instead.
 */
export function getManageActionsForStatus(
  status?: string | null,
  options?: { hasViolations?: boolean }
): MenuItem[] {
  const s = normalizeAccountStatus(status);
  const items: MenuItem[] = [];

  if (s === 'banned') {
    items.push({ id: 'unban', label: 'Unban account', section: 'manage' });
  } else if (s === 'suspended') {
    items.push({ id: 'unsuspend', label: 'Unsuspend account', section: 'manage' });
    items.push({ id: 'ban', label: 'Ban account', danger: true, section: 'manage' });
    items.push({ id: 'lock', label: 'Lock account', section: 'manage' });
  } else if (s === 'locked') {
    items.push({ id: 'unlock', label: 'Unlock account', section: 'manage' });
    items.push({ id: 'ban', label: 'Ban account', danger: true, section: 'manage' });
    items.push({ id: 'suspend', label: 'Suspend account', danger: true, section: 'manage' });
  } else {
    // Active / Pending / Unknown
    items.push({ id: 'ban', label: 'Ban account', danger: true, section: 'manage' });
    items.push({ id: 'suspend', label: 'Suspend account', danger: true, section: 'manage' });
    items.push({ id: 'lock', label: 'Lock account', section: 'manage' });
  }

  items.push({ id: 'warn', label: 'Warn account', section: 'manage' });

  if (options?.hasViolations || s === 'banned' || s === 'suspended' || s === 'locked') {
    items.push({ id: 'pardon', label: 'Pardon account', section: 'manage' });
  }

  return items;
}

export function getPrimaryRowActions(): MenuItem[] {
  return [
    { id: 'view', label: 'View profile' },
    { id: 'credit', label: 'Credit action' },
    { id: 'moderation', label: 'Moderation action' },
    { id: 'verification', label: 'Verification action' },
    { id: 'history', label: 'Violations overview' },
    { id: 'export', label: 'Export account', section: 'divider' },
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
