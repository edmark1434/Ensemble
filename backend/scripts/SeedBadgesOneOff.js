require('dotenv').config();
const { pool } = require('../lib/Database');

async function seedBadgesNow() {
    console.log('Seeding badges...');
    const catsRes = await pool.query('SELECT * FROM badge_categories');
    const cats = catsRes.rows;
    if (!cats.length) {
        console.log('No categories, aborting.');
        process.exit(1);
    }

    const badgeDefs = [
        ['acc-alpha', 'Alpha Tester', 'Granted to core ecosystem pioneers who tested the platform during its early alpha stages.', 'alpha_access', 'boolean', 1, cats[0].badge_category_id],
        ['acc-beta', 'Beta Tester', 'Granted to core ecosystem pioneers who tested the platform during its early beta stages.', 'beta_access', 'boolean', 1, cats[0].badge_category_id],
        ['acc-fresh', 'Fresh Freelancer', 'Granted to users who have newly started becoming a freelancer on this platform.', 'freelancer_gig', 'count', 1, cats[0].badge_category_id],
        ['acc-rising', 'Rising Freelancer', 'Granted to active freelancers establishing a consistent workspace pipeline.', 'freelancer_gig', 'count', 10, cats[0].badge_category_id],
        ['acc-elite', 'Elite Freelancer', 'Granted to platform veterans completing a massive volume of workflow cycles.', 'freelancer_gig', 'count', 50, cats[0].badge_category_id],
        ['acc-client-fresh', 'Fresh Client', 'Granted to clients executing their first verified payout to a freelancer.', 'client_payout', 'count', 1, cats[0].badge_category_id],
        ['acc-client-rising', 'Rising Client', 'Granted to consistent clients sustaining platform liquidity via regular payouts.', 'client_payout', 'count', 10, cats[0].badge_category_id],
        ['acc-client-elite', 'Elite Client', 'Granted to high-volume ecosystem backers powering massive platform workflow.', 'client_payout', 'count', 50, cats[0].badge_category_id],
        ['acc-investor-1', 'Early Backer', 'Awarded to users who provided early structural investments into platform features.', 'investment', 'count', 1, cats[0].badge_category_id],
        ['acc-investor-2', 'Venture Catalyst', 'Awarded to users heavily sustaining project development via significant capital injection.', 'investment', 'count', 10, cats[0].badge_category_id],
        ['acc-community-1', 'Helpful Hand', 'Awarded to users providing consistent resolution logic in the community boards.', 'forum_solution', 'count', 10, cats[0].badge_category_id],
        ['acc-asset-1', 'Asset Contributor', 'Granted to creators publishing their first global structural asset.', 'asset_published', 'count', 1, cats[0].badge_category_id],
        ['acc-asset-2', 'Rising Creator', 'Granted to active architects expanding the ecosystem asset library.', 'asset_published', 'count', 10, cats[0].badge_category_id],
        ['acc-asset-3', 'Elite Creator', 'Granted to top-tier library authors crafting high-fidelity design standards.', 'asset_published', 'count', 50, cats[0].badge_category_id],
        ['acc-asset-4', 'Grand Creator', 'Legendary library architect setting the structural baseline style across the global market.', 'asset_published', 'count', 100, cats[0].badge_category_id],
    ];

    for (const b of badgeDefs) {
        await pool.query(
            `INSERT INTO badges (
                registry_id, name, description, is_secret, trigger_event_code, condition_type, condition_value, badge_category_id
            ) VALUES ($1,$2,$3,false,$4,$5,$6,$7)
            ON CONFLICT (registry_id) DO UPDATE SET 
                name = EXCLUDED.name, 
                description = EXCLUDED.description`,
            b
        );
    }
    console.log('Badges inserted/updated.');

    // Grant alpha to all existing accounts
    console.log('Granting alpha to existing accounts...');
    const accounts = await pool.query('SELECT account_id FROM accounts');
    const alphaBadge = await pool.query("SELECT badge_id FROM badges WHERE registry_id = 'acc-alpha'");
    if (alphaBadge.rows.length > 0) {
        const badgeId = alphaBadge.rows[0].badge_id;
        for (const row of accounts.rows) {
            await pool.query(
                'INSERT INTO account_badges (account_id, badge_id, display_order) VALUES ($1, $2, 1) ON CONFLICT DO NOTHING',
                [row.account_id, badgeId]
            );
        }
    }
    
    console.log('Done.');
    process.exit(0);
}

seedBadgesNow().catch(console.error);
