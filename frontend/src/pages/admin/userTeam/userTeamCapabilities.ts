export type UserTeamVariant = 'admin' | 'support' | 'forum';

export type UserTeamCapabilities = {
  variant: UserTeamVariant;
  showTeamsTab: boolean;
  canCredits: boolean;
  canVerification: boolean;
  canBan: boolean;
  canPardon: boolean;
  canWarn: boolean;
  canSuspend: boolean;
  canLock: boolean;
  /** Status actions allowed in menus / API */
  statusActions: Set<string>;
  /** Bulk action ids allowed */
  bulkActions: Set<string>;
  /** Primary row action ids allowed */
  primaryActions: Set<string>;
};

const FULL_STATUS = ['ban', 'unban', 'suspend', 'unsuspend', 'lock', 'unlock', 'restore'] as const;
const FORUM_STATUS = ['suspend', 'unsuspend', 'lock', 'unlock'] as const;

export function getUserTeamCapabilities(variant: UserTeamVariant = 'admin'): UserTeamCapabilities {
  if (variant === 'forum') {
    return {
      variant,
      showTeamsTab: false,
      canCredits: false,
      canVerification: false,
      canBan: false,
      canPardon: false,
      canWarn: true,
      canSuspend: true,
      canLock: true,
      statusActions: new Set(FORUM_STATUS),
      bulkActions: new Set(['suspend', 'lock', 'clear']),
      primaryActions: new Set(['view', 'history', 'export']),
    };
  }

  // admin + support: full toolkit
  return {
    variant,
    showTeamsTab: true,
    canCredits: true,
    canVerification: true,
    canBan: true,
    canPardon: true,
    canWarn: true,
    canSuspend: true,
    canLock: true,
    statusActions: new Set(FULL_STATUS),
    bulkActions: new Set(['ban', 'suspend', 'restore', 'lock', 'approve', 'reject', 'clear']),
    primaryActions: new Set(['view', 'credit', 'verification', 'history', 'export']),
  };
}
