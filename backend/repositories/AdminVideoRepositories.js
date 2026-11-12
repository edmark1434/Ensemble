const { pool } = require('../lib/Database');
const {
  recordAccountActivity,
  listActivityForReference,
} = require('./AccountActivityRepositories');
const { describeEvent } = require('../lib/ActivityCatalog');
const { resolveStaffForSession } = require('../lib/StaffSession');

const PROJECT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function videoError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * How a project reads on a staff desk:
 * `removed` is a moderator takedown, `trashed` is the owner's own delete, and
 * the stored status covers everything else (active, frozen, archived).
 */
function projectStatus(row) {
  if (row.deleted_at) return 'removed';
  if (row.trashed_at) return 'trashed';
  return row.status;
}

function mapListRow(row) {
  return {
    id: row.project_id,
    name: row.name,
    status: projectStatus(row),
    storedStatus: row.status,
    statusBeforeFreeze: row.status_before_freeze || null,
    width: Number(row.width || 0),
    height: Number(row.height || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    memberCount: Number(row.member_count || 0),
    blockCount: Number(row.block_count || 0),
    mediaCount: Number(row.media_count || 0),
    editCount: Number(row.edit_count || 0),
    commentCount: Number(row.comment_count || 0),
    storageBytes: Number(row.storage_bytes || 0),
    owner: row.owner_account_id
      ? {
          accountId: row.owner_account_id,
          userId: row.owner_user_id,
          name: row.owner_name || 'Unknown',
          handle: row.owner_handle || null,
          accountStatus: row.owner_account_status || null,
        }
      : null,
    moderationNote: row.moderation_note || null,
    frozenAt: row.frozen_at || null,
    frozenBy: row.frozen_by_staff_id
      ? {
          staffId: row.frozen_by_staff_id,
          name: row.frozen_by_name || 'Staff',
          role: row.frozen_by_role || null,
        }
      : null,
    removedAt: row.deleted_at || null,
    trashedAt: row.trashed_at || null,
    ownerDeleted: Boolean(row.trashed_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LIST_SQL = `
  SELECT
    p.project_id,
    p.name,
    p.status,
    p.status_before_freeze,
    p.width,
    p.height,
    p.duration_seconds,
    p.moderation_note,
    p.frozen_at,
    p.frozen_by_staff_id,
    p.deleted_at,
    p.trashed_at,
    p.created_at,
    p.updated_at,
    owner.user_id AS owner_user_id,
    owner.account_id AS owner_account_id,
    COALESCE(oa.display_name, NULLIF(TRIM(owner.first_name || ' ' || owner.last_name), '')) AS owner_name,
    oa.handle AS owner_handle,
    oa.status AS owner_account_status,
    COALESCE(fsa.display_name, NULLIF(TRIM(COALESCE(fs.first_name, '') || ' ' || COALESCE(fs.last_name, '')), '')) AS frozen_by_name,
    fs.role AS frozen_by_role,
    (SELECT COUNT(*)::int FROM project_members pm
      WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL) AS member_count,
    (SELECT COUNT(*)::int FROM blocks b
      WHERE b.project_id = p.project_id AND b.deleted_at IS NULL) AS block_count,
    (SELECT COUNT(*)::int FROM media_assets ma
      WHERE ma.project_id = p.project_id AND ma.deleted_at IS NULL) AS media_count,
    (SELECT COUNT(*)::int FROM project_yjs_updates u
      WHERE u.project_id = p.project_id) AS edit_count,
    (SELECT COUNT(*)::int FROM project_comments pc
      WHERE pc.project_id = p.project_id AND pc.deleted_at IS NULL) AS comment_count,
    (SELECT COALESCE(SUM(f.size_bytes), 0)::bigint
      FROM media_assets ma
      JOIN files f ON f.file_id = ma.original_file_id AND f.deleted_at IS NULL
      WHERE ma.project_id = p.project_id AND ma.deleted_at IS NULL) AS storage_bytes
  FROM projects p
  LEFT JOIN LATERAL (
    SELECT u.user_id, u.first_name, u.last_name, u.account_id
    FROM project_members pm
    JOIN users u ON u.user_id = pm.user_id
    WHERE pm.project_id = p.project_id AND pm.role = 'Owner' AND pm.deleted_at IS NULL
    LIMIT 1
  ) owner ON TRUE
  LEFT JOIN accounts oa ON oa.account_id = owner.account_id
  LEFT JOIN staff fs ON fs.staff_id = p.frozen_by_staff_id
  LEFT JOIN accounts fsa ON fsa.account_id = fs.account_id
`;

async function listVideoProjects({ status = 'all', search = '' } = {}) {
  const where = [];
  const params = [];
  const normalized = String(status || 'all').toLowerCase();
  if (normalized === 'removed') {
    where.push('p.deleted_at IS NOT NULL');
  } else if (normalized === 'trashed') {
    where.push('p.deleted_at IS NULL AND p.trashed_at IS NOT NULL');
  } else if (normalized !== 'all') {
    where.push('p.deleted_at IS NULL AND p.trashed_at IS NULL');
    params.push(normalized);
    where.push(`LOWER(p.status) = $${params.length}`);
  }
  if (!where.length) where.push('TRUE');
  const q = String(search || '').trim();
  if (q) {
    params.push(`%${q}%`);
    where.push(`(
      p.name ILIKE $${params.length}
      OR COALESCE(oa.handle, '') ILIKE $${params.length}
      OR COALESCE(oa.display_name, '') ILIKE $${params.length}
      OR COALESCE(owner.first_name || ' ' || owner.last_name, '') ILIKE $${params.length}
    )`);
  }
  const [result, stats] = await Promise.all([
    pool.query(
      `${LIST_SQL}
       WHERE ${where.join(' AND ')}
       ORDER BY p.updated_at DESC
       LIMIT 200`,
      params
    ),
    videoLibraryStats(),
  ]);
  return { projects: result.rows.map(mapListRow), stats };
}

/** Library-wide counts for the Video management header. */
async function videoLibraryStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.deleted_at IS NULL AND p.trashed_at IS NULL AND LOWER(p.status) = 'active')::int AS active,
      COUNT(*) FILTER (WHERE p.deleted_at IS NULL AND p.trashed_at IS NULL AND LOWER(p.status) = 'frozen')::int AS frozen,
      COUNT(*) FILTER (WHERE p.deleted_at IS NULL AND p.trashed_at IS NULL AND LOWER(p.status) = 'archived')::int AS archived,
      COUNT(*) FILTER (WHERE p.deleted_at IS NOT NULL)::int AS removed,
      COUNT(*) FILTER (WHERE p.deleted_at IS NULL AND p.trashed_at IS NOT NULL)::int AS trashed,
      COUNT(*) FILTER (WHERE p.updated_at >= NOW() - INTERVAL '7 days')::int AS active_last_7d,
      COALESCE(SUM(p.duration_seconds), 0)::bigint AS duration_seconds,
      (
        SELECT COALESCE(SUM(f.size_bytes), 0)::bigint
        FROM media_assets ma
        JOIN files f ON f.file_id = ma.original_file_id AND f.deleted_at IS NULL
        WHERE ma.deleted_at IS NULL AND ma.project_id IS NOT NULL
      ) AS storage_bytes
    FROM projects p
  `);
  const row = result.rows[0] || {};
  return {
    total: Number(row.total || 0),
    active: Number(row.active || 0),
    frozen: Number(row.frozen || 0),
    archived: Number(row.archived || 0),
    removed: Number(row.removed || 0),
    trashed: Number(row.trashed || 0),
    activeLast7d: Number(row.active_last_7d || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    storageBytes: Number(row.storage_bytes || 0),
  };
}

async function getVideoProject(projectId) {
  if (!PROJECT_UUID.test(String(projectId || ''))) return null;
  const result = await pool.query(
    `${LIST_SQL} WHERE p.project_id = $1`,
    [projectId]
  );
  const row = result.rows[0];
  if (!row) return null;

  const [members, blocks, media, edits, moderation] = await Promise.all([
    pool.query(
      `SELECT pm.role, pm.joined_at,
              u.user_id, u.account_id,
              COALESCE(a.display_name, NULLIF(TRIM(u.first_name || ' ' || u.last_name), '')) AS name,
              a.handle, a.status AS account_status
       FROM project_members pm
       JOIN users u ON u.user_id = pm.user_id
       LEFT JOIN accounts a ON a.account_id = u.account_id
       WHERE pm.project_id = $1 AND pm.deleted_at IS NULL
       ORDER BY CASE pm.role WHEN 'Owner' THEN 0 WHEN 'Manager' THEN 1 WHEN 'Editor' THEN 2 ELSE 3 END, pm.joined_at`,
      [projectId]
    ),
    pool.query(
      `SELECT b.block_id, b.name, b.resolution_width, b.resolution_height, b.frame_rate, b.color_space,
              (SELECT COUNT(*)::int FROM block_yjs_updates bu WHERE bu.block_id = b.block_id) AS edit_count
       FROM blocks b
       WHERE b.project_id = $1 AND b.deleted_at IS NULL
       ORDER BY b.name`,
      [projectId]
    ),
    pool.query(
      `SELECT ma.media_asset_id, ma.name, ma.type, ma.width, ma.height, ma.duration_seconds,
              ma.created_at, f.size_bytes
       FROM media_assets ma
       LEFT JOIN files f ON f.file_id = ma.original_file_id AND f.deleted_at IS NULL
       WHERE ma.project_id = $1 AND ma.deleted_at IS NULL
       ORDER BY ma.created_at DESC
       LIMIT 60`,
      [projectId]
    ),
    pool.query(
      `SELECT MAX(yu.created_at) AS last_edit_at
       FROM project_yjs_updates pyu
       JOIN yjs_updates yu ON yu.yjs_update_id = pyu.yjs_update_id
       WHERE pyu.project_id = $1`,
      [projectId]
    ),
    listActivityForReference('projects', projectId, { limit: 25 }),
  ]);

  const roster = members.rows.map((member) => ({
    userId: member.user_id,
    accountId: member.account_id,
    name: member.name || 'Unknown',
    handle: member.handle || null,
    role: member.role,
    accountStatus: member.account_status || null,
    joinedAt: member.joined_at,
  }));

  return {
    ...mapListRow(row),
    lastEditAt: edits.rows[0]?.last_edit_at || null,
    members: roster,
    memberRoles: roster.reduce((counts, member) => {
      const role = member.role || 'Member';
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {}),
    blocks: blocks.rows.map((block) => ({
      id: block.block_id,
      name: block.name,
      width: block.resolution_width,
      height: block.resolution_height,
      frameRate: block.frame_rate,
      colorSpace: block.color_space,
      editCount: Number(block.edit_count || 0),
    })),
    media: media.rows.map((asset) => ({
      id: asset.media_asset_id,
      name: asset.name,
      type: asset.type,
      width: asset.width,
      height: asset.height,
      durationSeconds: Number(asset.duration_seconds || 0),
      sizeBytes: Number(asset.size_bytes || 0),
      createdAt: asset.created_at,
    })),
    // Moderation history for this project, newest first.
    history: moderation.map((entry) => {
      const event = describeEvent(entry.eventCode);
      return {
        id: entry.id,
        action: entry.action,
        eventCode: entry.eventCode,
        eventLabel: event.eventLabel,
        severity: event.severity,
        at: entry.createdAt,
        by: entry.actorName || 'System',
        byRole: entry.actorRole || null,
        note: entry.metadata?.note || entry.metadata?.reason || null,
      };
    }),
  };
}

async function setVideoProjectFreeze(projectId, { action, note }, session) {
  if (!PROJECT_UUID.test(String(projectId || ''))) {
    throw videoError('Project not found', 404);
  }
  const verb = String(action || '').toLowerCase();
  if (verb !== 'freeze' && verb !== 'unfreeze') {
    throw videoError('Choose freeze or unfreeze');
  }
  const reason = String(note || '').trim();
  if (verb === 'freeze' && reason.length > 500) {
    throw videoError('Keep the freeze note under 500 characters');
  }

  const current = await pool.query(
    `SELECT project_id, name, status, status_before_freeze, deleted_at
     FROM projects WHERE project_id = $1`,
    [projectId]
  );
  const project = current.rows[0];
  if (!project || project.deleted_at) throw videoError('Project not found', 404);

  const staff = await resolveStaffForSession(session);
  if (verb === 'freeze') {
    if (String(project.status).toLowerCase() === 'frozen') {
      throw videoError('This project is already frozen', 409);
    }
    await pool.query(
      `UPDATE projects
       SET status_before_freeze = status,
           status = 'frozen',
           moderation_note = $2,
           frozen_at = NOW(),
           frozen_by_staff_id = $3,
           updated_at = NOW()
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId, reason || null, staff?.staff_id || null]
    );
  } else {
    if (String(project.status).toLowerCase() !== 'frozen') {
      throw videoError('This project is not frozen', 409);
    }
    const restore = project.status_before_freeze || 'active';
    await pool.query(
      `UPDATE projects
       SET status = $2,
           status_before_freeze = NULL,
           moderation_note = NULL,
           frozen_at = NULL,
           frozen_by_staff_id = NULL,
           updated_at = NOW()
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId, restore]
    );
  }

  const owner = await pool.query(
    `SELECT u.account_id
     FROM project_members pm
     JOIN users u ON u.user_id = pm.user_id
     WHERE pm.project_id = $1 AND pm.role = 'Owner' AND pm.deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );
  if (owner.rows[0]?.account_id) {
    await recordAccountActivity({
      accountId: owner.rows[0].account_id,
      action: verb === 'freeze'
        ? `Froze video project “${project.name}”`
        : `Unfroze video project “${project.name}”`,
      eventCode: verb === 'freeze' ? 'VIDEO_PROJECT_FROZEN' : 'VIDEO_PROJECT_UNFROZEN',
      referenceTable: 'projects',
      referencePrefix: 'PROJECT',
      referenceId: projectId,
      actorStaffId: staff?.staff_id || null,
      actorAccountId: staff?.account_id || session?.account_id || session?.accountId || null,
      metadata: {
        projectId,
        projectName: project.name,
        previousStatus: project.status,
        status: verb === 'freeze' ? 'frozen' : project.status_before_freeze || 'active',
        note: reason || null,
      },
    });
  }

  return getVideoProject(projectId);
}

async function setVideoProjectRemoval(projectId, action, session, { note = '' } = {}) {
  if (!PROJECT_UUID.test(String(projectId || ''))) {
    throw videoError('Project not found', 404);
  }
  const verb = String(action || '').toLowerCase();
  if (verb !== 'remove' && verb !== 'restore') {
    throw videoError('Choose remove or restore');
  }
  const reason = String(note || '').trim();
  if (reason.length > 500) throw videoError('Keep the note under 500 characters');
  const current = await pool.query(
    `SELECT project_id, name, status, deleted_at, trashed_at FROM projects WHERE project_id = $1`,
    [projectId]
  );
  const project = current.rows[0];
  if (!project) throw videoError('Project not found', 404);
  if (verb === 'restore' && project.trashed_at) throw videoError('Owner-deleted projects cannot be restored from moderation', 409);
  if (verb === 'remove' && project.deleted_at) throw videoError('This project is already removed', 409);
  if (verb === 'restore' && !project.deleted_at) throw videoError('This project is not removed', 409);

  await pool.query(
    `UPDATE projects
     SET deleted_at = $2,
         moderation_note = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE moderation_note END,
         updated_at = NOW()
     WHERE project_id = $1`,
    [projectId, verb === 'remove' ? new Date() : null, reason || null]
  );

  const staff = await resolveStaffForSession(session);
  const owner = await pool.query(
    `SELECT u.account_id
     FROM project_members pm
     JOIN users u ON u.user_id = pm.user_id
     WHERE pm.project_id = $1 AND pm.role = 'Owner' AND pm.deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );
  if (owner.rows[0]?.account_id) {
    await recordAccountActivity({
      accountId: owner.rows[0].account_id,
      action: verb === 'remove'
        ? `Removed video project “${project.name}” from the library`
        : `Restored video project “${project.name}”`,
      eventCode: verb === 'remove' ? 'VIDEO_PROJECT_REMOVED' : 'VIDEO_PROJECT_RESTORED',
      referenceTable: 'projects',
      referencePrefix: 'PROJECT',
      referenceId: projectId,
      actorStaffId: staff?.staff_id || null,
      actorAccountId: staff?.account_id || session?.account_id || session?.accountId || null,
      metadata: {
        projectId,
        projectName: project.name,
        previousStatus: project.status,
        status: verb === 'remove' ? 'removed' : project.status,
        reason: reason || null,
      },
    });
  }
  return getVideoProject(projectId);
}

module.exports = {
  listVideoProjects,
  getVideoProject,
  setVideoProjectFreeze,
  setVideoProjectRemoval,
};
