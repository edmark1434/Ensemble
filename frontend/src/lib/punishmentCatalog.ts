import type { WarningDesk } from './warningCatalog';

export type PunishmentKind = 'ban' | 'suspend' | 'timeout';

export type PunishmentPreset = {
  id: string;
  kind: PunishmentKind;
  label: string;
  category: string;
  durationDays: number | null;
  desks: WarningDesk[];
  note?: string;
};

const ALL_DESKS: WarningDesk[] = ['admin', 'support', 'forum', 'marketplace', 'jobs'];
const BAN_DESKS: WarningDesk[] = ['admin', 'support'];
const TIMEOUT_DESKS: WarningDesk[] = ['admin', 'support', 'forum'];
const SUSPEND_WORK_DESKS: WarningDesk[] = ['admin', 'support', 'jobs'];
const SUSPEND_MARKET_DESKS: WarningDesk[] = ['admin', 'support', 'marketplace'];
const SUSPEND_MONEY_DESKS: WarningDesk[] = ['admin', 'support', 'jobs', 'marketplace'];

export const PUNISHMENT_KINDS: { id: PunishmentKind; label: string }[] = [
  { id: 'timeout', label: 'Timeout' },
  { id: 'suspend', label: 'Suspension' },
  { id: 'ban', label: 'Ban' },
];

export const PUNISHMENT_PRESETS: PunishmentPreset[] = [
  { id: 'timeout_off_topic', kind: 'timeout', label: 'Off-topic or flood', category: 'Forums', durationDays: 1, desks: TIMEOUT_DESKS, note: 'Noisy flood. Forum writes off; rest of Ensemble stays open.' },
  { id: 'timeout_offensive', kind: 'timeout', label: 'Offensive language', category: 'Conduct', durationDays: 1, desks: TIMEOUT_DESKS, note: 'First insult in a post or comment.' },
  { id: 'timeout_spam', kind: 'timeout', label: 'Repeated forum spam', category: 'Forums', durationDays: 3, desks: TIMEOUT_DESKS },
  { id: 'timeout_copyright', kind: 'timeout', label: 'Copyrighted material in forums', category: 'Forums', durationDays: 3, desks: TIMEOUT_DESKS },
  { id: 'timeout_harassment', kind: 'timeout', label: 'Harassment in forums', category: 'Conduct', durationDays: 7, desks: TIMEOUT_DESKS, note: 'Targeted harassment on a forum thread.' },
  { id: 'timeout_hate', kind: 'timeout', label: 'Hate speech (forum cooldown)', category: 'Conduct', durationDays: 14, desks: TIMEOUT_DESKS, note: 'Consider a suspension if it is severe or repeated.' },
  { id: 'timeout_repeat', kind: 'timeout', label: 'Repeat forum timeout', category: 'Forums', durationDays: 14, desks: TIMEOUT_DESKS },
  { id: 'timeout_other', kind: 'timeout', label: 'Other (forum timeout)', category: 'Other', durationDays: 3, desks: TIMEOUT_DESKS },

  { id: 'suspend_repeat_harassment', kind: 'suspend', label: 'Repeat harassment', category: 'Conduct', durationDays: 7, desks: ALL_DESKS },
  { id: 'suspend_hate', kind: 'suspend', label: 'Hate speech', category: 'Conduct', durationDays: 14, desks: ALL_DESKS },
  { id: 'suspend_doxxing', kind: 'suspend', label: 'Sharing private information', category: 'Conduct', durationDays: 14, desks: ALL_DESKS },
  { id: 'suspend_threats', kind: 'suspend', label: 'Threats (review)', category: 'Conduct', durationDays: 14, desks: ALL_DESKS, note: 'Hold while staff review. Ban if the threat is credible.' },
  { id: 'suspend_impersonation', kind: 'suspend', label: 'Impersonation', category: 'Identity', durationDays: 7, desks: ALL_DESKS },
  { id: 'suspend_scam_chat', kind: 'suspend', label: 'Scam or phishing in chat', category: 'Inbox', durationDays: 7, desks: ALL_DESKS },
  { id: 'suspend_job_scam', kind: 'suspend', label: 'Fake job or scam offer', category: 'Jobs', durationDays: 14, desks: SUSPEND_WORK_DESKS },
  { id: 'suspend_fake_delivery', kind: 'suspend', label: 'Fake delivery or empty work', category: 'Jobs', durationDays: 7, desks: SUSPEND_WORK_DESKS },
  { id: 'suspend_gig_stolen', kind: 'suspend', label: 'Stolen gig media', category: 'Gigs', durationDays: 7, desks: SUSPEND_WORK_DESKS },
  { id: 'suspend_listing_stolen', kind: 'suspend', label: 'Stolen or unauthorized asset', category: 'Marketplace', durationDays: 14, desks: SUSPEND_MARKET_DESKS },
  { id: 'suspend_malware', kind: 'suspend', label: 'Malware listing (hold)', category: 'Marketplace', durationDays: 14, desks: SUSPEND_MARKET_DESKS, note: 'Unpublish the listing. Ban if the file is confirmed harmful.' },
  { id: 'suspend_refund_abuse', kind: 'suspend', label: 'Refund or chargeback abuse', category: 'Money', durationDays: 7, desks: SUSPEND_MONEY_DESKS },
  { id: 'suspend_dispute_abuse', kind: 'suspend', label: 'Abuse of the dispute process', category: 'Money', durationDays: 7, desks: SUSPEND_MONEY_DESKS },
  { id: 'suspend_fake_id', kind: 'suspend', label: 'Fraudulent identity (hold)', category: 'Identity', durationDays: 14, desks: BAN_DESKS, note: 'Hold while ID is reviewed. Lock or ban if confirmed.' },
  { id: 'suspend_repeat_warnings', kind: 'suspend', label: 'Repeat warning cooldown', category: 'Other', durationDays: 7, desks: ALL_DESKS },
  { id: 'suspend_other', kind: 'suspend', label: 'Other (suspension)', category: 'Other', durationDays: 7, desks: ALL_DESKS },

  { id: 'ban_repeat_harassment', kind: 'ban', label: 'Repeat harassment', category: 'Conduct', durationDays: 7, desks: BAN_DESKS },
  { id: 'ban_hate', kind: 'ban', label: 'Hate speech or doxxing', category: 'Conduct', durationDays: 30, desks: BAN_DESKS },
  { id: 'ban_threats', kind: 'ban', label: 'Threats or violence', category: 'Conduct', durationDays: 90, desks: BAN_DESKS },
  { id: 'ban_scam', kind: 'ban', label: 'Scam or phishing', category: 'Inbox', durationDays: 30, desks: BAN_DESKS },
  { id: 'ban_impersonation', kind: 'ban', label: 'Impersonation (severe)', category: 'Identity', durationDays: 30, desks: BAN_DESKS },
  { id: 'ban_malware', kind: 'ban', label: 'Malware or harmful files', category: 'Marketplace', durationDays: 90, desks: BAN_DESKS },
  { id: 'ban_repeat_prior', kind: 'ban', label: 'Repeat after a prior ban', category: 'Other', durationDays: 90, desks: BAN_DESKS },
  { id: 'ban_other_temp', kind: 'ban', label: 'Other (temporary ban)', category: 'Other', durationDays: 7, desks: BAN_DESKS },
  { id: 'ban_payment_fraud', kind: 'ban', label: 'Payment fraud', category: 'Money', durationDays: null, desks: BAN_DESKS, note: 'Permanent. Escrow stays a staff action.' },
  { id: 'ban_fake_id', kind: 'ban', label: 'Fraudulent identity documents', category: 'Identity', durationDays: null, desks: BAN_DESKS },
  { id: 'ban_dispute_conviction', kind: 'ban', label: 'Dispute conviction', category: 'Money', durationDays: null, desks: BAN_DESKS, note: 'Permanent ban of the respondent. Appeal only.' },
  { id: 'ban_severe_crime', kind: 'ban', label: 'Illegal or severe crime', category: 'Conduct', durationDays: null, desks: BAN_DESKS },
  { id: 'ban_other_perm', kind: 'ban', label: 'Other (permanent ban)', category: 'Other', durationDays: null, desks: BAN_DESKS },
];

export function punishmentsForDesk(desk: WarningDesk = 'admin', kind?: PunishmentKind) {
  const key = String(desk || 'admin').trim().toLowerCase();
  let rows = [...PUNISHMENT_PRESETS];
  if (key !== 'admin' && key !== 'support') {
    rows = rows.filter((row) => row.desks.includes(key as WarningDesk));
  }
  if (kind) rows = rows.filter((row) => row.kind === kind);
  return rows;
}

export function groupPunishmentRows(rows: PunishmentPreset[]) {
  const groups: { category: string; items: PunishmentPreset[] }[] = [];
  for (const row of rows) {
    const current = groups.find((group) => group.category === row.category);
    if (current) current.items.push(row);
    else groups.push({ category: row.category, items: [row] });
  }
  return groups;
}

export function groupedPunishments(desk: WarningDesk = 'admin', kind?: PunishmentKind) {
  return groupPunishmentRows(punishmentsForDesk(desk, kind));
}

export function punishmentDurationLabel(row: Pick<PunishmentPreset, 'durationDays'>) {
  if (row.durationDays == null) return 'Permanent';
  return `${row.durationDays} day${row.durationDays === 1 ? '' : 's'}`;
}

export function mapPunishmentCatalogRow(row: Partial<PunishmentPreset> & { slug?: string; permanent?: boolean }): PunishmentPreset {
  const durationDays = row.permanent || row.durationDays === null
    ? null
    : Number.isFinite(Number(row.durationDays))
      ? Number(row.durationDays)
      : 7;
  return {
    id: String(row.id || row.slug || ''),
    kind: (row.kind === 'ban' || row.kind === 'suspend' || row.kind === 'timeout' ? row.kind : 'suspend'),
    label: String(row.label || ''),
    category: String(row.category || 'Other'),
    durationDays,
    desks: Array.isArray(row.desks) ? row.desks : ['admin'],
    note: row.note || '',
  };
}
