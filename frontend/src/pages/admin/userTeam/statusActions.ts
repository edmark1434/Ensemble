import type { MenuItem } from './components/RowActionsMenu';
import type { UserTeamCapabilities } from './userTeamCapabilities';

export type StatusActionId =
  | 'ban'
  | 'unban'
  | 'suspend'
  | 'unsuspend'
  | 'lock'
  | 'unlock'
  | 'timeout'
  | 'clear_timeout'
  | 'unfreeze'
  | 'warn';

/** Normalize account status for comparisons. */
export function normalizeAccountStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase();
}

function allowAction(id: string, caps?: UserTeamCapabilities) {
  if (!caps) return true;
  if (id === 'warn') return caps.canWarn;
  return caps.statusActions.has(id);
}

/**
 * Status actions depend on current account state.
 * Reverse actions replace Ban/Suspend/Lock when already applied.
 */
export function getManageActionsForStatus(
  status?: string | null,
  options?: {
    hasViolations?: boolean;
    forumTimeout?: boolean;
    /** Running automatic bands / mutes (not suspensions). Admin and Support can end them. */
    automaticPunishments?: number;
    capabilities?: UserTeamCapabilities;
  }
): MenuItem[] {
  const s = normalizeAccountStatus(status);
  const caps = options?.capabilities;
  const items: MenuItem[] = [];

  if (s === 'banned') {
    if (allowAction('unban', caps)) items.push({ id: 'unban', label: 'Remove ban', section: 'manage' });
  } else if (allowAction('ban', caps)) {
    items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  }

  if (s === 'suspended') {
    if (allowAction('unsuspend', caps)) items.push({ id: 'unsuspend', label: 'Remove suspension', section: 'manage' });
  } else if (allowAction('suspend', caps)) {
    items.push({ id: 'suspend', label: 'Suspend', danger: true, section: 'manage' });
  }

  if (s === 'locked') {
    if (allowAction('unlock', caps)) items.push({ id: 'unlock', label: 'Remove lock', section: 'manage' });
  } else if (allowAction('lock', caps)) {
    items.push({ id: 'lock', label: 'Lock', section: 'manage' });
  }

  if (options?.forumTimeout) {
    if (allowAction('clear_timeout', caps)) {
      items.push({ id: 'clear_timeout', label: 'Remove timeout', section: 'manage' });
    }
  } else if (allowAction('timeout', caps)) {
    items.push({ id: 'timeout', label: 'Timeout', section: 'manage' });
  }

  // Unfreeze ends automatic merit punishments early; it sits with pardon (Admin / Support).
  if ((options?.automaticPunishments || 0) > 0 && (!caps || caps.canPardon)) {
    items.push({ id: 'unfreeze', label: 'Unfreeze (end automatic limits)', section: 'manage' });
  }

  if (allowAction('warn', caps)) items.push({ id: 'warn', label: 'Issue warning', section: 'manage' });

  return items;
}

export function getPrimaryRowActions(capabilities?: UserTeamCapabilities): MenuItem[] {
  const all: MenuItem[] = [
    { id: 'view', label: 'View profile' },
    { id: 'credit', label: 'Credits & wallet' },
    { id: 'verification', label: 'Verification' },
    { id: 'history', label: 'Violations & disputes' },
    { id: 'export', label: 'Export JSON', section: 'tools' },
  ];
  if (!capabilities) return all;
  return all.filter((item) => capabilities.primaryActions.has(item.id));
}

export function buildRowActionItems(
  status?: string | null,
  options?: {
    hasViolations?: boolean;
    forumTimeout?: boolean;
    automaticPunishments?: number;
    capabilities?: UserTeamCapabilities;
  }
): MenuItem[] {
  return [
    ...getPrimaryRowActions(options?.capabilities),
    ...getManageActionsForStatus(status, options),
  ];
}

/**
 * Row menu for a team. A team acts as one account, but people work in it: ban / suspend / lock
 * change the team and the people staff pick, and warnings and forum timeouts (teams have no
 * Platform Merit and never post) land only on the people staff pick.
 */
export function buildTeamRowActionItems(
  team: {
    status?: string | null;
    teamType?: string | null;
    leader?: { name: string; forumTimeout?: boolean } | null;
    memberCount?: number;
    members?: { forumTimeout?: boolean }[];
    membersTimedOutViaTeam?: number;
  },
  capabilities?: UserTeamCapabilities
): MenuItem[] {
  const primaryLabels: Record<string, string> = {
    view: 'View team',
    credit: 'Team wallet',
    verification: 'Business verification',
    history: "Members' warnings & disputes",
  };
  const primary = getPrimaryRowActions(capabilities).map((item) =>
    primaryLabels[item.id] ? { ...item, label: primaryLabels[item.id] } : item
  );
  const s = normalizeAccountStatus(team.status);
  const caps = capabilities;
  const manage: MenuItem[] = [];

  if (s === 'banned') {
    if (allowAction('unban', caps)) manage.push({ id: 'unban', label: 'Remove team ban', section: 'manage' });
  } else if (allowAction('ban', caps)) {
    manage.push({ id: 'ban', label: 'Ban team', danger: true, section: 'manage' });
  }
  if (s === 'suspended') {
    if (allowAction('unsuspend', caps)) manage.push({ id: 'unsuspend', label: 'Remove team suspension', section: 'manage' });
  } else if (s !== 'banned' && allowAction('suspend', caps)) {
    manage.push({ id: 'suspend', label: 'Suspend team', danger: true, section: 'manage' });
  }
  if (s === 'locked') {
    if (allowAction('unlock', caps)) manage.push({ id: 'unlock', label: 'Remove team lock', section: 'manage' });
  } else if (s !== 'banned' && allowAction('lock', caps)) {
    manage.push({ id: 'lock', label: 'Lock team', section: 'manage' });
  }

  const memberCount = team.members?.length ?? team.memberCount ?? 0;
  if (memberCount > 0) {
    if (allowAction('warn', caps)) manage.push({ id: 'warn', label: 'Warn team members', section: 'manage' });
    const everyoneTimedOut = Boolean(team.members?.length) && team.members!.every((member) => member.forumTimeout);
    if (!everyoneTimedOut && allowAction('timeout', caps)) {
      manage.push({ id: 'timeout', label: 'Timeout team members', section: 'manage' });
    }
    if ((team.membersTimedOutViaTeam ?? (team.leader?.forumTimeout ? 1 : 0)) > 0 && allowAction('clear_timeout', caps)) {
      manage.push({ id: 'clear_timeout', label: 'Remove team timeouts', section: 'manage' });
    }
  }
  if (caps?.canTransferTeams && String(team.teamType || 'standard') === 'standard') {
    manage.push({ id: 'transfer', label: team.leader ? 'Transfer ownership' : 'Assign an owner', section: 'manage' });
  }

  return [...primary, ...manage];
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
