const { pool } = require('../lib/Database');
const { recordAccountActivity } = require('./AccountActivityRepositories');

const PROJECT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function videoError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function mapListRow(row) {
  return {
    id: row.project_id,
    name: row.name,
    status: row.status,
    width: Number(row.width || 0),
    height: Number(row.height || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    memberCount: Number(row.member_count || 0),
    blockCount: Number(row.block_count || 0),
    mediaCount: Number(row.media_count || 0),
    editCount: Number(row.edit_count || 0),
    storageBytes: Number(row.storage_bytes || 0),
    owner: row.owner_account_id
      ? {
          accountId: row.owner_account_id,
          userId: row.owner_user_id,
          name: row.owner_name || 'Unknown',
          handle: row.owner_handle || null,
        }
      : null,
    moderationNote: row.moderation_note || null,
    frozenAt: row.frozen_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LIST_SQL = `
  SELECT
    p.project_id,
    p.name,
    p.status,
    p.width,
    p.height,
    p.duration_seconds,
    p.moderation_note,
    p.frozen_at,
    p.created_at,
    p.updated_at,
    owner.user_id AS owner_user_id,
    owner.account_id AS owner_account_id,
    COALESCE(oa.display_name, NULLIF(TRIM(owner.first_name || ' ' || owner.last_name), '')) AS owner_name,
    oa.handle AS owner_handle,
    (SELECT COUNT(*)::int FROM project_members pm
      WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL) AS member_count,
    (SELECT COUNT(*)::int FROM blocks b
      WHERE b.project_id = p.project_id AND b.deleted_at IS NULL) AS block_count,
    (SELECT COUNT(*)::int FROM media_assets ma
      WHERE ma.project_id = p.project_id AND ma.deleted_at IS NULL) AS media_count,
    (SELECT COUNT(*)::int FROM project_yjs_updates u
      WHERE u.project_id = p.project_id) AS edit_count,
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
`;

async function listVideoProjects({ status = 'all', search = '' } = {}) {
  const where = ['p.deleted_at IS NULL'];
  const params = [];
  const normalized = String(status || 'all').toLowerCase();
  if (normalized !== 'all') {
    params.push(normalized);
    where.push(`LOWER(p.status) = $${params.length}`);
  }
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
  const result = await pool.query(
    `${LIST_SQL}
     WHERE ${where.join(' AND ')}
     ORDER BY p.updated_at DESC
     LIMIT 200`,
    params
  );
  return result.rows.map(mapListRow);
}

async function getVideoProject(projectId) {
  if (!PROJECT_UUID.test(String(projectId || ''))) return null;
  const result = await pool.query(
    `${LIST_SQL} WHERE p.project_id = $1 AND p.deleted_at IS NULL`,
    [projectId]
  );
  const row = result.rows[0];
  if (!row) return null;

  const [members, blocks] = await Promise.all([
    pool.query(
      `SELECT pm.role, pm.joined_at,
              u.user_id, u.account_id,
              COALESCE(a.display_name, NULLIF(TRIM(u.first_name || ' ' || u.last_name), '')) AS name,
              a.handle
       FROM project_members pm
       JOIN users u ON u.user_id = pm.user_id
       LEFT JOIN accounts a ON a.account_id = u.account_id
       WHERE pm.project_id = $1 AND pm.deleted_at IS NULL
       ORDER BY CASE pm.role WHEN 'Owner' THEN 0 WHEN 'Manager' THEN 1 WHEN 'Editor' THEN 2 ELSE 3 END, pm.joined_at`,
      [projectId]
    ),
    pool.query(
      `SELECT block_id, name, resolution_width, resolution_height, frame_rate, color_space
       FROM blocks
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY name`,
      [projectId]
    ),
  ]);

  return {
    ...mapListRow(row),
    members: members.rows.map((member) => ({
      userId: member.user_id,
      accountId: member.account_id,
      name: member.name || 'Unknown',
      handle: member.handle || null,
      role: member.role,
      joinedAt: member.joined_at,
    })),
    blocks: blocks.rows.map((block) => ({
      id: block.block_id,
      name: block.name,
      width: block.resolution_width,
      height: block.resolution_height,
      frameRate: block.frame_rate,
      colorSpace: block.color_space,
    })),
  };
}

async function resolveStaffId(session) {
  const candidate = session?.staffId || session?.staff_id || null;
  if (candidate) {
    const existing = await pool.query(
      `SELECT staff_id, account_id FROM staff WHERE staff_id::text = $1 LIMIT 1`,
      [String(candidate)]
    );
    if (existing.rows.length) return existing.rows[0];
  }
  const accountId = session?.account_id || session?.accountId || null;
  if (!accountId) return null;
  const byAccount = await pool.query(
    `SELECT staff_id, account_id FROM staff WHERE account_id::text = $1 LIMIT 1`,
    [String(accountId)]
  );
  return byAccount.rows[0] || null;
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

  const staff = await resolveStaffId(session);
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
      metadata: { projectId, note: reason || null },
    });
  }

  return getVideoProject(projectId);
}

module.exports = {
  listVideoProjects,
  getVideoProject,
  setVideoProjectFreeze,
};
