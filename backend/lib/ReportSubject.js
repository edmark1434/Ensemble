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

/** A contract with the job or gig it came from and both parties, for Jobs & Gigs reports. */
async function lookupContract(contractId) {
  if (!contractId) return null;
  const result = await pool.query(
    `
    SELECT c.contract_id, c.contract_type, c.payment_type, c.rate_credits, c.status, c.starts_at,
           j.job_id, j.title AS job_title, j.client_account_id AS job_client_id,
           pr.freelancer_account_id AS job_freelancer_id,
           g.gig_id, g.title AS gig_title, g.freelancer_account_id AS gig_freelancer_id,
           gr.client_account_id AS gig_client_id
    FROM contracts c
    LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
    LEFT JOIN proposals pr ON pr.proposal_id = jc.proposal_id
    LEFT JOIN jobs j ON j.job_id = pr.job_id
    LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
    LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
    LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
    LEFT JOIN gigs g ON g.gig_id = gt.gig_id
    WHERE c.contract_id::text = $1
    LIMIT 1
    `,
    [String(contractId)]
  );
  return result.rows[0] || null;
}

/** A job proposal (also reported as an "application"), with the job it was sent to. */
async function lookupProposal(proposalId) {
  if (!proposalId) return null;
  const result = await pool.query(
    `
    SELECT pr.proposal_id, pr.letter, pr.rate_credits, pr.status, pr.deleted_at,
           pr.freelancer_account_id, j.job_id, j.title AS job_title
    FROM proposals pr
    LEFT JOIN jobs j ON j.job_id = pr.job_id
    WHERE pr.proposal_id::text = $1
    LIMIT 1
    `,
    [String(proposalId)]
  );
  return result.rows[0] || null;
}

/** A contract rating ("feedback" target): the review text and what it was left on. */
async function lookupRating(ratingId) {
  if (!ratingId) return null;
  const result = await pool.query(
    `
    SELECT r.rating_id, r.stars_out_of_five, r.feedback, r.deleted_at, r.contract_id, r.account_id
    FROM ratings r
    WHERE r.rating_id::text = $1
    LIMIT 1
    `,
    [String(ratingId)]
  );
  return result.rows[0] || null;
}

function pushContractLinks(links, contract) {
  if (contract?.job_id) pushLink(links, 'Open job', `/jobs/${contract.job_id}/page`);
  if (contract?.gig_id) pushLink(links, 'Open gig', `/gigs/services/${contract.gig_id}/page`);
  const client = contract?.job_client_id || contract?.gig_client_id;
  const freelancer = contract?.job_freelancer_id || contract?.gig_freelancer_id;
  if (client) pushLink(links, 'Open client', profileLink(client));
  if (freelancer) pushLink(links, 'Open freelancer', profileLink(freelancer));
}

function contractSummary(contract) {
  return [
    `${String(contract.contract_type || 'contract').replace(/_/g, ' ')} contract`,
    `${Number(contract.rate_credits || 0).toLocaleString()} credits`,
    contract.payment_type,
    `status ${contract.status}`,
    contract.starts_at ? `starts ${new Date(contract.starts_at).toISOString().slice(0, 10)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function lookupAsset(assetId) {
  if (!assetId) return null;
  const result = await pool.query(
    `SELECT market_asset_id, name, description, status, deleted_at
     FROM market_assets WHERE market_asset_id::text = $1 LIMIT 1`,
    [String(assetId)]
  );
  return result.rows[0] || null;
}

/** The newest catalog listing for a market asset (what staff delist or re-review). */
async function lookupListingForAsset(marketAssetId) {
  if (!marketAssetId) return null;
  const result = await pool.query(
    `SELECT listing_id, listing_number, title, category, price_credits, status, market_asset_id
     FROM marketplace_listings
     WHERE market_asset_id::text = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [String(marketAssetId)]
  );
  return result.rows[0] || null;
}

/**
 * Catalog context for an asset, listing or purchase report: the listing staff can act on and
 * the state of the asset behind it. Null when nothing in the catalog matches.
 */
function marketplaceContext({ asset = null, listing = null, purchase = null } = {}) {
  if (!asset && !listing && !purchase) return null;
  return {
    assetId: asset?.market_asset_id || listing?.market_asset_id || purchase?.market_asset_id || null,
    assetName: asset?.name || purchase?.asset_name || listing?.title || null,
    assetStatus: asset?.status || null,
    assetRemoved: Boolean(asset?.deleted_at),
    listingId: listing?.listing_id ?? null,
    listingNumber: listing?.listing_number || null,
    listingStatus: listing?.status || null,
    category: listing?.category || null,
    priceCredits: listing ? Number(listing.price_credits || 0) : null,
    purchase: purchase
      ? {
          licenseId: purchase.market_asset_license_id,
          status: purchase.status || null,
          priceCredits: Number(purchase.price_credits || 0),
          purchasedAt: purchase.purchased_at || null,
        }
      : null,
  };
}

async function lookupListing(listingId) {
  if (!listingId) return null;
  const result = await pool.query(
    `SELECT listing_id, listing_number, title, description, category, price_credits, status,
            market_asset_id
     FROM marketplace_listings
     WHERE listing_id::text = $1 OR listing_number = $1
     LIMIT 1`,
    [String(listingId)]
  );
  return result.rows[0] || null;
}

async function lookupPurchase(licenseId) {
  if (!licenseId) return null;
  const result = await pool.query(
    `SELECT l.market_asset_license_id, l.market_asset_id, l.price_credits, l.status,
            l.purchased_at, l.deleted_at, a.name AS asset_name, a.description AS asset_description
     FROM market_asset_licenses l
     LEFT JOIN market_assets a ON a.market_asset_id = l.market_asset_id
     WHERE l.market_asset_license_id::text = $1
     LIMIT 1`,
    [String(licenseId)]
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
  let marketplace = null;

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
      const listing = await lookupListingForAsset(asset?.market_asset_id || targetId);
      marketplace = marketplaceContext({ asset, listing });
      if (asset && !asset.deleted_at) {
        available = true;
        headline = asset.name || headline;
        previewBody = previewBody || previewText(asset.description);
        pushLink(links, 'Open market asset', `/assets/${targetId}`);
      }
    } else if (targetType === 'listing' || referenceTable === 'marketplace_listings') {
      const listing = await lookupListing(targetId || referenceId);
      const asset = listing?.market_asset_id ? await lookupAsset(listing.market_asset_id) : null;
      marketplace = marketplaceContext({ asset, listing });
      if (listing) {
        available = true;
        headline = listing.title || headline;
        previewBody =
          previewBody ||
          [
            listing.listing_number,
            listing.category || 'Uncategorized',
            `${Number(listing.price_credits || 0)} credits`,
            `status ${listing.status}`,
          ].join(' · ');
        if (listing.market_asset_id) {
          pushLink(links, 'Open market asset', `/assets/${listing.market_asset_id}`);
        }
      }
    } else if (targetType === 'purchase' || targetType === 'order' || referenceTable === 'market_asset_licenses') {
      const purchase = await lookupPurchase(targetId || referenceId);
      const listing = purchase?.market_asset_id ? await lookupListingForAsset(purchase.market_asset_id) : null;
      marketplace = marketplaceContext({ listing, purchase });
      if (purchase && !purchase.deleted_at) {
        available = true;
        headline = purchase.asset_name ? `Purchase of ${purchase.asset_name}` : headline;
        previewBody =
          previewBody ||
          `${Number(purchase.price_credits || 0)} credits · ${purchase.status} · purchased ${
            purchase.purchased_at ? new Date(purchase.purchased_at).toISOString().slice(0, 10) : 'unknown'
          }`;
        if (purchase.market_asset_id) {
          pushLink(links, 'Open market asset', `/assets/${purchase.market_asset_id}`);
        }
      }
    } else if (targetType === 'seller' || targetType === 'marketplace') {
      headline = snapshot?.title || row.target_name || row.target_handle || 'Reported seller';
      available = Boolean(accountId);
    } else if (targetType === 'job' || targetType === 'jobs' || referenceTable === 'jobs') {
      const job = await lookupJob(targetId || referenceId);
      if (job) {
        headline = job.title || headline;
        previewBody = previewBody || previewText(job.description);
        if (!job.deleted_at) {
          available = true;
          pushLink(links, 'Open job', `/jobs/${job.job_id}/page`);
        } else {
          previewBody = `[Archived by staff] ${previewBody || ''}`.trim();
        }
      }
    } else if (targetType === 'gig' || targetType === 'gigs' || referenceTable === 'gigs') {
      const gig = await lookupGig(targetId || referenceId);
      if (gig) {
        headline = gig.title || headline;
        previewBody = previewBody || previewText(gig.description);
        if (!gig.deleted_at) {
          available = true;
          pushLink(links, 'Open gig', `/gigs/services/${gig.gig_id}/page`);
        } else {
          previewBody = `[Archived by staff] ${previewBody || ''}`.trim();
        }
      }
    } else if (targetType === 'contract' || referenceTable === 'contracts') {
      const contract = await lookupContract(targetId || referenceId);
      if (contract) {
        available = true;
        const related = contract.job_title || contract.gig_title;
        headline = related ? `Contract for ${related}` : snapshot?.title || 'Reported contract';
        previewBody = previewBody || contractSummary(contract);
        pushContractLinks(links, contract);
      }
    } else if (
      targetType === 'proposal' ||
      targetType === 'application' ||
      referenceTable === 'proposals'
    ) {
      const proposal = await lookupProposal(targetId || referenceId);
      if (proposal) {
        available = !proposal.deleted_at;
        headline = proposal.job_title ? `Proposal on ${proposal.job_title}` : snapshot?.title || 'Reported proposal';
        previewBody =
          previewBody ||
          [
            `${Number(proposal.rate_credits || 0).toLocaleString()} credits · status ${proposal.status}`,
            previewText(proposal.letter, 1500),
          ]
            .filter(Boolean)
            .join('\n\n');
        if (proposal.job_id) pushLink(links, 'Open job', `/jobs/${proposal.job_id}/page`);
        pushLink(links, 'Open freelancer', profileLink(proposal.freelancer_account_id));
      }
    } else if (targetType === 'feedback' || referenceTable === 'ratings') {
      const rating = await lookupRating(targetId || referenceId);
      if (rating) {
        available = !rating.deleted_at;
        const contract = await lookupContract(rating.contract_id).catch(() => null);
        const related = contract?.job_title || contract?.gig_title;
        headline = related
          ? `${rating.stars_out_of_five}★ review on ${related}`
          : snapshot?.title || `${rating.stars_out_of_five}★ review`;
        previewBody = previewBody || previewText(rating.feedback);
        pushLink(links, 'Open reviewer', profileLink(rating.account_id));
        if (contract) pushContractLinks(links, contract);
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

  let staffRole = null;
  if (accountId) {
    const staff = await pool.query(
      `SELECT role FROM staff WHERE account_id::text = $1 LIMIT 1`,
      [String(accountId)]
    );
    staffRole = staff.rows[0]?.role || null;
  }

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
    marketplace,
    reportedAccount: accountId
      ? {
          accountId: String(accountId),
          name: row.target_name || 'Account',
          handle: row.target_handle || null,
          path: profileLink(accountId),
          staffRole,
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
