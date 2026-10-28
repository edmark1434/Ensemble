const { pool } = require('../lib/Database');
const {
    NAMED_REQUIREMENTS,
    EXISTING_BADGE_REQUIREMENTS,
} = require('../lib/BadgeRequirements');

const CATALOG_SELECT = `
        SELECT b.badge_id, b.registry_id, b.name, b.description, b.is_secret,
               b.trigger_event_code, b.condition_type, b.condition_value,
               b.badge_category_id, b.created_at, b.updated_at, b.deleted_at,
               bc.name AS category_name, bc.description AS category_description,
               COALESCE((
                   SELECT json_agg(json_build_object(
                            'requirement_def_id', br.requirement_def_id,
                            'code', COALESCE(d.metric, br.code),
                            'metric', COALESCE(d.metric, br.code),
                            'name', COALESCE(d.name, br.code),
                            'slug', d.slug,
                            'operator', COALESCE(br.operator, d.operator, 'gte'),
                            'threshold', COALESCE(br.threshold, d.threshold, 1),
                            'description', COALESCE(d.description, '')
                          ) ORDER BY br.sort_order, COALESCE(d.name, br.code))
                   FROM badge_requirements br
                   LEFT JOIN badge_requirement_defs d
                     ON d.requirement_def_id = br.requirement_def_id
                    AND d.deleted_at IS NULL
                   WHERE br.badge_id = b.badge_id
               ), '[]'::json) AS requirements,
               COUNT(ab.account_id) FILTER (WHERE ab.status = 'claimed')::int AS claimed_count,
               COUNT(ab.account_id) FILTER (WHERE ab.status = 'pending')::int AS pending_count
        FROM badges b
        JOIN badge_categories bc ON bc.badge_category_id = b.badge_category_id
        LEFT JOIN account_badges ab ON ab.badge_id = b.badge_id
`

async function getBadgeCatalog() {
    const { rows } = await pool.query(`
        ${CATALOG_SELECT}
        WHERE b.deleted_at IS NULL AND b.registry_id IS NOT NULL
        GROUP BY b.badge_id, bc.name, bc.description
        ORDER BY b.created_at, b.name
    `);
    return rows;
}

async function getBadgeCatalogItem(badgeId) {
    const { rows } = await pool.query(`
        ${CATALOG_SELECT}
        WHERE b.badge_id = $1
        GROUP BY b.badge_id, bc.name, bc.description
    `, [badgeId]);
    return rows[0] || null;
}

async function getBadgeCategories() {
    const { rows } = await pool.query(`
        SELECT badge_category_id, name, description, created_at, updated_at
        FROM badge_categories
        WHERE deleted_at IS NULL
        ORDER BY name
    `);
    return rows;
}

async function createBadgeCategory({ name, description }) {
    const { rows } = await pool.query(`
        INSERT INTO badge_categories (name, description)
        VALUES ($1, $2)
        RETURNING badge_category_id, name, description, created_at, updated_at
    `, [name, description]);
    return rows[0];
}

async function getCategoryById(categoryId) {
    const { rows } = await pool.query(
        `SELECT badge_category_id, name FROM badge_categories WHERE badge_category_id = $1 AND deleted_at IS NULL`,
        [categoryId]
    );
    return rows[0] || null;
}

async function createBadge({
    registryId,
    name,
    description,
    isSecret,
    triggerEventCode,
    conditionType,
    conditionValue,
    categoryId,
}) {
    const { rows } = await pool.query(`
        INSERT INTO badges (
            registry_id, name, description, is_secret,
            trigger_event_code, condition_type, condition_value, badge_category_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (registry_id) DO UPDATE
           SET name = EXCLUDED.name,
               description = EXCLUDED.description,
               is_secret = EXCLUDED.is_secret,
               trigger_event_code = EXCLUDED.trigger_event_code,
               condition_type = EXCLUDED.condition_type,
               condition_value = EXCLUDED.condition_value,
               badge_category_id = EXCLUDED.badge_category_id,
               deleted_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE badges.deleted_at IS NOT NULL
        RETURNING badge_id
    `, [registryId, name, description, isSecret, triggerEventCode, conditionType, conditionValue, categoryId]);
    return rows[0] || null;
}

async function updateBadge(badgeId, fields) {
    const assignments = [];
    const values = [];
    let index = 1;

    for (const [column, value] of Object.entries(fields)) {
        assignments.push(`${column} = $${index}`);
        values.push(value);
        index += 1;
    }
    if (!assignments.length) return getBadgeCatalogItem(badgeId);

    assignments.push('updated_at = CURRENT_TIMESTAMP');
    values.push(badgeId);

    const { rows } = await pool.query(`
        UPDATE badges
        SET ${assignments.join(', ')}
        WHERE badge_id = $${index} AND deleted_at IS NULL
        RETURNING badge_id
    `, values);
    return rows[0] ? getBadgeCatalogItem(rows[0].badge_id) : null;
}

async function replaceBadgeRequirements(badgeId, requirements) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM badge_requirements WHERE badge_id = $1', [badgeId]);
        for (let i = 0; i < requirements.length; i += 1) {
            const requirement = requirements[i];
            await client.query(
                `INSERT INTO badge_requirements
                    (badge_id, code, threshold, sort_order, requirement_def_id, operator)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    badgeId,
                    requirement.code,
                    requirement.threshold,
                    i,
                    requirement.requirementDefId,
                    requirement.operator || 'gte',
                ]
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

const DEF_SELECT = `
        SELECT d.requirement_def_id, d.slug, d.name, d.description, d.metric,
               d.operator, d.threshold, d.is_system, d.created_at, d.updated_at,
               COUNT(br.badge_requirement_id)::int AS attached_count
        FROM badge_requirement_defs d
        LEFT JOIN badge_requirements br ON br.requirement_def_id = d.requirement_def_id
`;

async function listRequirementDefs() {
    const { rows } = await pool.query(`
        ${DEF_SELECT}
        WHERE d.deleted_at IS NULL
        GROUP BY d.requirement_def_id
        ORDER BY d.is_system DESC, d.name
    `);
    return rows;
}

async function getRequirementDef(defId) {
    const { rows } = await pool.query(`
        ${DEF_SELECT}
        WHERE d.requirement_def_id = $1 AND d.deleted_at IS NULL
        GROUP BY d.requirement_def_id
    `, [defId]);
    return rows[0] || null;
}

async function findRequirementDefBySlug(slug) {
    const { rows } = await pool.query(`
        ${DEF_SELECT}
        WHERE d.slug = $1 AND d.deleted_at IS NULL
        GROUP BY d.requirement_def_id
    `, [slug]);
    return rows[0] || null;
}

async function findRequirementDefByShape({ metric, operator, threshold }) {
    const { rows } = await pool.query(`
        ${DEF_SELECT}
        WHERE d.metric = $1 AND d.operator = $2 AND d.threshold = $3 AND d.deleted_at IS NULL
        GROUP BY d.requirement_def_id
        ORDER BY d.is_system DESC, d.created_at
        LIMIT 1
    `, [metric, operator, threshold]);
    return rows[0] || null;
}

async function createRequirementDef({ slug, name, description, metric, operator, threshold, isSystem = false }) {
    const { rows } = await pool.query(`
        INSERT INTO badge_requirement_defs
            (slug, name, description, metric, operator, threshold, is_system)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING requirement_def_id, slug, name, description, metric, operator,
                  threshold, is_system, created_at, updated_at
    `, [slug, name, description || '', metric, operator, threshold, Boolean(isSystem)]);
    return rows[0] ? { ...rows[0], attached_count: 0 } : null;
}

async function updateRequirementDef(defId, fields) {
    const assignments = [];
    const values = [];
    let index = 1;
    for (const [column, value] of Object.entries(fields)) {
        assignments.push(`${column} = $${index}`);
        values.push(value);
        index += 1;
    }
    if (!assignments.length) return getRequirementDef(defId);
    assignments.push('updated_at = CURRENT_TIMESTAMP');
    values.push(defId);
    const { rows } = await pool.query(`
        UPDATE badge_requirement_defs
        SET ${assignments.join(', ')}
        WHERE requirement_def_id = $${index} AND deleted_at IS NULL
        RETURNING requirement_def_id
    `, values);
    return rows[0] ? getRequirementDef(rows[0].requirement_def_id) : null;
}

async function softDeleteRequirementDef(defId) {
    const { rows } = await pool.query(`
        UPDATE badge_requirement_defs
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE requirement_def_id = $1
          AND deleted_at IS NULL
          AND is_system = false
          AND NOT EXISTS (
            SELECT 1 FROM badge_requirements br WHERE br.requirement_def_id = $1
          )
        RETURNING requirement_def_id
    `, [defId]);
    return rows[0] || null;
}

async function seedRequirementLibraryAndAttach() {
    for (const def of NAMED_REQUIREMENTS) {
        await pool.query(`
            INSERT INTO badge_requirement_defs
                (slug, name, description, metric, operator, threshold, is_system)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (slug) DO UPDATE
               SET name = EXCLUDED.name,
                   description = EXCLUDED.description,
                   metric = EXCLUDED.metric,
                   operator = EXCLUDED.operator,
                   threshold = EXCLUDED.threshold,
                   is_system = true,
                   deleted_at = NULL,
                   updated_at = CURRENT_TIMESTAMP
        `, [def.slug, def.name, def.description || '', def.metric, def.operator, def.threshold]);
    }

    for (const [registryId, slugs] of Object.entries(EXISTING_BADGE_REQUIREMENTS)) {
        const { rows: badgeRows } = await pool.query(
            `SELECT badge_id FROM badges WHERE registry_id = $1 AND deleted_at IS NULL`,
            [registryId]
        );
        const badge = badgeRows[0];
        if (!badge) continue;

        const requirements = [];
        for (const slug of slugs) {
            const { rows: defRows } = await pool.query(
                `SELECT requirement_def_id, metric, operator, threshold
                 FROM badge_requirement_defs
                 WHERE slug = $1 AND deleted_at IS NULL`,
                [slug]
            );
            if (defRows[0]) {
                requirements.push({
                    requirementDefId: defRows[0].requirement_def_id,
                    code: defRows[0].metric,
                    operator: defRows[0].operator,
                    threshold: defRows[0].threshold,
                });
            }
        }
        await replaceBadgeRequirements(badge.badge_id, requirements);
    }
}

async function listHeldBadgeIds(accountId) {
    const { rows } = await pool.query(
        `SELECT badge_id FROM account_badges
         WHERE account_id = $1 AND status IN ('pending', 'claimed')`,
        [accountId]
    );
    return rows.map((row) => row.badge_id);
}

async function getAccountBadgeProgress(accountId) {
    const { rows } = await pool.query(
        `
        SELECT
          (
            SELECT COUNT(DISTINCT c.contract_id)::int
            FROM contracts c
            LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
            LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
            LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
            LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
            LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
            LEFT JOIN gigs g ON g.gig_id = gt.gig_id
            WHERE LOWER(c.status) = 'completed'
              AND (p.freelancer_account_id = $1 OR g.freelancer_account_id = $1)
          ) AS freelance_close,
          (
            SELECT COUNT(DISTINCT c.contract_id)::int
            FROM contracts c
            LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
            LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
            LEFT JOIN jobs j ON j.job_id = p.job_id
            LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
            LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
            WHERE LOWER(c.status) = 'completed'
              AND (j.client_account_id = $1 OR gr.client_account_id = $1)
          ) AS client_close,
          (
            SELECT COUNT(DISTINCT c.contract_id)::int
            FROM contracts c
            JOIN job_contracts jc ON jc.contract_id = c.contract_id
            JOIN proposals p ON p.proposal_id = jc.proposal_id
            WHERE LOWER(c.status) = 'completed' AND p.freelancer_account_id = $1
          ) AS job_close_freelancer,
          (
            SELECT COUNT(DISTINCT c.contract_id)::int
            FROM contracts c
            JOIN job_contracts jc ON jc.contract_id = c.contract_id
            JOIN proposals p ON p.proposal_id = jc.proposal_id
            JOIN jobs j ON j.job_id = p.job_id
            WHERE LOWER(c.status) = 'completed' AND j.client_account_id = $1
          ) AS job_close_client,
          (
            SELECT COUNT(*)::int FROM jobs
            WHERE client_account_id = $1 AND deleted_at IS NULL
          ) AS jobs_posted,
          (
            SELECT COUNT(*)::int FROM proposals
            WHERE freelancer_account_id = $1 AND deleted_at IS NULL
          ) AS proposals_sent,
          (
            SELECT COUNT(DISTINCT c.contract_id)::int
            FROM contracts c
            JOIN gig_contracts gc ON gc.contract_id = c.contract_id
            JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
            JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
            JOIN gigs g ON g.gig_id = gt.gig_id
            WHERE LOWER(c.status) = 'completed' AND g.freelancer_account_id = $1
          ) AS gig_close_freelancer,
          (
            SELECT COUNT(DISTINCT c.contract_id)::int
            FROM contracts c
            JOIN gig_contracts gc ON gc.contract_id = c.contract_id
            JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
            WHERE LOWER(c.status) = 'completed' AND gr.client_account_id = $1
          ) AS gig_close_client,
          (
            SELECT COUNT(*)::int FROM gigs
            WHERE freelancer_account_id = $1 AND deleted_at IS NULL
          ) AS gigs_listed,
          (
            SELECT COUNT(DISTINCT ma.market_asset_id)::int
            FROM market_assets ma
            JOIN LATERAL (
              SELECT media.owner_user_id
              FROM market_media_assets link
              JOIN media_assets media ON media.media_asset_id = link.media_asset_id
              WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
              UNION ALL
              SELECT media.owner_user_id
              FROM market_asset_thumbnails link
              JOIN media_assets media ON media.media_asset_id = link.media_asset_id
              WHERE link.market_asset_id = ma.market_asset_id AND media.deleted_at IS NULL
              LIMIT 1
            ) listing_owner ON TRUE
            JOIN users owner_user ON owner_user.user_id = listing_owner.owner_user_id
            WHERE owner_user.account_id = $1
              AND ma.status = 'published'
              AND ma.deleted_at IS NULL
          ) AS asset_published,
          (
            SELECT COUNT(*)::int
            FROM market_asset_licenses mal
            JOIN users u ON u.user_id = mal.buyer_user_id
            WHERE u.account_id = $1 AND mal.status = 'active' AND mal.deleted_at IS NULL
          ) AS assets_purchased,
          (
            SELECT COUNT(*)::int FROM ratings WHERE account_id = $1
          ) AS reviews_received,
          (
            SELECT COUNT(*)::int FROM account_followers WHERE followed_id = $1
          ) AS followers,
          (
            SELECT COUNT(*)::int FROM user_galleries WHERE account_id = $1
          ) AS portfolio_items,
          (
            SELECT COUNT(*)::int
            FROM user_tags ut
            JOIN users u ON u.user_id = ut.user_id
            WHERE u.account_id = $1
          ) AS skills_added,
          (
            SELECT CASE WHEN
              a.avatar_file_id IS NOT NULL
              AND NULLIF(BTRIM(COALESCE(a.tagline, '')), '') IS NOT NULL
              AND NULLIF(BTRIM(COALESCE(a.description, '')), '') IS NOT NULL
              AND NULLIF(BTRIM(COALESCE(a.introduction, '')), '') IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM user_tags ut
                JOIN users u ON u.user_id = ut.user_id
                WHERE u.account_id = a.account_id
              )
              AND EXISTS (SELECT 1 FROM user_galleries g WHERE g.account_id = a.account_id)
            THEN 1 ELSE 0 END
            FROM accounts a
            WHERE a.account_id = $1
          ) AS profile_complete
        `,
        [accountId]
    );
    return rows[0] || {};
}

async function softDeleteBadge(badgeId) {
    const { rows } = await pool.query(`
        UPDATE badges
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE badge_id = $1 AND deleted_at IS NULL
        RETURNING badge_id, registry_id
    `, [badgeId]);
    return rows[0] || null;
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
    getBadgeCatalogItem,
    getBadgeCategories,
    createBadgeCategory,
    getCategoryById,
    createBadge,
    updateBadge,
    replaceBadgeRequirements,
    listRequirementDefs,
    getRequirementDef,
    findRequirementDefBySlug,
    findRequirementDefByShape,
    createRequirementDef,
    updateRequirementDef,
    softDeleteRequirementDef,
    seedRequirementLibraryAndAttach,
    listHeldBadgeIds,
    getAccountBadgeProgress,
    softDeleteBadge,
    getBadgeByRegistryId,
    searchBadgeRecipients,
    getBadgeHolders,
    createPendingBadgeGrants,
    claimAccountBadge,
    revokeAccountBadge,
    getOwnBadgeGrants,
    hasClaimedBadge,
};
