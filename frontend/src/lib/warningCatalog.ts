import { warningDurationDays } from './warningLadder';

/** Fallback seed if the warning_defs API is unavailable. Live catalog is admin-editable. */

export type WarningDesk = 'admin' | 'support' | 'forum' | 'marketplace' | 'jobs';

export type WarningPreset = {
  id: string;
  label: string;
  category: string;
  points: number;
  durationDays?: number;
  desks: WarningDesk[];
  note?: string;
};

const ALL_DESKS: WarningDesk[] = ['admin', 'support', 'forum', 'marketplace', 'jobs'];

export const WARNING_PRESETS: WarningPreset[] = [
  { id: 'offensive_language', label: 'Offensive language', category: 'Conduct', points: 2, desks: ALL_DESKS, note: 'First insult or slurs in a post, comment, or profile.' },
  { id: 'harassment', label: 'Harassment or bullying', category: 'Conduct', points: 5, desks: ALL_DESKS, note: 'Targeted harassment. Repeat or severe → also timeout or suspend.' },
  { id: 'hate_speech', label: 'Hate speech', category: 'Conduct', points: 8, desks: ALL_DESKS, note: 'Hate against a protected group. Consider suspend on top.' },
  { id: 'threats', label: 'Threats or violence', category: 'Conduct', points: 10, desks: ALL_DESKS, note: 'Warn for the record, then suspend or ban. Do not leave Active.' },
  { id: 'inappropriate_content', label: 'Inappropriate content', category: 'Conduct', points: 3, desks: ALL_DESKS, note: 'NSFW or offensive media that is not criminal.' },
  { id: 'doxxing', label: 'Sharing private information', category: 'Conduct', points: 8, desks: ALL_DESKS, note: 'Posting addresses, IDs, or private chats.' },

  { id: 'forum_off_topic', label: 'Off-topic or low-effort flood', category: 'Forums', points: 1, desks: ['admin', 'support', 'forum'], note: 'First noisy flood. Typical 3-day slap.' },
  { id: 'forum_spam', label: 'Repeated forum spam', category: 'Forums', points: 3, desks: ['admin', 'support', 'forum'], note: 'Repeat promo, copy-paste, or link dumping.' },
  { id: 'forum_copyright', label: 'Copyrighted material in forums', category: 'Forums', points: 5, desks: ['admin', 'support', 'forum'] },

  { id: 'inbox_spam', label: 'Unsolicited spam messages', category: 'Inbox', points: 2, desks: ALL_DESKS },
  { id: 'inbox_harassment', label: 'Harassment in chat', category: 'Inbox', points: 5, desks: ALL_DESKS },
  { id: 'inbox_scam', label: 'Scam or phishing in chat', category: 'Inbox', points: 8, desks: ALL_DESKS },

  { id: 'job_spam', label: 'Duplicate or spam job post', category: 'Jobs', points: 3, desks: ['admin', 'support', 'jobs'] },
  { id: 'job_misleading', label: 'Misleading job details', category: 'Jobs', points: 5, desks: ['admin', 'support', 'jobs'], note: 'Bait pricing, fake scope, wrong budget.' },
  { id: 'job_scam', label: 'Fake job or scam offer', category: 'Jobs', points: 8, desks: ['admin', 'support', 'jobs'] },
  { id: 'job_fee_evasion', label: 'Job fee evasion', category: 'Jobs', points: 6, desks: ['admin', 'support', 'jobs'] },
  { id: 'no_show', label: 'No-show / ghosting after hire', category: 'Jobs', points: 5, desks: ['admin', 'support', 'jobs'], note: 'First confirmed miss. Live contract still deliverable.' },
  { id: 'fake_delivery', label: 'Fake delivery or empty work', category: 'Jobs', points: 8, desks: ['admin', 'support', 'jobs'] },
  { id: 'review_manipulation', label: 'Review manipulation', category: 'Jobs', points: 6, desks: ['admin', 'support', 'jobs'] },

  { id: 'gig_spam', label: 'Duplicate or spam gig', category: 'Gigs', points: 3, desks: ['admin', 'support', 'jobs'] },
  { id: 'gig_misleading', label: 'Misleading gig or bait-and-switch', category: 'Gigs', points: 5, desks: ['admin', 'support', 'jobs'] },
  { id: 'gig_stolen_media', label: 'Stolen gig media', category: 'Gigs', points: 8, desks: ['admin', 'support', 'jobs'] },
  { id: 'gig_fake_delivery', label: 'Fake gig delivery', category: 'Gigs', points: 8, desks: ['admin', 'support', 'jobs'] },

  { id: 'listing_spam', label: 'Spam marketplace listing', category: 'Marketplace', points: 3, desks: ['admin', 'support', 'marketplace'] },
  { id: 'listing_misleading', label: 'Misleading listing', category: 'Marketplace', points: 5, desks: ['admin', 'support', 'marketplace'] },
  { id: 'listing_copyright', label: 'Copyright infringement', category: 'Marketplace', points: 7, desks: ['admin', 'support', 'marketplace'] },
  { id: 'listing_stolen', label: 'Stolen or unauthorized asset', category: 'Marketplace', points: 8, desks: ['admin', 'support', 'marketplace'] },
  { id: 'listing_malware', label: 'Malware or harmful file', category: 'Marketplace', points: 10, desks: ['admin', 'support', 'marketplace'], note: 'Unpublish the listing. Usually lock or ban too.' },
  { id: 'listing_fee_evasion', label: 'Marketplace fee evasion', category: 'Marketplace', points: 6, desks: ['admin', 'support', 'marketplace'] },

  { id: 'team_fake', label: 'Fake team', category: 'Teams', points: 5, desks: ['admin', 'support', 'jobs'] },
  { id: 'team_harassment', label: 'Harassment of team members', category: 'Teams', points: 5, desks: ['admin', 'support', 'forum', 'jobs'] },
  { id: 'team_copyright', label: 'Copyrighted team content', category: 'Teams', points: 5, desks: ['admin', 'support', 'jobs'] },

  { id: 'profile_inappropriate', label: 'Inappropriate profile content', category: 'Identity', points: 3, desks: ['admin', 'support'] },
  { id: 'impersonation', label: 'Impersonation', category: 'Identity', points: 8, desks: ALL_DESKS, note: 'Pretending to be a person or brand. Often lock too.' },
  { id: 'fake_id', label: 'Fraudulent identity documents', category: 'Identity', points: 10, desks: ['admin', 'support'], note: 'Warn for the record, then lock or ban.' },

  { id: 'dispute_abuse', label: 'Abuse of the dispute process', category: 'Money', points: 5, desks: ['admin', 'support', 'jobs', 'marketplace'] },
  { id: 'refund_abuse', label: 'Refund or chargeback abuse', category: 'Money', points: 8, desks: ['admin', 'support', 'jobs', 'marketplace'] },
  { id: 'payment_fraud', label: 'Payment fraud', category: 'Money', points: 10, desks: ['admin', 'support'], note: 'Warn for the record, then ban.' },

  { id: 'editor_harassment', label: 'Harassment in a project', category: 'Editor', points: 5, desks: ['admin', 'support'] },
  { id: 'editor_malware', label: 'Harmful file in the editor', category: 'Editor', points: 10, desks: ['admin', 'support'] },

  { id: 'staff_follow_up', label: 'Staff follow-up warning', category: 'Other', points: 3, desks: ALL_DESKS, note: 'Report or ticket sanction when none of the named rows fit.' },
  { id: 'other_minor', label: 'Other (minor)', category: 'Other', points: 3, desks: ALL_DESKS },
  { id: 'other_moderate', label: 'Other (moderate)', category: 'Other', points: 5, desks: ALL_DESKS },
  { id: 'other_serious', label: 'Other (serious)', category: 'Other', points: 8, desks: ALL_DESKS },
];

export function warningsForDesk(desk: WarningDesk = 'admin') {
  const rows = desk === 'admin' || desk === 'support'
    ? WARNING_PRESETS
    : WARNING_PRESETS.filter((row) => row.desks.includes(desk));
  return rows.map((row) => ({
    ...row,
    durationDays: row.durationDays || warningDurationDays(row.points),
  }));
}

export function getWarningById(id: string) {
  return WARNING_PRESETS.find((row) => row.id === id) || null;
}

export function groupWarningRows(rows: WarningPreset[]) {
  const groups: { category: string; items: WarningPreset[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (!last || last.category !== row.category) groups.push({ category: row.category, items: [row] });
    else last.items.push(row);
  }
  return groups;
}

export function groupedWarnings(desk: WarningDesk = 'admin') {
  return groupWarningRows(warningsForDesk(desk));
}
