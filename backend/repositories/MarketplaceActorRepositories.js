const { pool } = require('../lib/Database');

async function getAuthorizedTeamActor(teamId, personalAccountId) {
    const result = await pool.query(
        `SELECT t.team_id,
                t.account_id,
                a.display_name,
                a.handle,
                a.status AS account_status,
                tm.role,
                tm.status AS membership_status,
                COALESCE(v.is_verified, FALSE) AS is_verified
         FROM teams t
         JOIN accounts a ON a.account_id = t.account_id
         JOIN users u ON u.account_id = $2
         JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = u.user_id
         LEFT JOIN verifications v ON v.account_id = t.account_id
         WHERE t.team_id = $1
           AND t.deleted_at IS NULL
           AND a.deleted_at IS NULL
         LIMIT 1`,
        [teamId, personalAccountId]
    );
    return result.rows[0] || null;
}

async function listAuthorizedActors(personalAccountId) {
    const result = await pool.query(
        `SELECT a.account_id,
                NULL::uuid AS team_id,
                a.display_name,
                a.handle,
                a.type,
                'Self'::text AS role,
                COALESCE(v.is_verified, FALSE) AS is_verified
         FROM accounts a
         LEFT JOIN verifications v ON v.account_id = a.account_id
         WHERE a.account_id = $1 AND a.deleted_at IS NULL
         UNION ALL
         SELECT ta.account_id,
                t.team_id,
                ta.display_name,
                ta.handle,
                ta.type,
                tm.role::text,
                COALESCE(tv.is_verified, FALSE) AS is_verified
         FROM teams t
         JOIN accounts ta ON ta.account_id = t.account_id
         JOIN users u ON u.account_id = $1
         JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = u.user_id
         LEFT JOIN verifications tv ON tv.account_id = ta.account_id
         WHERE t.deleted_at IS NULL
           AND ta.deleted_at IS NULL
           AND tm.status = 'Active'
           AND tm.role IN ('Owner', 'Admin')
         ORDER BY team_id NULLS FIRST, display_name`,
        [personalAccountId]
    );
    return result.rows;
}

async function getAuthorizedActorAccountIds(personalAccountId) {
    const actors = await listAuthorizedActors(personalAccountId);
    return actors.map((actor) => actor.account_id);
}

module.exports = {
    getAuthorizedTeamActor,
    listAuthorizedActors,
    getAuthorizedActorAccountIds,
};
