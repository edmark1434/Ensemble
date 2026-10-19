const { pool } = require('./Database');
const { getForumGroupById } = require('../repositories/ForumGroupRepositories');
const { getForumDiscussionById } = require('../repositories/ForumDiscussionRepositories');
const { getMessageByIdRepositories } = require('../repositories/InboxRepositories');

function profileLink(accountId) {
  return accountId ? `/profile/${accountId}` : null;
}

function pushLink(links, label, path) {
  if (!path || links.some((link) => link.path === path)) return;
  links.push({ label, path });
}

async function lookupTeam(teamId) {
  if (!teamId) return null;
  const result = await pool.query(
    `
    SELECT t.team_id, a.display_name
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
    `SELECT job_id, title, client_account_id FROM jobs WHERE job_id::text = $1 LIMIT 1`,
    [String(jobId)]
  );
  return result.rows[0] || null;
}

async function lookupGig(gigId) {
  if (!gigId) return null;
  const result = await pool.query(
    `SELECT gig_id, title, freelancer_account_id FROM gigs WHERE gig_id::text = $1 LIMIT 1`,
    [String(gigId)]
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
  const links = [];
  let headline = row.target_name || 'Reported account';
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
      headline = message?.conversationName
        ? `Message in ${message.conversationName}`
        : 'Reported message';
    } else if (targetType === 'group' || (referenceTable === 'forum_groups' && targetType !== 'member')) {
      const group = await getForumGroupById(targetId).catch(() => null);
      headline = group?.group_name || 'Forum group';
      pushLink(links, 'Open forum group', targetId ? `/forums/group/${targetId}` : null);
    } else if (targetType === 'discussion' || referenceTable === 'forum_discussions') {
      const discussion = await getForumDiscussionById(targetId).catch(() => null);
      headline = discussion?.title || 'Forum discussion';
      pushLink(links, 'Open discussion', targetId ? `/forums/discussion/${targetId}` : null);
      const groupId = discussion?.forum_group_id || discussion?.group_id || discussion?.groupId;
      pushLink(links, 'Open forum group', groupId ? `/forums/group/${groupId}` : null);
    } else if (targetType === 'member' && referenceTable === 'forum_groups') {
      const group = await getForumGroupById(referenceId).catch(() => null);
      headline = row.target_name || 'Forum member';
      pushLink(links, 'Open forum group', referenceId ? `/forums/group/${referenceId}` : null);
      if (group?.group_name) headline = `${headline} in ${group.group_name}`;
    } else if (targetType === 'team' || referenceTable === 'teams') {
      const teamKey = targetType === 'member' ? referenceId : (referenceId || targetId);
      const team = await lookupTeam(teamKey);
      headline = targetType === 'member'
        ? (row.target_name || 'Team member')
        : (team?.display_name || 'Team');
      const teamPathId = team?.team_id || teamKey;
      pushLink(links, 'Open team', teamPathId ? `/teams/${teamPathId}` : null);
      if (targetType === 'member' || targetType === 'team') {
        pushLink(links, 'Open team project', teamPathId ? `/team-project/${teamPathId}` : null);
      }
    } else if (targetType === 'job' || referenceTable === 'jobs') {
      const job = await lookupJob(targetId);
      headline = job?.title || 'Job';
      pushLink(links, 'Open job', targetId ? `/jobs/${targetId}/page` : null);
    } else if (targetType === 'gig' || referenceTable === 'gigs') {
      const gig = await lookupGig(targetId);
      headline = gig?.title || 'Gig';
      pushLink(links, 'Open gig', targetId ? `/gigs/services/${targetId}/page` : null);
    } else if (targetType === 'user' || referenceTable === 'accounts') {
      headline = row.target_name || row.target_handle || 'Reported account';
    }
  } catch (err) {
    console.warn('Report subject lookup skipped:', err.message);
  }

  return {
    headline,
    targetType: targetType || 'other',
    description: String(row.description || '').trim(),
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

module.exports = { buildReportSubject };
