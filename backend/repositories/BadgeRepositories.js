const { pool } = require('../lib/Database');

async function getBadgeCatalog() {
    const { rows } = await pool.query(`
        SELECT b.badge_id, b.registry_id, b.name, b.description,
               COUNT(ab.account_id) FILTER (WHERE ab.status = 'claimed')::int AS claimed_count,
               COUNT(ab.account_id) FILTER (WHERE ab.status = 'pending')::int AS pending_count
        FROM badges b
        LEFT JOIN account_badges ab ON ab.badge_id = b.badge_id
        WHERE b.deleted_at IS NULL AND b.registry_id IS NOT NULL
        GROUP BY b.badge_id
        ORDER BY b.created_at, b.name
    `);
    return rows;
}

async function getBadgeByRegistryId(registryId) {
    const { rows } = await pool.query(
        `SELECT badge_id, registry_id, name FROM badges WHERE registry_id = $1 AND deleted_at IS NULL`,
        [registryId]
    );
    return rows[0] || null;
}

async function searchBadgeRecipients(search, registryId, limit = 20) {
    const term = String(search || '').replace(/^@/, '').trim().replace(/[\\%_]/g, '\\$&');
    const { rows } = await pool.query(`
        SELECT a.account_id, a.handle, a.display_name, f.path AS avatar_preset_url, ab.status AS badge_status
        FROM accounts a
        LEFT JOIN files f ON f.file_id = a.avatar_file_id
        LEFT JOIN badges b ON b.registry_id = $2
        LEFT JOIN account_badges ab ON ab.account_id = a.account_id AND ab.badge_id = b.badge_id
        WHERE a.type = 'User' AND a.deleted_at IS NULL
          AND ($1 = '' OR LOWER(a.handle) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
                       OR LOWER(a.display_name) LIKE '%' || LOWER($1) || '%' ESCAPE '\\')
        ORDER BY a.display_name NULLS LAST
        LIMIT $3
    `, [term, registryId || null, limit]);
    return rows;
}

async function getBadgeHolders(registryId) {
    const { rows } = await pool.query(`
        SELECT ab.account_badge_id, ab.status, ab.created_at, ab.claimed_at, ab.grant_message,
               a.account_id, a.handle, a.display_name, f.path AS avatar_preset_url
        FROM account_badges ab
        JOIN badges b ON b.badge_id = ab.badge_id
        JOIN accounts a ON a.account_id = ab.account_id
        LEFT JOIN files f ON f.file_id = a.avatar_file_id
        WHERE b.registry_id = $1 AND ab.status <> 'revoked'
        ORDER BY ab.created_at DESC
    `, [registryId]);
    return rows;
}

/**
 * Creates pending grants and their System notifications in one transaction.
 * Accounts that already hold the badge (pending or claimed) are skipped;
 * revoked grants are re-opened as pending.
 */
async function createPendingBadgeGrants({ badge, accountIds, staffId, message }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows: grants } = await client.query(`
            INSERT INTO account_badges (badge_id, account_id, status, granted_by_staff_id, grant_message, display_order)
            SELECT $1, a.account_id, 'pending', $3, $4, NULL
            FROM accounts a
            WHERE a.account_id = ANY($2::uuid[]) AND a.type = 'User' AND a.deleted_at IS NULL
            ON CONFLICT (badge_id, account_id) DO UPDATE
               SET status = 'pending', granted_by_staff_id = EXCLUDED.granted_by_staff_id,
                   grant_message = EXCLUDED.grant_message, created_at = CURRENT_TIMESTAMP,
                   claimed_at = NULL, revoked_at = NULL, display_order = NULL
               WHERE account_badges.status = 'revoked'
            RETURNING account_badge_id, account_id
        `, [badge.badge_id, accountIds, staffId || null, message || null]);

        const notifications = [];
        for (const grant of grants) {
            const text = message
                ? `You've been awarded the ${badge.name} badge: ${message}`
                : `You've been awarded the ${badge.name} badge. Claim it to show it on your profile.`;
            const { rows } = await client.query(`
                INSERT INTO notifications (message, is_read, reference_table, reference_prefix, reference_path, reference_id, account_id)
                VALUES ($1, false, 'account_badges', 'BADGE_GRANTED', '/notifications?tab=system', $2, $3)
                RETURNING *
            `, [text, grant.account_badge_id, grant.account_id]);
            notifications.push(rows[0]);
        }

        await client.query('COMMIT');
        return { grants, notifications };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function claimAccountBadge(accountId, accountBadgeId) {
    const { rows } = await pool.query(`
        UPDATE account_badges ab
        SET status = 'claimed',
            claimed_at = CURRENT_TIMESTAMP,
            display_order = CASE
                WHEN (SELECT COUNT(*) FROM account_badges x
                      WHERE x.account_id = $1 AND x.status = 'claimed' AND x.display_order IS NOT NULL) < 5
                THEN COALESCE((SELECT MAX(x.display_order) FROM account_badges x
                               WHERE x.account_id = $1 AND x.status = 'claimed'), 0) + 1
                ELSE NULL
            END
        FROM badges b
        WHERE ab.badge_id = b.badge_id
          AND ab.account_badge_id = $2
          AND ab.account_id = $1
          AND ab.status = 'pending'
        RETURNING ab.account_badge_id, ab.status, ab.claimed_at, ab.display_order, b.registry_id
    `, [accountId, accountBadgeId]);
    return rows[0] || null;
}

async function revokeAccountBadge(accountBadgeId) {
    const { rows } = await pool.query(`
        UPDATE account_badges
        SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, display_order = NULL
        WHERE account_badge_id = $1 AND status <> 'revoked'
        RETURNING account_badge_id, account_id
    `, [accountBadgeId]);
    return rows[0] || null;
}

async function hasClaimedBadge(accountId, registryId) {
    const { rows } = await pool.query(`
        SELECT 1
        FROM account_badges ab
        JOIN badges b ON b.badge_id = ab.badge_id
        WHERE ab.account_id = $1 AND b.registry_id = $2 AND ab.status = 'claimed'
        LIMIT 1
    `, [accountId, registryId]);
    return rows.length > 0;
}

async function getOwnBadgeGrants(accountId) {
    const { rows } = await pool.query(`
        SELECT ab.account_badge_id, ab.status, ab.grant_message, ab.created_at, ab.claimed_at, b.registry_id, b.name
        FROM account_badges ab
        JOIN badges b ON b.badge_id = ab.badge_id
        WHERE ab.account_id = $1 AND ab.status IN ('pending', 'claimed')
        ORDER BY ab.created_at DESC
    `, [accountId]);
    return rows;
}

module.exports = {
    getBadgeCatalog,
    getBadgeByRegistryId,
    searchBadgeRecipients,
    getBadgeHolders,
    createPendingBadgeGrants,
    claimAccountBadge,
    revokeAccountBadge,
    getOwnBadgeGrants,
    hasClaimedBadge,
};
