/**
 * Seed + fallback catalog for standing punishments (ban / suspend / timeout).
 * Live rows live in punishment_defs (admin CRUD).
 * Keep in sync with frontend/src/lib/punishmentCatalog.ts.
 */

const ALL_DESKS = Object.freeze(['admin', 'support', 'forum', 'marketplace', 'jobs']);
const BAN_DESKS = Object.freeze(['admin', 'support']);
const TIMEOUT_DESKS = Object.freeze(['admin', 'support', 'forum']);
const SUSPEND_WORK_DESKS = Object.freeze(['admin', 'support', 'jobs']);
const SUSPEND_MARKET_DESKS = Object.freeze(['admin', 'support', 'marketplace']);
const SUSPEND_MONEY_DESKS = Object.freeze(['admin', 'support', 'jobs', 'marketplace']);

const PUNISHMENT_PRESETS = Object.freeze([
  // Timeouts — forum writes only
  { id: 'timeout_off_topic', kind: 'timeout', label: 'Off-topic or flood', category: 'Forums', durationDays: 1, desks: TIMEOUT_DESKS, note: 'Noisy flood. Forum writes off; rest of Ensemble stays open.' },
  { id: 'timeout_offensive', kind: 'timeout', label: 'Offensive language', category: 'Conduct', durationDays: 1, desks: TIMEOUT_DESKS, note: 'First insult in a post or comment.' },
  { id: 'timeout_spam', kind: 'timeout', label: 'Repeated forum spam', category: 'Forums', durationDays: 3, desks: TIMEOUT_DESKS },
  { id: 'timeout_copyright', kind: 'timeout', label: 'Copyrighted material in forums', category: 'Forums', durationDays: 3, desks: TIMEOUT_DESKS },
  { id: 'timeout_harassment', kind: 'timeout', label: 'Harassment in forums', category: 'Conduct', durationDays: 7, desks: TIMEOUT_DESKS, note: 'Targeted harassment on a forum thread.' },
  { id: 'timeout_hate', kind: 'timeout', label: 'Hate speech (forum cooldown)', category: 'Conduct', durationDays: 14, desks: TIMEOUT_DESKS, note: 'Consider a suspension if it is severe or repeated.' },
  { id: 'timeout_repeat', kind: 'timeout', label: 'Repeat forum timeout', category: 'Forums', durationDays: 14, desks: TIMEOUT_DESKS },
  { id: 'timeout_other', kind: 'timeout', label: 'Other (forum timeout)', category: 'Other', durationDays: 3, desks: TIMEOUT_DESKS },

  // Suspensions — site-wide reads only
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

  // Bans — Admin / Support only
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
]);

const BY_ID = new Map(PUNISHMENT_PRESETS.map((row) => [row.id, row]));

function getPunishmentById(id) {
  return BY_ID.get(String(id || '').trim()) || null;
}

function listPunishmentsForDesk(desk, kind) {
  const key = String(desk || 'admin').trim().toLowerCase();
  const wantedKind = String(kind || '').trim().toLowerCase();
  let rows = [...PUNISHMENT_PRESETS];
  if (key !== 'admin' && key !== 'support') {
    rows = rows.filter((row) => row.desks.includes(key));
  }
  if (wantedKind) rows = rows.filter((row) => row.kind === wantedKind);
  return rows;
}

module.exports = {
  ALL_DESKS,
  PUNISHMENT_PRESETS,
  getPunishmentById,
  listPunishmentsForDesk,
};
