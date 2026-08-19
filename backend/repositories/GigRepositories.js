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

        // 1. Insert base gig with 'Open' status
        const gigQuery = `
            INSERT INTO gigs (
                freelancer_account_id, title, description, payment_type, no_of_concurrent_max, status, category
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            ) RETURNING gig_id;
        `;
        const gigValues = [
            gigData.freelancer_account_id,
            gigData.title,
            gigData.description,
            'milestone',
            gigData.slots || 1,
            'Open',
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
            const gigTagQuery = `
                INSERT INTO gig_tags (gig_id, tag_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `;
            for (const skill of gigData.skills) {
                if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(skill)) {
                    await client.query(gigTagQuery, [gigId, skill]);
                } else {
                    let tagId = null;
                    const exist = await client.query(`SELECT tag_id FROM tags WHERE name = $1 LIMIT 1`, [skill]);
                    if (exist.rows.length > 0) {
                        tagId = exist.rows[0].tag_id;
                    } else {
                        const newTag = await client.query(`INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`, [skill]);
                        tagId = newTag.rows[0].tag_id;
                    }
                    if (tagId) {
                        await client.query(gigTagQuery, [gigId, tagId]);
                    }
                }
            }
        }

        // 5. Insert Requirements (Questionnaires)
        if (gigData.questionnaires && gigData.questionnaires.length > 0) {
            const reqQuery = `
                INSERT INTO gig_requirements (
                    gig_id, type, question, is_required, multiple_answer, file_limit, file_types
                ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING gig_requirement_id;
            `;
            for (let i = 0; i < gigData.questionnaires.length; i++) {
                const q = gigData.questionnaires[i];
                let type = 'text';
                if (q.type === 'Multiple Choice' || q.type === 'choice' || q.type === 'multiple-choice' || q.type === 'multiple_choice') type = 'choice';
                if (q.type === 'Attachment' || q.type === 'file' || q.type === 'file-upload' || q.type === 'attachment') type = 'file';

                const reqRes = await client.query(reqQuery, [
                    gigId,
                    type,
                    q.question,
                    q.isRequired ? true : false,
                    q.multipleAnswer || false,
                    q.fileLimit || null,
                    JSON.stringify(q.fileTypes || [])
                ]);

                const reqId = reqRes.rows[0].gig_requirement_id;

                if ((type === 'choice' || type === 'multiple_choice') && q.options && q.options.length > 0) {
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
            await client.query(attQuery, [gigId, gigData.thumbnailFileId, 0]);
        }

        if (gigData.galleryFileIds && gigData.galleryFileIds.length > 0) {
            const attQuery = `
                INSERT INTO gig_attachments (gig_id, file_id, index)
                VALUES ($1, $2, $3)
            `;
            for (let i = 0; i < gigData.galleryFileIds.length; i++) {
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

async function getAllGigsRepository(filters, accountId = null) {
    let query = `
        SELECT 
            g.gig_id as id,
            g.title,
            g.description,
            g.category as category,
            CASE 
                WHEN LOWER(g.status) = 'active' THEN 'Open'
                WHEN LOWER(g.status) = 'paused' THEN 'Closed'
                ELSE g.status
            END as status,
            g.no_of_concurrent_max as slots,
            g.created_at as "postedAt",
            g.freelancer_account_id,
            a.display_name as "postedBy",
            (SELECT path FROM files WHERE file_id = a.avatar_file_id) as "clientAvatar",
            (SELECT f.path FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id AND ga.index = 0 LIMIT 1) as thumbnail,
            (SELECT json_agg(f.path) FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id) as gallery,
            (SELECT terms_description FROM terms_of_service WHERE account_id = g.freelancer_account_id AND terms_type = 'gigs' ORDER BY created_at DESC LIMIT 1) as "termsOfService",
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
            ${accountId ? `, (SELECT COUNT(*) FROM gig_saves gs WHERE gs.gig_id = g.gig_id AND gs.account_id = $1) > 0 as "isSaved"` : `, false as "isSaved"`},
            (SELECT COUNT(*) FROM gig_saves gs WHERE gs.gig_id = g.gig_id) as "savesCount",
            (SELECT COUNT(*) FROM gig_requests gr JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id WHERE gt.gig_id = g.gig_id) as "ordersCount"
        FROM gigs g
        JOIN accounts a ON g.freelancer_account_id = a.account_id
        WHERE LOWER(g.status) != 'archived' AND LOWER(g.status) != 'deleted'
        ORDER BY g.created_at DESC
    `;
    const res = accountId ? await pool.query(query, [accountId]) : await pool.query(query);

    return res.rows.map(row => {
        const cleanArray = (arr) => (arr && arr[0] !== null) ? arr : [];
        const cleanTiers = cleanArray(row.tiers);
        return {
            id: row.id,
            postedBy: row.postedBy || 'Unknown',
            clientAvatar: row.clientAvatar || 'https://i.pravatar.cc/150',
            title: row.title,
            description: row.description,
            category: row.category,
            status: row.status || 'Open',
            slots: row.slots,
            termsOfService: row.termsOfService || '',
            terms_of_service: row.termsOfService || '',
            skills: cleanArray(row.skills),
            firstDraftDelivery: cleanTiers.length > 0 ? (cleanTiers[0].daysOfDelivery == 1 ? '1 Day' : `${cleanTiers[0].daysOfDelivery} Days`) : '1 Day',
            thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
            gallery: cleanArray(row.gallery).length ? cleanArray(row.gallery) : [row.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'],
            milestones: cleanArray(row.milestones),
            tiers: cleanTiers,
            additionalWorkRate: 50,
            questionnaires: [],
            postedAt: row.postedAt,
            timeAgo: 'Just now',
            clientRating: 5.0,
            ratingCount: 0,
            isSaved: row.isSaved,
            isOwnGig: accountId ? row.freelancer_account_id === accountId : false,
            savesCount: parseInt(row.savesCount || 0, 10),
            ordersCount: parseInt(row.ordersCount || 0, 10),
            freelancerAccountId: row.freelancer_account_id,
        };
    });
}

async function toggleGigSaveRepository(gigId, accountId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const checkRes = await client.query('SELECT 1 FROM gig_saves WHERE gig_id = $1 AND account_id = $2', [gigId, accountId]);

        if (checkRes.rows.length > 0) {
            await client.query('DELETE FROM gig_saves WHERE gig_id = $1 AND account_id = $2', [gigId, accountId]);
            await client.query('COMMIT');
            return { saved: false };
        } else {
            await client.query('INSERT INTO gig_saves (gig_id, account_id) VALUES ($1, $2)', [gigId, accountId]);
            await client.query('COMMIT');
            return { saved: true };
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in toggleGigSaveRepository:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getSavedGigsRepository(accountId) {
    const query = `
        SELECT 
            g.gig_id as id, g.title, g.description, g.category as category,
            CASE 
                WHEN LOWER(g.status) = 'active' THEN 'Open'
                WHEN LOWER(g.status) = 'paused' THEN 'Closed'
                ELSE g.status
            END as status,
            g.no_of_concurrent_max as slots,
            g.created_at as "postedAt", a.display_name as "postedBy",
            (SELECT path FROM files WHERE file_id = a.avatar_file_id) as "clientAvatar",
            (SELECT f.path FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id AND ga.index = 0 LIMIT 1) as thumbnail,
            (SELECT json_agg(f.path) FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id) as gallery,
            (SELECT terms_description FROM terms_of_service WHERE account_id = g.freelancer_account_id AND terms_type = 'gigs' ORDER BY created_at DESC LIMIT 1) as "termsOfService",
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
        JOIN gig_saves gs ON gs.gig_id = g.gig_id
        WHERE gs.account_id = $1 AND LOWER(g.status) != 'archived' AND LOWER(g.status) != 'deleted'
        ORDER BY gs.created_at DESC
    `;
    const res = await pool.query(query, [accountId]);
    return res.rows.map(row => {
        const cleanArray = (arr) => (arr && arr[0] !== null) ? arr : [];
        const cleanTiers = cleanArray(row.tiers);
        return {
            id: row.id,
            postedBy: row.postedBy || 'Unknown',
            clientAvatar: row.clientAvatar || 'https://i.pravatar.cc/150',
            title: row.title,
            description: row.description,
            category: row.category,
            status: row.status || 'Open',
            slots: row.slots,
            termsOfService: row.termsOfService || '',
            terms_of_service: row.termsOfService || '',
            skills: cleanArray(row.skills),
            firstDraftDelivery: cleanTiers.length > 0 ? (cleanTiers[0].daysOfDelivery == 1 ? '1 Day' : `${cleanTiers[0].daysOfDelivery} Days`) : '1 Day',
            thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
            gallery: cleanArray(row.gallery).length ? cleanArray(row.gallery) : [row.thumbnail],
            milestones: cleanArray(row.milestones),
            tiers: cleanTiers,
            postedAt: row.postedAt,
            isSaved: true
        };
    });
}

async function submitGigOrderRepository(accountId, gigId, orderData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const requestQuery = `
            INSERT INTO gig_requests (client_account_id, gig_tier_id, project_brief, status)
            VALUES ($1, $2, $3, $4) RETURNING gig_request_id
        `;
        const requestValues = [accountId, orderData.tierId, orderData.projectBrief, 'Pending'];
        const requestRes = await client.query(requestQuery, requestValues);
        const requestId = requestRes.rows[0].gig_request_id;

        if (orderData.responses && orderData.responses.length > 0) {
            const responseQuery = `
                INSERT INTO gig_responses (gig_request_id, gig_requirement_id, response)
                VALUES ($1, $2, $3)
            `;
            for (const resp of orderData.responses) {
                await client.query(responseQuery, [requestId, resp.requirementId, resp.response]);
            }
        }

        await client.query('COMMIT');
        return requestId;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in submitGigOrderRepository:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getIncomingOrdersRepository(accountId) {
    const query = `
        SELECT 
            r.gig_request_id as id, r.status, r.created_at, r.project_brief,
            g.gig_id, g.title as gig_title,
            a.display_name as client_name, a.handle as client_handle,
            (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as client_avatar,
            gt.title as tier_title, gt.rate_credits as price, gt.delivery_days
        FROM gig_requests r
        JOIN gig_tiers gt ON r.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
        JOIN accounts a ON r.client_account_id = a.account_id
        WHERE g.freelancer_account_id = $1
        ORDER BY r.created_at DESC
    `;
    const res = await pool.query(query, [accountId]);
    return res.rows;
}

async function getMyOrdersRepository(accountId) {
    const query = `
        SELECT 
            r.gig_request_id as id, r.status, r.created_at, r.project_brief,
            g.gig_id, g.title as gig_title,
            a.display_name as freelancer_name, a.handle as freelancer_handle,
            (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as freelancer_avatar,
            gt.title as tier_title, gt.rate_credits as price, gt.delivery_days
        FROM gig_requests r
        JOIN gig_tiers gt ON r.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
        JOIN accounts a ON g.freelancer_account_id = a.account_id
        WHERE r.client_account_id = $1
        ORDER BY r.created_at DESC
    `;
    const res = await pool.query(query, [accountId]);
    return res.rows;
}

async function getGigByIdRepository(gigId, accountId = null) {
    const query = `
        SELECT 
            g.gig_id as id, g.title, g.description, g.category as category,
            CASE 
                WHEN LOWER(g.status) = 'active' THEN 'Open'
                WHEN LOWER(g.status) = 'paused' THEN 'Closed'
                ELSE g.status
            END as status,
            g.no_of_concurrent_max as slots,
            g.created_at as "postedAt", a.display_name as "postedBy",
            g.freelancer_account_id,
            (SELECT path FROM files WHERE file_id = a.avatar_file_id) as "clientAvatar",
            (SELECT f.path FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id AND ga.index = 0 LIMIT 1) as thumbnail,
            (SELECT json_agg(f.path) FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id AND ga.index > 0) as gallery,
            (SELECT terms_description FROM terms_of_service WHERE account_id = g.freelancer_account_id AND terms_type = 'gigs' ORDER BY created_at DESC LIMIT 1) as "termsOfService",
            (SELECT json_agg(t.name) FROM gig_tags gt JOIN tags t ON gt.tag_id = t.tag_id WHERE gt.gig_id = g.gig_id) as skills,
            (SELECT json_agg(json_build_object(
                'tierId', gt.gig_tier_id,
                'tierName', split_part(gt.title, ' - ', 1),
                'title', split_part(gt.title, ' - ', 2),
                'description', gt.description,
                'price', gt.rate_credits,
                'daysOfDelivery', gt.delivery_days,
                'revisions', gt.no_of_revisions_max
            )) FROM gig_tiers gt WHERE gt.gig_id = g.gig_id) as tiers,
            (SELECT json_agg(json_build_object('name', gm.name, 'description', gm.description)) FROM gig_milestones gm WHERE gm.gig_id = g.gig_id) as milestones,
            (SELECT json_agg(json_build_object(
                'id', gr.gig_requirement_id,
                'type', gr.type,
                'question', gr.question,
                'isRequired', gr.is_required,
                'multipleAnswer', gr.multiple_answer,
                'fileLimit', gr.file_limit,
                'fileTypes', gr.file_types,
                'options', (SELECT json_agg(grc.name) FROM gig_requirement_choices grc WHERE grc.gig_requirement_id = gr.gig_requirement_id)
            )) FROM gig_requirements gr WHERE gr.gig_id = g.gig_id) as questionnaires,
            CASE WHEN $2::uuid IS NOT NULL THEN (SELECT EXISTS(SELECT 1 FROM gig_saves gs WHERE gs.gig_id = g.gig_id AND gs.account_id = $2)) ELSE FALSE END as "isSaved",
            CASE WHEN $2::uuid IS NOT NULL THEN g.freelancer_account_id = $2 ELSE FALSE END as "isOwnGig",
            (SELECT COUNT(*) FROM gig_saves gs WHERE gs.gig_id = g.gig_id) as "savesCount",
            (SELECT COUNT(*) FROM gig_requests gr JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id WHERE gt.gig_id = g.gig_id) as "ordersCount"
        FROM gigs g
        JOIN accounts a ON g.freelancer_account_id = a.account_id
        WHERE g.gig_id = $1 AND LOWER(g.status) != 'archived' AND LOWER(g.status) != 'deleted'
    `;
    const res = await pool.query(query, [gigId, accountId]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const cleanArray = (arr) => (arr && arr[0] !== null) ? arr : [];
    const cleanTiers = cleanArray(row.tiers);

    return {
        id: row.id,
        postedBy: row.postedBy || 'Unknown',
        clientAvatar: row.clientAvatar || 'https://i.pravatar.cc/150',
        title: row.title,
        description: row.description,
        category: row.category,
        status: row.status || 'Open',
        slots: row.slots,
        termsOfService: row.termsOfService || '',
        terms_of_service: row.termsOfService || '',
        firstDraftDelivery: cleanTiers.length > 0
            ? (cleanTiers[0].daysOfDelivery == 1 ? '1 Day' : `${cleanTiers[0].daysOfDelivery} Days`)
            : '1 Day',
        skills: cleanArray(row.skills),
        thumbnail: row.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
        gallery: cleanArray(row.gallery).length ? cleanArray(row.gallery) : [row.thumbnail],
        milestones: cleanArray(row.milestones),
        tiers: cleanTiers,
        questionnaires: cleanArray(row.questionnaires),
        postedAt: row.postedAt,
        isSaved: row.isSaved,
        isOwnGig: row.isOwnGig,
        savesCount: parseInt(row.savesCount || 0, 10),
        ordersCount: parseInt(row.ordersCount || 0, 10),
        freelancerAccountId: row.freelancer_account_id
    };
}

async function updateGigRepository(gigId, accountId, gigData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

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
        await client.query('DELETE FROM gig_requirement_choices WHERE gig_requirement_id IN (SELECT gig_requirement_id FROM gig_requirements WHERE gig_id = $1)', [gigId]);
        await client.query('DELETE FROM gig_requirements WHERE gig_id = $1', [gigId]);

        if (gigData.tiers && gigData.tiers.length > 0) {
            for (const tier of gigData.tiers) {
                await client.query(
                    'INSERT INTO gig_tiers (gig_id, title, description, rate_credits, delivery_days, no_of_revisions_max) VALUES ($1, $2, $3, $4, $5, $6)',
                    [gigId, `${tier.tierName} - ${tier.title}`, tier.description, tier.price, tier.daysOfDelivery, tier.revisions]
                );
            }
        }

        if (gigData.milestones && gigData.milestones.length > 0) {
            for (let i = 0; i < gigData.milestones.length; i++) {
                const m = gigData.milestones[i];
                await client.query(
                    'INSERT INTO gig_milestones (gig_id, index, name, description) VALUES ($1, $2, $3, $4)',
                    [gigId, i, m.name, m.description]
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
                    const newTag = await client.query('INSERT INTO tags (name) VALUES ($1) RETURNING tag_id', [skill]);
                    tagId = newTag.rows[0].tag_id;
                }
                await client.query('INSERT INTO gig_tags (gig_id, tag_id) VALUES ($1, $2)', [gigId, tagId]);
            }
        }

        if (gigData.questionnaires && gigData.questionnaires.length > 0) {
            for (const q of gigData.questionnaires) {
                const reqQuery = 'INSERT INTO gig_requirements (gig_id, type, question, is_required, multiple_answer, file_limit, file_types) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING gig_requirement_id';
                let qType = 'text';
                if (q.type === 'Multiple Choice' || q.type === 'choice' || q.type === 'multiple-choice' || q.type === 'multiple_choice') qType = 'choice';
                if (q.type === 'Attachment' || q.type === 'file' || q.type === 'file-upload' || q.type === 'attachment') qType = 'file';
                const qRes = await client.query(reqQuery, [gigId, qType, q.question, q.isRequired ? true : false, q.multipleAnswer || false, q.fileLimit || null, JSON.stringify(q.fileTypes || [])]);
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

async function deleteGigRepository(gigId, accountId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(
            `UPDATE gigs 
             SET status = 'archived' 
             WHERE gig_id = $1 AND freelancer_account_id = $2 
             RETURNING gig_id`,
            [gigId, accountId]
        );

        if (res.rows.length === 0) {
            throw new Error('Gig not found or unauthorized to delete');
        }

        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in deleteGigRepository:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    updateGigRepository,
    createGigRepository,
    getAllGigsRepository,
    toggleGigSaveRepository,
    getSavedGigsRepository,
    submitGigOrderRepository,
    getIncomingOrdersRepository,
    getMyOrdersRepository,
    getGigByIdRepository,
    deleteGigRepository
};