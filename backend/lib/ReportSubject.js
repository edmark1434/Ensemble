const { randomUUID } = require('crypto');
const { pool } = require('./Database');
const { getForumGroupById } = require('../repositories/ForumGroupRepositories');
const { getForumDiscussionById } = require('../repositories/ForumDiscussionRepositories');
const { getMessageByIdRepositories } = require('../repositories/InboxRepositories');

function createReportNumber() {
  return `RPT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

function profileLink(accountId) {
  return accountId ? `/profile/${accountId}` : null;
}

function previewText(value, max = 2000) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>~\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function buildSubjectSnapshot({ kind, title, body = null, href = null, extra = null } = {}) {
  const snapshot = {
    kind: String(kind || 'other').trim().toLowerCase() || 'other',
    title: previewText(title, 200) || 'Reported item',
    body: previewText(body, 2000) || null,
    href: href || null,
  };
  if (extra && typeof extra === 'object') {
    snapshot.extra = extra;
  }
  return snapshot;
}

function parseSnapshot(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? value : null;
}

function snapshotTitle(row) {
  const snapshot = parseSnapshot(row?.subject_snapshot);
  return snapshot?.title || null;
}

function pushLink(links, label, path) {
  if (!path || links.some((link) => link.path === path)) return;
  links.push({ label, path });
}

function extractReportedMessage(description) {
  const text = String(description || '');
  const marker = 'Exact reported message:\n';
  const index = text.indexOf(marker);
  if (index < 0) return null;
  return text
    .slice(index + marker.length)
    .split('\n\nReported attachments:')[0]
    .trim();
}

async function lookupTeam(teamId) {
  if (!teamId) return null;
  const result = await pool.query(
    `
    SELECT t.team_id, a.display_name, a.description, a.tagline
    FROM teams t
    JOIN accounts a ON a.account_id = t.account_id
    WHERE t.deleted_at IS NULL
      AND (t.team_id::text = $1 OR t.account_id::text = $1)
    LIMIT 1
    `,
    [String(teamId)]
  );
  return result.rows[0] || null;
}

async function lookupJob(jobId) {
  if (!jobId) return null;
  const result = await pool.query(
    `SELECT job_id, title, description, client_account_id, deleted_at
     FROM jobs WHERE job_id::text = $1 LIMIT 1`,
    [String(jobId)]
  );
  return result.rows[0] || null;
}

async function lookupGig(gigId) {
  if (!gigId) return null;
  const result = await pool.query(
    `SELECT gig_id, title, description, freelancer_account_id, deleted_at
     FROM gigs WHERE gig_id::text = $1 LIMIT 1`,
    [String(gigId)]
  );
  return result.rows[0] || null;
}

async function lookupAsset(assetId) {
  if (!assetId) return null;
  const result = await pool.query(
    `SELECT market_asset_id, name, description, deleted_at
     FROM market_assets WHERE market_asset_id::text = $1 LIMIT 1`,
    [String(assetId)]
  );
  return result.rows[0] || null;
}

async function lookupMessage(messageId) {
  if (!messageId) return null;
  try {
    const message = await getMessageByIdRepositories(messageId);
    if (!message) return { unavailable: true, content: '', attachments: [], conversationName: null, sentAt: null };
    const attachments = (message.attachments || [])
      .map((attachment) => attachment.attachment_name || attachment.attachment_type || 'Attachment')
      .filter(Boolean);
    return {
      unavailable: Boolean(message.is_deleted || message.deleted_at),
      content: String(message.message_content || '').trim(),
      attachments,
      conversationName: null,
      sentAt: message.created_at || message.createdAt || null,
    };
  } catch {
    return { unavailable: true, content: '', attachments: [], conversationName: null, sentAt: null };
  }
}

async function buildReportSubject(row) {
  const targetType = String(row.target_type || '').trim().toLowerCase();
  const referenceTable = String(row.reference_table || '').trim().toLowerCase();
  const targetId = row.target_id || null;
  const referenceId = row.reference_id || null;
  const accountId = row.for_account_id || null;
  const snapshot = parseSnapshot(row.subject_snapshot);
  const links = [];
  let headline = snapshot?.title || row.target_name || 'Reported item';
  let previewBody = snapshot?.body || null;
  let available = false;
  let message = null;

  if (accountId) {
    pushLink(links, 'Open reported account', profileLink(accountId));
  }
  if (row.by_account_id) {
    pushLink(links, 'Open reporter', profileLink(row.by_account_id));
  }

  try {
    if (targetType === 'chat_message' || referenceTable === 'messages') {
      message = await lookupMessage(targetId);
      const liveContent = message?.content || '';
      const snapshotContent = snapshot?.body || extractReportedMessage(row.description);
      if (message && !message.unavailable) {
        available = true;
        headline = message.conversationName ? `Message in ${message.conversationName}` : snapshot?.title || 'Reported message';
        previewBody = liveContent || snapshotContent;
        message = {
          ...message,
          content: liveContent || snapshotContent || '',
        };
      } else {
        headline = snapshot?.title || 'Reported message';
        previewBody = snapshotContent || liveContent;
        message = {
          unavailable: true,
          content: snapshotContent || liveContent || '',
          attachments: snapshot?.extra?.attachments || message?.attachments || [],
          sentAt: message?.sentAt || null,
        };
      }
    } else if (targetType === 'group' || (referenceTable === 'forum_groups' && targetType !== 'member')) {
      const group = await getForumGroupById(targetId).catch(() => null);
      if (group) {
        available = true;
        headline = group.group_name || headline;
        previewBody = previewBody || previewText(group.description);
        pushLink(links, 'Open forum group', `/forums/group/${targetId}`);
      } else if (snapshot?.href) {
        previewBody = previewBody || snapshot.body;
      }
    } else if (targetType === 'discussion' || targetType === 'post' || referenceTable === 'forum_discussions') {
      const discussion = await getForumDiscussionById(targetId).catch(() => null);
      if (discussion) {
        available = true;
        headline = discussion.title || headline;
        previewBody = previewBody || previewText(discussion.content);
        pushLink(links, 'Open discussion', `/forums/discussion/${targetId}`);
        const groupId = discussion.forum_group_id || discussion.group_id || discussion.groupId;
        pushLink(links, 'Open forum group', groupId ? `/forums/group/${groupId}` : null);
      }
    } else if (targetType === 'member' && referenceTable === 'forum_groups') {
      const group = await getForumGroupById(referenceId).catch(() => null);
      headline = snapshot?.title || row.target_name || 'Forum member';
      if (group) {
        available = true;
        if (group.group_name && !headline.includes(group.group_name)) {
          headline = `${headline} in ${group.group_name}`;
        }
        pushLink(links, 'Open forum group', referenceId ? `/forums/group/${referenceId}` : null);
      }
    } else if (
      targetType === 'team' ||
      targetType === 'team_member' ||
      targetType === 'team_project' ||
      referenceTable === 'teams'
    ) {
      const teamKey = ['member', 'team_member'].includes(targetType) ? referenceId : (referenceId || targetId);
      const team = await lookupTeam(teamKey);
      const isProject = targetType === 'team_project' || String(row.reference_prefix || '').toLowerCase() === 'project';
      if (team) {
        available = true;
        headline = ['member', 'team_member'].includes(targetType)
          ? (snapshot?.title || row.target_name || 'Team member')
          : (team.display_name || headline);
        previewBody = previewBody || previewText(team.description || team.tagline);
        const teamPathId = team.team_id || teamKey;
        pushLink(links, isProject ? 'Open team project' : 'Open team', isProject ? `/team-project/${teamPathId}` : `/teams/${teamPathId}`);
      }
    } else if (targetType === 'asset' || referenceTable === 'market_assets') {
      const asset = await lookupAsset(targetId);
      if (asset && !asset.deleted_at) {
        available = true;
        headline = asset.name || headline;
        previewBody = previewBody || previewText(asset.description);
        pushLink(links, 'Open market asset', `/assets/${targetId}`);
      }
    } else if (targetType === 'job' || referenceTable === 'jobs') {
      const job = await lookupJob(targetId);
      if (job && !job.deleted_at) {
        available = true;
        headline = job.title || headline;
        previewBody = previewBody || previewText(job.description);
        pushLink(links, 'Open job', `/jobs/${targetId}/page`);
      }
    } else if (targetType === 'gig' || referenceTable === 'gigs') {
      const gig = await lookupGig(targetId);
      if (gig && !gig.deleted_at) {
        available = true;
        headline = gig.title || headline;
        previewBody = previewBody || previewText(gig.description);
        pushLink(links, 'Open gig', `/gigs/services/${targetId}/page`);
      }
    } else if (targetType === 'user' || (referenceTable === 'accounts' && targetType !== 'technical_problem')) {
      headline = snapshot?.title || row.target_name || row.target_handle || 'Reported account';
      available = Boolean(accountId);
    } else if (targetType === 'technical_problem') {
      headline = snapshot?.title || row.type || 'Technical problem';
      previewBody = previewBody || String(row.description || '').trim();
      available = true;
    }
  } catch (err) {
    console.warn('Report subject lookup skipped:', err.message);
  }

  if (!available && snapshot?.href && targetType !== 'chat_message' && referenceTable !== 'messages') {
    // Keep the captured path only as context; do not send staff to a dead member page.
    previewBody = previewBody || snapshot.body;
  }

  const linkable = links.some((link) => link.label !== 'Open reporter');

  return {
    headline,
    kind: snapshot?.kind || targetType || 'other',
    description: String(row.description || '').trim(),
    preview: {
      title: headline,
      body: previewBody,
      extra: snapshot?.extra || null,
    },
    available,
    linkable,
    message,
    links,
    reportedAccount: accountId
      ? {
          accountId: String(accountId),
          name: row.target_name || 'Account',
          handle: row.target_handle || null,
          path: profileLink(accountId),
        }
      : null,
  };
}

module.exports = {
  createReportNumber,
  buildSubjectSnapshot,
  parseSnapshot,
  snapshotTitle,
  buildReportSubject,
};
