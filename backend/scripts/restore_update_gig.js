const fs = require('fs');
const content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

const newRepo = `
async function updateGigRepository(gigId, accountId, gigData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify ownership
        const gigCheck = await client.query('SELECT * FROM gigs WHERE gig_id = $1 AND freelancer_account_id = $2', [gigId, accountId]);
        if (gigCheck.rows.length === 0) throw new Error('Gig not found or unauthorized');

        if (gigData.termsOfService) {
            await client.query(
                'INSERT INTO terms_of_service (terms_title, terms_description, terms_type, account_id) VALUES ($1, $2, $3, $4)',
                ['Gig Custom Terms', gigData.termsOfService, 'gigs', accountId]
            );
        }

        await client.query(
            'UPDATE gigs SET title = $1, description = $2, no_of_concurrent_max = $3, category = $4 WHERE gig_id = $5',
            [gigData.title, gigData.description, gigData.slots || 1, gigData.category || 'Other', gigId]
        );

        await client.query('DELETE FROM gig_tiers WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_milestones WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_tags WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_requirements WHERE gig_id = $1', [gigId]);

        if (gigData.tiers && gigData.tiers.length > 0) {
            for (const tier of gigData.tiers) {
                await client.query(
                    'INSERT INTO gig_tiers (gig_id, title, description, rate_credits, delivery_days, no_of_revisions_max) VALUES ($1, $2, $3, $4, $5, $6)',
                    [gigId, \`\${tier.tierName} - \${tier.title}\`, tier.description, tier.price, tier.daysOfDelivery, tier.revisions]
                );
            }
        }

        if (gigData.milestones && gigData.milestones.length > 0) {
            for (const m of gigData.milestones) {
                await client.query(
                    'INSERT INTO gig_milestones (gig_id, name, description) VALUES ($1, $2, $3)',
                    [gigId, m.name, m.description]
                );
            }
        }

        if (gigData.skills && gigData.skills.length > 0) {
            for (const skill of gigData.skills) {
                let tagId;
                const tagRes = await client.query('SELECT tag_id FROM tags WHERE name = $1', [skill]);
                if (tagRes.rows.length > 0) {
                    tagId = tagRes.rows[0].tag_id;
                } else {
                    const newTag = await client.query('INSERT INTO tags (name, type) VALUES ($1, $2) RETURNING tag_id', [skill, 'skill']);
                    tagId = newTag.rows[0].tag_id;
                }
                await client.query('INSERT INTO gig_tags (gig_id, tag_id) VALUES ($1, $2)', [gigId, tagId]);
            }
        }

        if (gigData.questionnaires && gigData.questionnaires.length > 0) {
            for (const q of gigData.questionnaires) {
                const reqQuery = 'INSERT INTO gig_requirements (gig_id, type, question, is_required) VALUES ($1, $2, $3, $4) RETURNING gig_requirement_id';
                const qRes = await client.query(reqQuery, [gigId, q.type || 'text', q.question, q.isRequired ? true : false]);
                const reqId = qRes.rows[0].gig_requirement_id;

                if (q.options && q.options.length > 0) {
                    for (const opt of q.options) {
                        await client.query('INSERT INTO gig_requirement_choices (gig_requirement_id, name) VALUES ($1, $2)', [reqId, opt]);
                    }
                }
            }
        }

        if (gigData.thumbnailFileId) {
            await client.query('DELETE FROM gig_attachments WHERE gig_id = $1 AND index = 0', [gigId]);
            await client.query('INSERT INTO gig_attachments (gig_id, file_id, index) VALUES ($1, $2, 0)', [gigId, gigData.thumbnailFileId]);
        }
        
        if (gigData.galleryFileIds && gigData.galleryFileIds.length > 0) {
            await client.query('DELETE FROM gig_attachments WHERE gig_id = $1 AND index > 0', [gigId]);
            let gIndex = 1;
            for (const gId of gigData.galleryFileIds) {
                await client.query('INSERT INTO gig_attachments (gig_id, file_id, index) VALUES ($1, $2, $3)', [gigId, gId, gIndex++]);
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('updateGigRepository error:', err);
        throw err;
    } finally {
        client.release();
    }
}
`;

const exportsIndex = content.lastIndexOf('module.exports = {');
const updatedContent = content.substring(0, exportsIndex) + newRepo + '\n' + content.substring(exportsIndex).replace('module.exports = {', 'module.exports = {\n    updateGigRepository,');

fs.writeFileSync('backend/repositories/GigRepositories.js', updatedContent);
console.log('Restored updateGigRepository');
