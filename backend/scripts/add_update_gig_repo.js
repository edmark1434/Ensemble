const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../repositories/GigRepositories.js');
let content = fs.readFileSync(file, 'utf8');

const repoFunc = `
async function updateGigRepository(gigId, accountId, gigData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify ownership
        const gigCheck = await client.query('SELECT freelancer_account_id FROM gigs WHERE gig_id = $1', [gigId]);
        if (gigCheck.rowCount === 0) throw new Error("Gig not found");
        if (gigCheck.rows[0].freelancer_account_id !== accountId) throw new Error("Unauthorized");

        // Update base gig
        await client.query(\`
            UPDATE gigs 
            SET title = $1, description = $2, no_of_concurrent_max = $3, category = $4 
            WHERE gig_id = $5
        \`, [gigData.title, gigData.description, gigData.slots || 1, gigData.category || 'Other', gigId]);

        // Clean up relations
        await client.query('DELETE FROM gig_tiers WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_milestones WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_tags WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_requirements WHERE gig_id = $1', [gigId]);
        await client.query('DELETE FROM gig_attachments WHERE gig_id = $1', [gigId]);

        // 2. Insert Tiers
        if (gigData.tiers && gigData.tiers.length > 0) {
            const tierQuery = \`
                INSERT INTO gig_tiers (
                    gig_id, title, description, rate_credits, delivery_days, no_of_revisions_max
                ) VALUES ($1, $2, $3, $4, $5, $6)
            \`;
            for (const tier of gigData.tiers) {
                await client.query(tierQuery, [
                    gigId, tier.tierName, tier.description, tier.price, tier.daysOfDelivery, tier.revisions
                ]);
            }
        }

        // 3. Insert Milestones
        if (gigData.milestones && gigData.milestones.length > 0) {
            const msQuery = \`
                INSERT INTO gig_milestones (
                    gig_id, title, description, order_number, payout_percent
                ) VALUES ($1, $2, $3, $4, $5)
            \`;
            let orderNumber = 1;
            for (const ms of gigData.milestones) {
                await client.query(msQuery, [
                    gigId, ms.title, ms.description, orderNumber++, ms.percentage
                ]);
            }
        }

        // 4. Tags
        if (gigData.skills && gigData.skills.length > 0) {
            for (const skill of gigData.skills) {
                let tagRes = await client.query('SELECT tag_id FROM tags WHERE name = $1', [skill]);
                let tagId;
                if (tagRes.rowCount > 0) {
                    tagId = tagRes.rows[0].tag_id;
                } else {
                    const newTag = await client.query(\`INSERT INTO tags (name) VALUES ($1) RETURNING tag_id\`, [skill]);
                    tagId = newTag.rows[0].tag_id;
                }
                await client.query(\`INSERT INTO gig_tags (gig_id, tag_id) VALUES ($1, $2)\`, [gigId, tagId]);
            }
        }

        // 5. Questionnaires (Requirements)
        if (gigData.questionnaires && gigData.questionnaires.length > 0) {
            for (const q of gigData.questionnaires) {
                const reqQuery = \`
                    INSERT INTO gig_requirements (
                        gig_id, requirement_text, is_required, requirement_type, order_number
                    ) VALUES ($1, $2, $3, $4, $5) RETURNING gig_requirement_id
                \`;
                const qRes = await client.query(reqQuery, [
                    gigId, q.question, q.isRequired ? true : false, q.type || 'text', q.order || 1
                ]);
                const reqId = qRes.rows[0].gig_requirement_id;

                if (q.options && q.options.length > 0) {
                    for (const opt of q.options) {
                        await client.query(\`
                            INSERT INTO gig_requirement_choices (gig_requirement_id, name)
                            VALUES ($1, $2)
                        \`, [reqId, opt]);
                    }
                }
            }
        }

        // 6. Attachments
        let attachmentIndex = 0;
        if (gigData.thumbnailFileId) {
             await client.query('INSERT INTO gig_attachments (gig_id, file_id, index) VALUES ($1, $2, $3)', [gigId, gigData.thumbnailFileId, attachmentIndex++]);
        }
        if (gigData.galleryFileIds && gigData.galleryFileIds.length > 0) {
             for (const gId of gigData.galleryFileIds) {
                 await client.query('INSERT INTO gig_attachments (gig_id, file_id, index) VALUES ($1, $2, $3)', [gigId, gId, attachmentIndex++]);
             }
        }

        await client.query('COMMIT');
        return gigId;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("updateGigRepository error:", error);
        throw error;
    } finally {
        client.release();
    }
}
`;

content = content.replace('module.exports = {', repoFunc + '\nmodule.exports = {\n    updateGigRepository,');
fs.writeFileSync(file, content);
console.log('Added updateGigRepository');
