// backend/repositories/GigRepositories.js
const { pool } = require('../lib/Database');

async function createGigRepository(gigData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 0. Insert Terms of Service if provided
        let termsId = null;
        if (gigData.termsOfService) {
            const tosRes = await client.query(
                `INSERT INTO terms_of_service (terms_title, terms_description, terms_type, account_id)
                 VALUES ($1, $2, $3, $4) RETURNING terms_id`,
                ['Gig Custom Terms', gigData.termsOfService, 'gigs', gigData.freelancer_account_id]
            );
            termsId = tosRes.rows[0].terms_id;
        }

        // 1. Insert base gig
        const gigQuery = `
            INSERT INTO gigs (
                freelancer_account_id, title, description, payment_type, no_of_concurrent_max, status, terms_id, first_draft_delivery, additional_work_rate, category
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            ) RETURNING gig_id;
        `;
        const gigValues = [
            gigData.freelancer_account_id, 
            gigData.title, 
            gigData.description, 
            'milestone', 
            gigData.slots || 1, 
            'active',
            termsId,
            gigData.firstDraftDelivery || '',
            gigData.additionalWorkRate || 50,
            gigData.category || 'Other'
        ];
        const res = await client.query(gigQuery, gigValues);
        const gigId = res.rows[0].gig_id;

        // 2. Insert Tiers
        if (gigData.tiers && gigData.tiers.length > 0) {
            const tierQuery = `
                INSERT INTO gig_tiers (
                    gig_id, title, description, rate_credits, delivery_days, no_of_revisions_max
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `;
            for (const tier of gigData.tiers) {
                const tierTitle = `${tier.tierName} - ${tier.title}`;
                await client.query(tierQuery, [
                    gigId, 
                    tierTitle, 
                    tier.description || '', 
                    Number(tier.price) || 0, 
                    Number(tier.daysOfDelivery) || 1, 
                    Number(tier.revisions) || 0
                ]);
            }
        }

        // 3. Insert Milestones
        if (gigData.milestones && gigData.milestones.length > 0) {
            const msQuery = `
                INSERT INTO gig_milestones (
                    gig_id, index, name, description
                ) VALUES ($1, $2, $3, $4)
            `;
            for (let i = 0; i < gigData.milestones.length; i++) {
                const ms = gigData.milestones[i];
                await client.query(msQuery, [
                    gigId, i, ms.name || '', ms.description || ''
                ]);
            }
        }

        // 4. Insert Skills (Tags)
        if (gigData.skills && gigData.skills.length > 0) {
            const tagQuery = `
                INSERT INTO gig_tags (gig_id, tag_id)
                VALUES ($1, $2)
            `;
            for (const tagId of gigData.skills) {
                // Ignore if tagId is not a valid UUID format (if frontend sends a mock string)
                if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tagId)) {
                    await client.query(tagQuery, [gigId, tagId]);
                }
            }
        }
        
        // 5. Insert Requirements (Questionnaires)
        if (gigData.questionnaires && gigData.questionnaires.length > 0) {
            const reqQuery = `
                INSERT INTO gig_requirements (
                    gig_id, type, question, is_required
                ) VALUES ($1, $2, $3, $4) RETURNING gig_requirement_id;
            `;
            for (let i = 0; i < gigData.questionnaires.length; i++) {
                const q = gigData.questionnaires[i];
                let type = 'free_text';
                if (q.type === 'Multiple Choice') type = 'multiple_choice';
                if (q.type === 'Attachment') type = 'attachment';
                
                const reqRes = await client.query(reqQuery, [
                    gigId, type, q.question, q.isRequired
                ]);
                
                const reqId = reqRes.rows[0].gig_requirement_id;
                
                if (type === 'multiple_choice' && q.options) {
                    const choiceQuery = `
                        INSERT INTO gig_requirement_choices (gig_requirement_id, name)
                        VALUES ($1, $2)
                    `;
                    for (let j = 0; j < q.options.length; j++) {
                        await client.query(choiceQuery, [reqId, q.options[j]]);
                    }
                }
            }
        }

        // 6. Insert Attachments (Thumbnails/Gallery)
        if (gigData.thumbnailFileId) {
            const attQuery = `
                INSERT INTO gig_attachments (gig_id, file_id, index)
                VALUES ($1, $2, $3)
            `;
            await client.query(attQuery, [gigId, gigData.thumbnailFileId, 0]); // index 0 implies thumbnail conventionally if needed
        }
        
        if (gigData.galleryFileIds && gigData.galleryFileIds.length > 0) {
            const attQuery = `
                INSERT INTO gig_attachments (gig_id, file_id, index)
                VALUES ($1, $2, $3)
            `;
            for (let i = 0; i < gigData.galleryFileIds.length; i++) {
                // start index at 1 for gallery
                await client.query(attQuery, [gigId, gigData.galleryFileIds[i], i + 1]);
            }
        }

        await client.query('COMMIT');
        return gigId;
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error creating gig transaction:", e);
        throw e;
    } finally {
        client.release();
    }
}

async function getAllGigsRepository(filters) {
    // For now, fetch base gig details with a basic summary.
    // To match the frontend, we need: id, postedBy, title, description, category, slots, thumbnail, postedAt, clientRating, etc.
    const query = `
        SELECT 
            g.gig_id as id,
            g.title,
            g.description,
            g.category as category,
            g.no_of_concurrent_max as slots,
            g.created_at as "postedAt",
            g.first_draft_delivery,
            g.additional_work_rate,
            tos.terms_description as terms_of_service,
            a.display_name as "postedBy",
            (SELECT path FROM files WHERE file_id = a.avatar_file_id) as "clientAvatar",
            (SELECT f.path FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id AND ga.index = 0 LIMIT 1) as thumbnail,
            (SELECT json_agg(f.path) FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id) as gallery,
            (SELECT json_agg(t.name) FROM gig_tags gt JOIN tags t ON gt.tag_id = t.tag_id WHERE gt.gig_id = g.gig_id) as skills,
            (SELECT json_agg(json_build_object(
                'tierName', split_part(gt.title, ' - ', 1),
                'title', split_part(gt.title, ' - ', 2),
                'description', gt.description,
                'price', gt.rate_credits,
                'daysOfDelivery', gt.delivery_days,
                'revisions', gt.no_of_revisions_max
            )) FROM gig_tiers gt WHERE gt.gig_id = g.gig_id) as tiers,
            (SELECT json_agg(json_build_object('name', gm.name, 'description', gm.description)) FROM gig_milestones gm WHERE gm.gig_id = g.gig_id) as milestones
        FROM gigs g
        JOIN accounts a ON g.freelancer_account_id = a.account_id
        LEFT JOIN terms_of_service tos ON g.terms_id = tos.terms_id
        WHERE g.status = 'active'
        ORDER BY g.created_at DESC
    `;
    const res = await pool.query(query);
    
    // Map to frontend interface Gig
    return res.rows.map(row => {
        return {
            id: row.id,
            postedBy: row.postedBy || 'Unknown',
            clientAvatar: row.clientAvatar || 'https://i.pravatar.cc/150',
            title: row.title,
            description: row.description,
            category: row.category,
            slots: row.slots,
            termsOfService: row.terms_of_service || '',
            skills: row.skills || [],
            firstDraftDelivery: row.first_draft_delivery || '',
            thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
            gallery: row.gallery && row.gallery.length ? row.gallery : [row.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'],
            milestones: row.milestones || [],
            tiers: row.tiers || [],
            additionalWorkRate: row.additional_work_rate || 50,
            questionnaires: [],
            postedAt: row.postedAt,
            timeAgo: 'Just now',
            clientRating: 5.0,
            ratingCount: 0,
            isSaved: false,
            isOwnGig: false
        };
    });
}

module.exports = {
    createGigRepository,
    getAllGigsRepository
};
