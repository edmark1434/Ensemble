const { pool } = require('../lib/Database');
const { lazyCollection } = require('../lib/MongoDb');
const TeamInbox = lazyCollection('inbox');

async function createTeam(data, ownerUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = (await client.query(`INSERT INTO accounts (display_name, handle, type, tagline, description, status, avatar_file_id) VALUES ($1,$2,'Team',$3,$4,'Active',$5) RETURNING account_id, display_name, handle, type, tagline, description, status, avatar_file_id, created_at, deleted_at`, [data.name, data.handle, data.tagline || null, data.description || null, data.avatarFileId || null])).rows[0];
    const team = (await client.query(`INSERT INTO teams (account_id, join_code, visibility, join_policy, category, website, location) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [account.account_id, data.joinCode, data.visibility, data.joinPolicy, data.category || null, data.website || null, data.location || null])).rows[0];
    await client.query(`INSERT INTO team_members (team_id,user_id,role,status) VALUES ($1,$2,'Owner','Active')`, [team.team_id, ownerUserId]);
    await client.query('COMMIT');
    return { ...team, ...account };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function getUserId(accountId) { return (await pool.query('SELECT user_id FROM users WHERE account_id=$1', [accountId])).rows[0]?.user_id || null; }
async function isAccountVerified(accountId) {
  if (!accountId) return false;
  const res = await pool.query(
    `SELECT COALESCE(v.is_verified, FALSE)
        AND (avs.expires_at IS NULL OR avs.expires_at > NOW()) AS is_verified
     FROM accounts a
     LEFT JOIN verifications v ON v.account_id = a.account_id
     LEFT JOIN verification_sessions avs ON avs.verification_session_id = v.verification_session_id
     WHERE a.account_id = $1 AND a.deleted_at IS NULL
     LIMIT 1`,
    [accountId]
  );
  return Boolean(res.rows[0]?.is_verified);
}
async function isActiveTeamOwner(teamAccountId, requesterAccountId) {
  return Boolean((await pool.query(`SELECT 1 FROM teams t
    JOIN users u ON u.account_id=$2
    JOIN team_members tm ON tm.team_id=t.team_id AND tm.user_id=u.user_id
    WHERE t.account_id=$1 AND t.deleted_at IS NULL
      AND tm.role='Owner' AND tm.status='Active' LIMIT 1`,
    [teamAccountId,requesterAccountId])).rowCount);
}
async function getTeamOwnerVerificationEligibility(teamAccountId, requesterAccountId) {
  return (await pool.query(`SELECT
      TRUE AS is_owner,
      COALESCE(v.is_verified,FALSE)
        AND (avs.expires_at IS NULL OR avs.expires_at > NOW()) AS is_verified
    FROM teams t
    JOIN users u ON u.account_id=$2
    JOIN team_members tm ON tm.team_id=t.team_id AND tm.user_id=u.user_id
    LEFT JOIN verifications v ON v.account_id=u.account_id
    LEFT JOIN verification_sessions avs
      ON avs.verification_session_id=v.verification_session_id
    WHERE t.account_id=$1 AND t.deleted_at IS NULL
      AND tm.role='Owner' AND tm.status='Active'
    LIMIT 1`, [teamAccountId,requesterAccountId])).rows[0] || {
      is_owner: false,
      is_verified: false,
    };
}
async function getActiveTeamOwnerAccountIds(teamAccountId) {
  return (await pool.query(`SELECT u.account_id FROM teams t
    JOIN team_members tm ON tm.team_id=t.team_id
    JOIN users u ON u.user_id=tm.user_id
    WHERE t.account_id=$1 AND t.deleted_at IS NULL
      AND tm.role='Owner' AND tm.status='Active'`,
    [teamAccountId])).rows.map((row) => row.account_id);
}
async function getTeam(teamId, accountId) {
  return (await pool.query(`SELECT t.*,a.display_name,a.handle,a.tagline,a.description,a.status AS account_status,f.path AS avatar_path, a.banner_preset,
    COALESCE(mc.member_count,0)::int member_count,tm.role current_user_role,tm.status current_user_status,
    COALESCE(v.is_verified,FALSE) is_business_verified,v.verified_at business_verified_at,
    COALESCE(cv.is_verified,FALSE)
      AND (cvs.expires_at IS NULL OR cvs.expires_at > NOW()) current_user_is_verified,
    avs.verification_status business_verification_status,
    o.display_name owner_name,o.handle owner_handle
    FROM teams t JOIN accounts a ON a.account_id=t.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id=t.account_id
    LEFT JOIN verification_sessions avs ON avs.verification_session_id=v.verification_session_id
    LEFT JOIN users cu ON cu.account_id=$2
    LEFT JOIN verifications cv ON cv.account_id=cu.account_id
    LEFT JOIN verification_sessions cvs ON cvs.verification_session_id=cv.verification_session_id
    LEFT JOIN team_members tm ON tm.team_id=t.team_id AND tm.user_id=cu.user_id
    LEFT JOIN (SELECT team_id,count(*) member_count FROM team_members WHERE status='Active' GROUP BY team_id) mc ON mc.team_id=t.team_id
    LEFT JOIN team_members om ON om.team_id=t.team_id AND om.role='Owner' AND om.status='Active' LEFT JOIN users ou ON ou.user_id=om.user_id LEFT JOIN accounts o ON o.account_id=ou.account_id
    WHERE t.team_id=$1 AND t.deleted_at IS NULL`, [teamId, accountId])).rows[0] || null;
}
async function listTeams(accountId, q='', mine=false, limit=20, offset=0, category='') {
  return (await pool.query(`SELECT t.team_id,t.account_id,t.category,t.visibility,
    COALESCE(t.team_type, 'standard') AS team_type,
    t.job_id,
    t.gig_id,
    t.location,
    t.website,
    t.join_policy,
    CASE WHEN t.gig_id IS NOT NULL THEN 'Gig' ELSE 'Job' END AS workspace_type,
    COALESCE(t.is_archived, FALSE) AS is_archived,
    a.display_name,a.handle,a.tagline,a.description,f.path avatar_path, a.banner_preset,
    COALESCE(v.is_verified,FALSE) AS is_business_verified,
    count(am.user_id) FILTER (WHERE am.status='Active')::int member_count, mine.role current_user_role,mine.status current_user_status,
    COALESCE((
      SELECT ROUND(AVG(score)::numeric, 1)
      FROM (
        SELECT tr.rating::numeric AS score FROM team_reviews tr WHERE tr.team_id = t.team_id
        UNION ALL
        SELECT r.stars_out_of_five::numeric AS score FROM ratings r WHERE r.account_id = t.account_id
      ) all_scores
    ), 0) AS average_rating,
    COALESCE((
      SELECT COUNT(*)::int
      FROM (
        SELECT tr.team_review_id FROM team_reviews tr WHERE tr.team_id = t.team_id
        UNION ALL
        SELECT r.rating_id FROM ratings r WHERE r.account_id = t.account_id
      ) all_reviews
    ), 0) AS review_count,
    COALESCE(o.display_name, o.handle, 'Team Owner') AS owner_name,
    o.handle AS owner_handle,
    ofile.path AS owner_avatar_path,
    (
      SELECT json_build_object(
        'contract_id', c.contract_id,
        'needs_review', (
          (c.status = 'Done' OR NOT EXISTS (
            SELECT 1 FROM contract_milestones cm WHERE cm.contract_id = c.contract_id AND cm.status != 'completed'
          ))
          AND c.status NOT IN ('Completed', 'Cancelled', 'Waiting')
          AND NOT EXISTS (
            SELECT 1 FROM ratings r
             WHERE r.contract_id = c.contract_id
               AND r.account_id = (CASE WHEN COALESCE(j.client_account_id, gr.client_account_id) = $1 THEN COALESCE(p.freelancer_account_id, g.freelancer_account_id) ELSE COALESCE(j.client_account_id, gr.client_account_id) END)
          )
        ),
        'user_has_reviewed', EXISTS (
          SELECT 1 FROM ratings r
           WHERE r.contract_id = c.contract_id
             AND r.account_id = (CASE WHEN COALESCE(j.client_account_id, gr.client_account_id) = $1 THEN COALESCE(p.freelancer_account_id, g.freelancer_account_id) ELSE COALESCE(j.client_account_id, gr.client_account_id) END)
        ),
        'counterparty_has_reviewed', EXISTS (
          SELECT 1 FROM ratings r
           WHERE r.contract_id = c.contract_id
             AND r.account_id = (CASE WHEN COALESCE(j.client_account_id, gr.client_account_id) = $1 THEN COALESCE(p.freelancer_account_id, g.freelancer_account_id) ELSE COALESCE(j.client_account_id, gr.client_account_id) END)
        ),
        'counterparty_reviewed_at', (
          SELECT r.created_at FROM ratings r
           WHERE r.contract_id = c.contract_id
             AND r.account_id = (CASE WHEN COALESCE(j.client_account_id, gr.client_account_id) = $1 THEN COALESCE(p.freelancer_account_id, g.freelancer_account_id) ELSE COALESCE(j.client_account_id, gr.client_account_id) END)
           LIMIT 1
        ),
        'user_reviewed_at', (
          SELECT r.created_at FROM ratings r
           WHERE r.contract_id = c.contract_id
             AND r.account_id = (CASE WHEN COALESCE(j.client_account_id, gr.client_account_id) = $1 THEN COALESCE(p.freelancer_account_id, g.freelancer_account_id) ELSE COALESCE(j.client_account_id, gr.client_account_id) END)
           LIMIT 1
        )
      )
      FROM team_contract_workspaces tcw
      JOIN contracts c ON c.contract_id = tcw.contract_id
      LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
      LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN jobs j ON j.job_id = p.job_id
      LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
      LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
      LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
      LEFT JOIN gigs g ON g.gig_id = gt.gig_id
      WHERE tcw.team_id = t.team_id
        AND (
          COALESCE(j.client_account_id, gr.client_account_id) = $1 
          OR COALESCE(p.freelancer_account_id, g.freelancer_account_id) = $1
        )
      LIMIT 1
    ) AS review_status
    FROM teams t JOIN accounts a ON a.account_id=t.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id=t.account_id
    LEFT JOIN team_members am ON am.team_id=t.team_id LEFT JOIN users u ON u.account_id=$1 LEFT JOIN team_members mine ON mine.team_id=t.team_id AND mine.user_id=u.user_id
    LEFT JOIN team_members om ON om.team_id=t.team_id AND om.role='Owner' AND om.status='Active'
    LEFT JOIN users ou ON ou.user_id=om.user_id
    LEFT JOIN accounts o ON o.account_id=ou.account_id
    LEFT JOIN files ofile ON ofile.file_id=o.avatar_file_id
    WHERE t.deleted_at IS NULL
      AND ($2='' OR a.display_name ILIKE '%'||$2||'%' OR a.handle ILIKE '%'||$2||'%' OR t.category ILIKE '%'||$2||'%')
      AND ($6='' OR t.category ILIKE '%'||$6||'%')
      AND (
        ($3::boolean = TRUE AND mine.status IN ('Active', 'Pending'))
        OR ($3::boolean = FALSE AND t.visibility = 'Public')
      )
    GROUP BY t.team_id,t.team_type,t.job_id,t.gig_id,t.is_archived,a.account_id,f.path,v.is_verified,mine.role,mine.status,o.display_name,o.handle,ofile.path ORDER BY a.display_name LIMIT $4 OFFSET $5`, [accountId,q,mine,limit,offset,category])).rows;
}
async function getMembership(teamId, accountId) { return (await pool.query(`SELECT tm.*,u.account_id,a.display_name,a.handle FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id WHERE tm.team_id=$1 AND u.account_id=$2`,[teamId,accountId])).rows[0]||null; }
async function listMembers(teamId, statuses=null) { return (await pool.query(`SELECT tm.*,u.account_id,a.display_name,a.handle,f.path avatar_path FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tm.team_id=$1 AND ($2::text[] IS NULL OR tm.status=ANY($2)) ORDER BY tm.joined_at`,[teamId,statuses])).rows; }
async function listJoinRequests(teamId, search='') { return (await pool.query(`SELECT tm.team_id,u.account_id,a.display_name,a.handle,f.path AS avatar_path, a.banner_preset,tm.role,tm.status,COALESCE(tm.updated_at,tm.joined_at) AS requested_at FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tm.team_id=$1 AND tm.status='Pending' AND ($2='' OR a.display_name ILIKE '%'||$2||'%' OR a.handle ILIKE '%'||$2||'%') ORDER BY COALESCE(tm.updated_at,tm.joined_at) DESC`,[teamId,search])).rows; }
async function upsertMembership(teamId,userId,role,status,invitedBy=null) { return (await pool.query(`INSERT INTO team_members(team_id,user_id,role,status,invited_by_account_id,invited_at,deleted_at) VALUES($1,$2,$3,$4::varchar,$5,CASE WHEN $4::varchar='Invited'::varchar THEN NOW() END,NULL) ON CONFLICT(team_id,user_id) DO UPDATE SET role=EXCLUDED.role,status=EXCLUDED.status,invited_by_account_id=EXCLUDED.invited_by_account_id,invited_at=EXCLUDED.invited_at,deleted_at=NULL,updated_at=NOW() RETURNING *`,[teamId,userId,role,status,invitedBy])).rows[0]; }
async function updateMembership(teamId,userId,fields) { const allowed=['role','status']; const entries=Object.entries(fields).filter(([k])=>allowed.includes(k)); const vals=entries.map(([,v])=>v); vals.push(teamId,userId); return (await pool.query(`UPDATE team_members SET ${entries.map(([k],i)=>`${k}=$${i+1}`).join(',')},updated_at=NOW() WHERE team_id=$${vals.length-1} AND user_id=$${vals.length} RETURNING *`,vals)).rows[0]||null; }
async function updateTeam(teamId, accountId, data) { const client=await pool.connect(); try { await client.query('BEGIN'); const a=(await client.query(`UPDATE accounts SET display_name=COALESCE($3,display_name),handle=COALESCE($4,handle),description=COALESCE($5,description),tagline=COALESCE($6,tagline),avatar_file_id=COALESCE($7,avatar_file_id) WHERE account_id=$1 AND EXISTS(SELECT 1 FROM teams WHERE team_id=$2 AND account_id=$1) RETURNING *`,[accountId,teamId,data.name,data.handle,data.description,data.tagline,data.avatarFileId])).rows[0]; const t=(await client.query(`UPDATE teams SET visibility=COALESCE($2,visibility),join_policy=COALESCE($3,join_policy),category=COALESCE($4,category),website=COALESCE($5,website),location=COALESCE($6,location),updated_at=NOW() WHERE team_id=$1 RETURNING *`,[teamId,data.visibility,data.joinPolicy,data.category,data.website,data.location])).rows[0]; await client.query('COMMIT'); return {...t,...a}; } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} }
async function softDeleteTeam(teamId){return (await pool.query(`UPDATE teams SET deleted_at=NOW() WHERE team_id=$1 RETURNING *`,[teamId])).rows[0];}
async function findByCode(code){return (await pool.query(`SELECT * FROM teams WHERE upper(join_code)=upper($1) AND deleted_at IS NULL`,[code])).rows[0]||null;}
async function getTeamInvitePreview(code, accountId = null) {
  return (await pool.query(`
    SELECT t.team_id, t.join_code, t.category, t.visibility, t.join_policy, t.website, t.location,
      a.display_name, a.handle, a.tagline, a.description, f.path AS avatar_path, a.banner_preset,
      COALESCE(mc.member_count, 0)::int AS member_count,
      tm.role AS current_user_role, tm.status AS current_user_status,
      COALESCE(v.is_verified, FALSE) AS is_business_verified,
      o.display_name AS owner_name, o.handle AS owner_handle
    FROM teams t
    JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id = t.account_id
    LEFT JOIN users cu ON cu.account_id = $2
    LEFT JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = cu.user_id
    LEFT JOIN (SELECT team_id, count(*) AS member_count FROM team_members WHERE status = 'Active' GROUP BY team_id) mc ON mc.team_id = t.team_id
    LEFT JOIN team_members om ON om.team_id = t.team_id AND om.role = 'Owner' AND om.status = 'Active'
    LEFT JOIN users ou ON ou.user_id = om.user_id
    LEFT JOIN accounts o ON o.account_id = ou.account_id
    WHERE upper(t.join_code) = upper($1) AND t.deleted_at IS NULL
  `, [code, accountId])).rows[0] || null;
}
async function transferOwnership(teamId,oldUserId,newUserId){const c=await pool.connect();try{await c.query('BEGIN');await c.query(`UPDATE team_members SET role='Admin',updated_at=NOW() WHERE team_id=$1 AND user_id=$2 AND role='Owner'`,[teamId,oldUserId]);await c.query(`UPDATE team_members SET role='Owner',updated_at=NOW() WHERE team_id=$1 AND user_id=$2 AND status='Active'`,[teamId,newUserId]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function wallet(teamId){
  const baseWallet = (await pool.query(`SELECT COALESCE(sum(w.balance_credits) FILTER(WHERE w.type='account wallets'),0)::int available_balance,COALESCE(sum(w.balance_credits) FILTER(WHERE w.type='escrow wallets'),0)::int escrow_balance,COALESCE(sum(w.frozen_balance_credits),0)::int frozen_balance,COALESCE(sum(w.balance_credits),0)::int total_balance FROM teams t JOIN account_wallets aw ON aw.account_id=t.account_id JOIN wallets w ON w.wallet_id=aw.wallet_id WHERE t.team_id=$1`,[teamId])).rows[0] || { available_balance: 0, escrow_balance: 0, frozen_balance: 0, total_balance: 0 };

  const contractReservedResult = await pool.query(`
    WITH team_wallet AS (
      SELECT w.wallet_id
        FROM teams t
        JOIN account_wallets aw ON aw.account_id = t.account_id
        JOIN wallets w ON w.wallet_id = aw.wallet_id
       WHERE t.team_id = $1 AND w.type = 'account wallets'
       LIMIT 1
    ),
    contract_releases AS (
      SELECT ct.reference_id AS contract_id,
             COALESCE(SUM(ct.amount_credits), 0)::int AS released_credits
        FROM team_wallet tw
        JOIN credit_transactions ct ON ct.destination_wallet_id = tw.wallet_id
       WHERE ct.reference_table = 'contracts'
         AND ct.type = 'Escrow Release'
         AND LOWER(ct.status) = 'completed'
       GROUP BY ct.reference_id
    ),
    contract_dists AS (
      SELECT tcd.contract_id,
             COALESCE(SUM(tcd.amount_credits), 0)::int AS distributed_credits
        FROM team_contract_distributions tcd
       WHERE tcd.team_id = $1
       GROUP BY tcd.contract_id
    )
    SELECT COALESCE(SUM(GREATEST(0, cr.released_credits - COALESCE(cd.distributed_credits, 0))), 0)::int AS total_contract_reserved
      FROM contract_releases cr
      LEFT JOIN contract_dists cd ON cd.contract_id = cr.contract_id
  `, [teamId]);

  const contractReserved = Number(contractReservedResult.rows[0]?.total_contract_reserved || 0);
  const availableBalance = Number(baseWallet.available_balance || 0);
  const unreservedBalance = Math.max(0, availableBalance - contractReserved);

  return {
    ...baseWallet,
    contract_reserved_balance: contractReserved,
    unreserved_balance: unreservedBalance,
  };
}
async function getTeamTransactions(teamId,{page=1,pageSize=10,search='',dateFrom='',dateTo=''}={}){const limit=Math.min(Math.max(Number(pageSize)||10,1),50),offset=(Math.max(Number(page)||1,1)-1)*limit,term=String(search||'').trim();const filters=[`ct.reference_table='teams'`,`ct.reference_id=$1`],values=[teamId];if(term){values.push(`%${term}%`);filters.push(`(destination.display_name ILIKE $${values.length} OR destination.handle ILIKE $${values.length} OR source.display_name ILIKE $${values.length} OR source.handle ILIKE $${values.length})`);}if(dateFrom){values.push(dateFrom);filters.push(`ct.created_at >= $${values.length}`);}if(dateTo){values.push(`${dateTo}T23:59:59.999Z`);filters.push(`ct.created_at < $${values.length}`);}const where=filters.join(' AND ');const total=(await pool.query(`SELECT COUNT(*)::int AS total FROM credit_transactions ct JOIN teams t ON t.team_id=$1 JOIN wallets destination_wallet ON destination_wallet.wallet_id=ct.destination_wallet_id JOIN account_wallets destination_aw ON destination_aw.wallet_id=destination_wallet.wallet_id JOIN accounts destination ON destination.account_id=destination_aw.account_id LEFT JOIN wallets source_wallet ON source_wallet.wallet_id=ct.source_wallet_id LEFT JOIN account_wallets source_aw ON source_aw.wallet_id=source_wallet.wallet_id LEFT JOIN accounts source ON source.account_id=source_aw.account_id WHERE ${where}`,values)).rows[0]?.total||0;values.push(limit,offset);const items=(await pool.query(`SELECT ct.credit_transaction_id,ct.type,ct.amount_credits,ct.status,ct.created_at,CASE WHEN destination_aw.account_id = t.account_id THEN 'Deposit' ELSE 'Distribution' END AS direction,CASE WHEN destination_aw.account_id = t.account_id THEN COALESCE(source.display_name, 'Member') ELSE destination.display_name END AS recipient_name,CASE WHEN destination_aw.account_id = t.account_id THEN source.handle ELSE destination.handle END AS recipient_handle,source.display_name AS source_name,source.handle AS source_handle,destination.display_name AS destination_name,destination.handle AS destination_handle FROM credit_transactions ct JOIN teams t ON t.team_id=$1 JOIN wallets destination_wallet ON destination_wallet.wallet_id=ct.destination_wallet_id JOIN account_wallets destination_aw ON destination_aw.wallet_id=destination_wallet.wallet_id JOIN accounts destination ON destination.account_id=destination_aw.account_id LEFT JOIN wallets source_wallet ON source_wallet.wallet_id=ct.source_wallet_id LEFT JOIN account_wallets source_aw ON source_aw.wallet_id=source_wallet.wallet_id LEFT JOIN accounts source ON source.account_id=source_aw.account_id WHERE ${where} ORDER BY ct.created_at DESC,ct.credit_transaction_id DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values)).rows;return{items,pagination:{page:Math.max(Number(page)||1,1),page_size:limit,total,total_pages:Math.max(Math.ceil(total/limit),1)}};}
async function addTeamFunds(teamId, userAccountId, amountCredits) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock and retrieve user's personal account wallet
    const userWallet = (await client.query(`
      SELECT w.wallet_id, w.balance_credits, w.status
      FROM account_wallets aw
      JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE aw.account_id = $1 AND w.type = 'account wallets'
      FOR UPDATE
    `, [userAccountId])).rows[0];

    if (!userWallet || String(userWallet.status).toLowerCase() !== 'active') {
      throw new Error('Personal account wallet is not active or not found');
    }

    const userBalance = Number(userWallet.balance_credits || 0);
    if (userBalance < amountCredits) {
      throw new Error(`Insufficient personal balance. You have ${userBalance.toLocaleString()} credits, but tried to add ${amountCredits.toLocaleString()} credits.`);
    }

    // 2. Lock and retrieve team's account wallet
    let teamWallet = (await client.query(`
      SELECT w.wallet_id, w.balance_credits, w.status
      FROM teams t
      JOIN account_wallets aw ON aw.account_id = t.account_id
      JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE t.team_id = $1 AND t.deleted_at IS NULL AND w.type = 'account wallets'
      FOR UPDATE
    `, [teamId])).rows[0];

    if (!teamWallet) {
      const teamAccount = (await client.query('SELECT account_id FROM teams WHERE team_id = $1 AND deleted_at IS NULL', [teamId])).rows[0];
      if (!teamAccount) throw new Error('Team not found');
      
      const newW = (await client.query(`
        INSERT INTO wallets (type, status, balance_credits, frozen_balance_credits, created_at)
        VALUES ('account wallets', 'active', 0, 0, CURRENT_TIMESTAMP)
        RETURNING wallet_id, balance_credits, status
      `)).rows[0];
      await client.query(`
        INSERT INTO account_wallets (account_id, wallet_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [teamAccount.account_id, newW.wallet_id]);
      teamWallet = newW;
    } else if (String(teamWallet.status).toLowerCase() !== 'active') {
      throw new Error('Team account wallet is not active');
    }

    // 3. Deduct credits from user wallet
    await client.query('UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2', [amountCredits, userWallet.wallet_id]);

    // 4. Add credits to team wallet
    await client.query('UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2', [amountCredits, teamWallet.wallet_id]);

    // 5. Record transaction
    const transaction = (await client.query(`
      INSERT INTO credit_transactions (
        type,
        amount_credits,
        status,
        source_wallet_id,
        destination_wallet_id,
        fee_transaction_id,
        reference_table,
        reference_id
      ) VALUES (
        'Fund Transfer',
        $1,
        'completed',
        $2,
        $3,
        NULL,
        'teams',
        $4
      ) RETURNING *
    `, [amountCredits, userWallet.wallet_id, teamWallet.wallet_id, teamId])).rows[0];

    await client.query('COMMIT');

    const teamWalletSnapshot = await wallet(teamId);
    return {
      transaction,
      added_credits: amountCredits,
      team_wallet: teamWalletSnapshot,
      user_balance_credits: userBalance - amountCredits
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
async function distributeTeamFunds(teamId, recipients) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const source=(await client.query(`SELECT w.wallet_id,w.balance_credits,w.status FROM teams t JOIN account_wallets aw ON aw.account_id=t.account_id JOIN wallets w ON w.wallet_id=aw.wallet_id WHERE t.team_id=$1 AND t.deleted_at IS NULL AND w.type='account wallets' FOR UPDATE`,[teamId])).rows[0];
    if(!source||String(source.status).toLowerCase()!=='active')throw new Error('Team account wallet is unavailable');

    const contractReservedResult = await client.query(`
      WITH contract_releases AS (
        SELECT ct.reference_id AS contract_id,
               COALESCE(SUM(ct.amount_credits), 0)::int AS released_credits
          FROM credit_transactions ct
         WHERE ct.destination_wallet_id = $1
           AND ct.reference_table = 'contracts'
           AND ct.type = 'Escrow Release'
           AND LOWER(ct.status) = 'completed'
         GROUP BY ct.reference_id
      ),
      contract_dists AS (
        SELECT tcd.contract_id,
               COALESCE(SUM(tcd.amount_credits), 0)::int AS distributed_credits
          FROM team_contract_distributions tcd
         WHERE tcd.team_id = $2
         GROUP BY tcd.contract_id
      )
      SELECT COALESCE(SUM(GREATEST(0, cr.released_credits - COALESCE(cd.distributed_credits, 0))), 0)::int AS total_contract_reserved
        FROM contract_releases cr
        LEFT JOIN contract_dists cd ON cd.contract_id = cr.contract_id
    `, [source.wallet_id, teamId]);

    const totalContractReserved = Number(contractReservedResult.rows[0]?.total_contract_reserved || 0);
    const availableBalance = Number(source.balance_credits || 0);
    const unreservedBalance = Math.max(0, availableBalance - totalContractReserved);

    const total = recipients.reduce((sum, recipient) => sum + recipient.amount_credits, 0);
    if (total > unreservedBalance) {
      throw new Error(
        `Distribution amount (${total.toLocaleString()} credits) exceeds unreserved Team balance (${unreservedBalance.toLocaleString()} credits). ${totalContractReserved.toLocaleString()} credits are locked/reserved for contract payouts.`
      );
    }

    const recipientIds=recipients.map((recipient)=>recipient.account_id);
    const recipientWallets=(await client.query(`SELECT aw.account_id,w.wallet_id,w.status FROM account_wallets aw JOIN wallets w ON w.wallet_id=aw.wallet_id JOIN users u ON u.account_id=aw.account_id JOIN team_members tm ON tm.user_id=u.user_id WHERE tm.team_id=$1 AND tm.status='Active' AND aw.account_id=ANY($2::uuid[]) AND w.type='account wallets' ORDER BY w.wallet_id FOR UPDATE`,[teamId,recipientIds])).rows;
    if(recipientWallets.length!==recipients.length||recipientWallets.some((wallet)=>String(wallet.status).toLowerCase()!=='active'))throw new Error('Every recipient must be an active Team member with an active account wallet');
    await client.query('UPDATE wallets SET balance_credits=balance_credits-$1 WHERE wallet_id=$2',[total,source.wallet_id]);
    const walletsByAccountId=new Map(recipientWallets.map((wallet)=>[String(wallet.account_id),wallet]));
    const transactions=[];
    for(const recipient of recipients){const destination=walletsByAccountId.get(String(recipient.account_id));await client.query('UPDATE wallets SET balance_credits=balance_credits+$1 WHERE wallet_id=$2',[recipient.amount_credits,destination.wallet_id]);const transaction=(await client.query(`INSERT INTO credit_transactions (type,amount_credits,status,source_wallet_id,destination_wallet_id,fee_transaction_id,reference_table,reference_id) VALUES ('Fund Transfer',$1,'completed',$2,$3,NULL,'teams',$4) RETURNING *`,[recipient.amount_credits,source.wallet_id,destination.wallet_id,teamId])).rows[0];transactions.push({...transaction,recipient_account_id:recipient.account_id});}
    await client.query('COMMIT');
    return {transactions,distributed_credits:total,available_balance:availableBalance-total,unreserved_balance:unreservedBalance-total,contract_reserved_balance:totalContractReserved};
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function listMarketplacePosts(teamId, type) {
  if (type === 'jobs') {
    return (await pool.query(`SELECT j.job_id AS id,j.title,j.description,j.category,j.status,j.created_at,
      j.rate_credits_min,j.rate_credits_max,j.no_of_hires,
      (SELECT COUNT(*)::int FROM proposals p WHERE p.job_id=j.job_id AND p.deleted_at IS NULL) AS activity_count,
      (SELECT f.path FROM job_attachments ja JOIN files f ON f.file_id=ja.file_id WHERE ja.job_id=j.job_id ORDER BY ja.index LIMIT 1) AS thumbnail_path
      FROM teams t JOIN jobs j ON j.client_account_id=t.account_id
      WHERE t.team_id=$1 AND t.deleted_at IS NULL AND j.deleted_at IS NULL
      ORDER BY j.created_at DESC`, [teamId])).rows;
  }
  return (await pool.query(`SELECT g.gig_id AS id,g.title,g.description,g.category,g.status,g.created_at,
    COALESCE((SELECT MIN(gt.rate_credits) FROM gig_tiers gt WHERE gt.gig_id=g.gig_id),0)::int AS rate_credits_min,
    NULL::int AS rate_credits_max,g.no_of_concurrent_max AS no_of_hires,
    (SELECT COUNT(*)::int FROM gig_requests gr JOIN gig_tiers gt ON gt.gig_tier_id=gr.gig_tier_id WHERE gt.gig_id=g.gig_id) AS activity_count,
    (SELECT f.path FROM gig_attachments ga JOIN files f ON f.file_id=ga.file_id WHERE ga.gig_id=g.gig_id ORDER BY ga.index LIMIT 1) AS thumbnail_path
    FROM teams t JOIN gigs g ON g.freelancer_account_id=t.account_id
    WHERE t.team_id=$1 AND t.deleted_at IS NULL AND LOWER(g.status) NOT IN ('archived','deleted')
    ORDER BY g.created_at DESC`, [teamId])).rows;
}
async function reviews(teamId){return (await pool.query(`SELECT tr.*,a.display_name,a.handle,f.path avatar_path FROM team_reviews tr JOIN accounts a ON a.account_id=tr.reviewer_account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tr.team_id=$1 ORDER BY tr.created_at DESC`,[teamId])).rows;}
async function addReview(teamId,accountId,data){return (await pool.query(`INSERT INTO team_reviews(team_id,reviewer_account_id,rating,comment,reference_type,reference_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[teamId,accountId,data.rating,data.comment||null,data.referenceType||null,data.referenceId||null])).rows[0];}
async function addReport(teamId,accountId,data){
  const team=await getTeam(teamId,accountId);
  if(!team){
    const error=new Error('Team not found');
    error.statusCode=404;
    throw error;
  }
  const { createReport } = require('./ModeratorSharedRepositories');
  const { createReportNumber, buildSubjectSnapshot } = require('../lib/ReportSubject');
  const forAccountId=data.targetAccountId||team.account_id;
  const isProject=data.source==='project';
  const isMember=Boolean(data.targetAccountId);
  const targetType=isMember?'team_member':(isProject?'team_project':'team');
  const href=isProject?`/team-project/${teamId}`:`/teams/${teamId}`;
  const title=isMember?(data.targetName||'Team member'):(team.display_name||'Team');
  const body=isMember
    ? `${data.targetName||'Member'} in ${team.display_name||'team'}`
    : (team.description||team.tagline||null);
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: accountId,
    targetAccountId: forAccountId,
    targetType,
    targetId: isMember?String(data.targetAccountId):String(teamId),
    referenceTable: 'teams',
    referencePrefix: isProject?'project':'team',
    referenceId: String(teamId),
    type: data.category || 'Team Report',
    description: data.description,
    subjectSnapshot: buildSubjectSnapshot({ kind: targetType, title, body, href }),
  });
}
async function getTeamInbox(teamId){return TeamInbox.findOne({team_id:String(teamId),deleted_at:null});}
async function createTeamInbox(team,members){const now=new Date();const isContractual = team.team_type === 'contractual' || Boolean(team.job_id);const conversationType = isContractual ? 'engagement' : 'group';const result=await TeamInbox.insertOne({team_id:String(team.team_id),team_account_id:String(team.account_id),job_id:team.job_id?String(team.job_id):null,listing_type:isContractual?'job':null,listing_title:team.display_name,conversation_name:team.display_name,conversation_type:conversationType,conversation_image_key:team.avatar_path||null,members:members.map(m=>({account_id:String(m.account_id),role:m.role==='Owner'?'owner':'member',status:'active',joined_at:now})),pinned_messages:[],created_at:now,updated_at:now,deleted_at:null});return TeamInbox.findOne({_id:result.insertedId});}
async function syncTeamInboxMembers(teamId,members){const inbox=await getTeamInbox(teamId);if(!inbox)return null;const active=new Map(members.map(m=>[String(m.account_id),m])),now=new Date();const merged=(inbox.members||[]).map(m=>active.has(String(m.account_id))?{...m,status:'active',role:active.get(String(m.account_id)).role==='Owner'?'owner':'member'}:{...m,status:'removed',left_at:now});for(const m of members)if(!merged.some(x=>String(x.account_id)===String(m.account_id)))merged.push({account_id:String(m.account_id),role:m.role==='Owner'?'owner':'member',status:'active',joined_at:now});const teamRes = await pool.query('SELECT t.team_type, t.job_id FROM teams t WHERE t.team_id = $1', [teamId]);const isContractual = teamRes.rows[0]?.team_type === 'contractual' || Boolean(teamRes.rows[0]?.job_id);const updateFields = { members: merged, updated_at: now };if (isContractual && inbox.conversation_type !== 'engagement') { updateFields.conversation_type = 'engagement'; updateFields.listing_type = 'job'; if (teamRes.rows[0]?.job_id) updateFields.job_id = String(teamRes.rows[0].job_id); }await TeamInbox.updateOne({_id:inbox._id},{$set:updateFields});return TeamInbox.findOne({_id:inbox._id});}
async function getTeamCreationEligibility(accountId) {
  const query = `
    WITH identity AS (
      SELECT u.user_id, u.account_id
      FROM users u
      WHERE u.account_id = $1
      LIMIT 1
    ), active_subscription AS (
      SELECT s.plan_id, p.name AS plan_name
      FROM subscriptions s
      JOIN identity ON identity.user_id = s.user_id
      JOIN plans p ON p.plan_id = s.plan_id
      WHERE UPPER(s.status) = 'ACTIVE'
        AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
      ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC
      LIMIT 1
    ), default_free_plan AS (
      SELECT p.plan_id, p.name AS plan_name
      FROM plans p
      WHERE p.amount_php_cents = 0 OR LOWER(p.name) = 'free'
      ORDER BY p.amount_php_cents ASC
      LIMIT 1
    ), effective_plan AS (
      SELECT
        COALESCE((SELECT plan_id FROM active_subscription), (SELECT plan_id FROM default_free_plan)) AS plan_id,
        COALESCE((SELECT plan_name FROM active_subscription), (SELECT plan_name FROM default_free_plan), 'Free') AS plan_name
    ), entitlement AS (
      SELECT pf.value
      FROM effective_plan ep
      JOIN plan_features pf ON pf.plan_id = ep.plan_id
      JOIN features f ON f.feature_id = pf.feature_id
      WHERE f.feature_key = 'team_creation'
      LIMIT 1
    ), usage AS (
      SELECT COUNT(DISTINCT t.team_id)::int AS team_count
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.team_id
      JOIN identity ON identity.user_id = tm.user_id
      WHERE tm.role = 'Owner'
        AND tm.status = 'Active'
        AND t.deleted_at IS NULL
        AND (t.team_type IS NULL OR t.team_type <> 'contractual')
    )
    SELECT
      identity.user_id,
      COALESCE((SELECT plan_name FROM effective_plan), 'Free') AS plan_name,
      (SELECT value FROM entitlement) AS feature_value,
      COALESCE((SELECT team_count FROM usage), 0) AS team_count
    FROM identity;
  `;
  const result = await pool.query(query, [accountId]);
  const row = result.rows[0];
  const used = Number(row?.team_count || 0);
  const planName = row?.plan_name || 'Free';
  const rawValue = typeof row?.feature_value === 'string' ? row.feature_value.trim() : '';
  const unlimited = rawValue.toLowerCase() === 'unlimited';
  const numericLimit = /^\d+$/.test(rawValue) ? Number(rawValue) : null;
  const validLimit = unlimited || (Number.isSafeInteger(numericLimit) && numericLimit >= 0);
  const effectiveLimit = validLimit ? (unlimited ? null : numericLimit) : (planName.toLowerCase() === 'free' ? 1 : null);
  const effectiveUnlimited = unlimited || (effectiveLimit === null && validLimit);

  let allowed = true;
  let code = null;
  let message = null;

  if (!effectiveUnlimited) {
    const limitNum = effectiveLimit ?? 1;
    if (used >= limitNum) {
      allowed = false;
      code = 'TEAM_CREATION_LIMIT_REACHED';
      message = `Your ${planName} plan allows ${limitNum} team creation${limitNum === 1 ? '' : 's'}. You have reached this limit. Upgrade your plan to create more teams.`;
    }
  }

  return {
    allowed,
    limit: effectiveUnlimited ? null : (effectiveLimit ?? 1),
    used,
    remaining: effectiveUnlimited ? null : Math.max(0, (effectiveLimit ?? 1) - used),
    unlimited: effectiveUnlimited,
    planName,
    code,
    message,
  };
}

async function getTeamMemberLimitEligibility(teamId) {
  const query = `
    WITH team_owner AS (
      SELECT tm.user_id, u.account_id
      FROM team_members tm
      JOIN users u ON u.user_id = tm.user_id
      WHERE tm.team_id = $1 AND tm.role = 'Owner' AND tm.status = 'Active'
      LIMIT 1
    ), active_subscription AS (
      SELECT s.plan_id, p.name AS plan_name
      FROM subscriptions s
      JOIN team_owner o ON o.user_id = s.user_id
      JOIN plans p ON p.plan_id = s.plan_id
      WHERE UPPER(s.status) = 'ACTIVE'
        AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
      ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC
      LIMIT 1
    ), default_free_plan AS (
      SELECT p.plan_id, p.name AS plan_name
      FROM plans p
      WHERE p.amount_php_cents = 0 OR LOWER(p.name) = 'free'
      ORDER BY p.amount_php_cents ASC
      LIMIT 1
    ), effective_plan AS (
      SELECT
        COALESCE((SELECT plan_id FROM active_subscription), (SELECT plan_id FROM default_free_plan)) AS plan_id,
        COALESCE((SELECT plan_name FROM active_subscription), (SELECT plan_name FROM default_free_plan), 'Free') AS plan_name
    ), entitlement AS (
      SELECT pf.value
      FROM effective_plan ep
      JOIN plan_features pf ON pf.plan_id = ep.plan_id
      JOIN features f ON f.feature_id = pf.feature_id
      WHERE f.feature_key = 'collaborators'
      LIMIT 1
    ), member_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'Active')::int AS active_count
      FROM team_members
      WHERE team_id = $1
    )
    SELECT
      COALESCE((SELECT plan_name FROM effective_plan), 'Free') AS owner_plan_name,
      (SELECT value FROM entitlement) AS feature_value,
      COALESCE((SELECT active_count FROM member_counts), 0) AS active_member_count;
  `;
  const result = await pool.query(query, [teamId]);
  const row = result.rows[0];
  const activeCount = Number(row?.active_member_count || 0);
  const planName = row?.owner_plan_name || 'Free';
  const rawValue = typeof row?.feature_value === 'string' ? row.feature_value.trim() : '';
  const unlimited = rawValue.toLowerCase() === 'unlimited';
  const numericLimit = /^\d+$/.test(rawValue) ? Number(rawValue) : null;
  const validLimit = unlimited || (Number.isSafeInteger(numericLimit) && numericLimit >= 0);
  const effectiveLimit = validLimit ? (unlimited ? null : numericLimit) : (planName.toLowerCase() === 'free' ? 3 : (planName.toLowerCase() === 'premium' ? 10 : 20));
  const effectiveUnlimited = unlimited || (effectiveLimit === null && validLimit);

  let allowed = true;
  let code = null;
  let message = null;

  if (!effectiveUnlimited) {
    const limitNum = effectiveLimit ?? 3;
    if (activeCount >= limitNum) {
      allowed = false;
      code = 'TEAM_MEMBER_LIMIT_REACHED';
      message = `This team has reached its limit of ${limitNum} member${limitNum === 1 ? '' : 's'} for the team owner's ${planName} plan. The team owner must upgrade to invite or add more members.`;
    }
  }

  return {
    allowed,
    limit: effectiveUnlimited ? null : (effectiveLimit ?? 3),
    activeCount,
    remaining: effectiveUnlimited ? null : Math.max(0, (effectiveLimit ?? 3) - activeCount),
    unlimited: effectiveUnlimited,
    ownerPlanName: planName,
    code,
    message,
  };
}


async function listTeamTasks(teamId) {
  const query = `
    SELECT 
      t.task_id,
      t.team_id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_at,
      t.sort_order,
      t.assignee_account_id,
      t.created_by_account_id,
      t.created_at,
      t.updated_at,
      assignee.display_name AS assignee_name,
      assignee.handle AS assignee_handle,
      assignee_media.path AS assignee_avatar_path,
      creator.display_name AS creator_name,
      creator.handle AS creator_handle
    FROM team_board_tasks t
    LEFT JOIN accounts assignee ON assignee.account_id = t.assignee_account_id
    LEFT JOIN files assignee_media ON assignee_media.file_id = assignee.avatar_file_id
    LEFT JOIN accounts creator ON creator.account_id = t.created_by_account_id
    WHERE t.team_id = $1 AND t.deleted_at IS NULL
    ORDER BY t.sort_order ASC, t.created_at ASC
  `;
  const result = await pool.query(query, [teamId]);
  return result.rows;
}

async function createTeamTask(teamId, creatorAccountId, data) {
  const query = `
    INSERT INTO team_board_tasks (
      team_id,
      created_by_account_id,
      title,
      description,
      status,
      priority,
      due_at,
      assignee_account_id,
      sort_order
    ) VALUES ($1, $2, $3, $4, COALESCE($5, 'todo'), COALESCE($6, 'normal'), $7, $8, COALESCE($9, 0))
    RETURNING *
  `;
  const values = [
    teamId,
    creatorAccountId,
    data.title.trim(),
    data.description ? data.description.trim() : null,
    data.status || 'todo',
    data.priority || 'normal',
    data.due_at || null,
    data.assignee_account_id || null,
    Number.isInteger(data.sort_order) ? data.sort_order : 0
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function updateTeamTask(teamId, taskId, data) {
  const fields = [];
  const values = [teamId, taskId];
  let idx = 3;

  if (data.title !== undefined) {
    fields.push(`title = ${idx++}`);
    values.push(data.title.trim());
  }
  if (data.description !== undefined) {
    fields.push(`description = ${idx++}`);
    values.push(data.description ? data.description.trim() : null);
  }
  if (data.status !== undefined) {
    fields.push(`status = ${idx++}`);
    values.push(data.status);
  }
  if (data.priority !== undefined) {
    fields.push(`priority = ${idx++}`);
    values.push(data.priority);
  }
  if (data.due_at !== undefined) {
    fields.push(`due_at = ${idx++}`);
    values.push(data.due_at || null);
  }
  if (data.assignee_account_id !== undefined) {
    fields.push(`assignee_account_id = ${idx++}`);
    values.push(data.assignee_account_id || null);
  }
  if (data.sort_order !== undefined) {
    fields.push(`sort_order = ${idx++}`);
    values.push(Number(data.sort_order) || 0);
  }

  if (fields.length === 0) return null;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  const query = `
    UPDATE team_board_tasks
    SET ${fields.join(', ')}
    WHERE team_id = $1 AND task_id = $2 AND deleted_at IS NULL
    RETURNING *
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

async function deleteTeamTask(teamId, taskId) {
  const query = `
    UPDATE team_board_tasks
    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE team_id = $1 AND task_id = $2 AND deleted_at IS NULL
    RETURNING task_id
  `;
  const result = await pool.query(query, [teamId, taskId]);
  return Boolean(result.rows[0]);
}


async function listTeamVideoProjects(teamId) {
  await ensureTeamMembersHaveProjectAccess(teamId);

  const query = `
    SELECT p.project_id as id,
           p.project_id,
           p.name,
           p.status,
           p.width,
           p.height,
           p.duration_seconds,
           p.created_at,
           p.updated_at,
           p.updated_at as "lastUpdated",
           (SELECT COALESCE(sum(f.size_bytes), 0)
              FROM media_assets ma 
              JOIN files f ON f.file_id = ma.original_file_id 
             WHERE ma.project_id = p.project_id AND ma.deleted_at IS NULL AND f.deleted_at IS NULL) as size_bytes,
           tf.path as thumbnail_path,
           tvp.created_at as linked_at,
           creator.display_name as created_by_name,
           creator.handle as created_by_handle,
           (
             SELECT json_agg(json_build_object(
               'account_id', a.account_id,
               'display_name', a.display_name,
               'handle', a.handle,
               'avatar_path', f.path,
               'role', pm.role
             ))
             FROM project_members pm
             JOIN users u ON u.user_id = pm.user_id
             JOIN accounts a ON a.account_id = u.account_id
             LEFT JOIN files f ON f.file_id = a.avatar_file_id
             WHERE pm.project_id = p.project_id AND pm.deleted_at IS NULL
           ) as collaborators
      FROM team_video_projects tvp
      JOIN projects p ON p.project_id = tvp.project_id AND p.deleted_at IS NULL
      LEFT JOIN files tf ON tf.file_id = p.thumbnail_file_id
      LEFT JOIN accounts creator ON creator.account_id = tvp.created_by_account_id
     WHERE tvp.team_id = $1
     ORDER BY p.updated_at DESC
  `;

  const cfBase = String(process.env.CLOUDFRONT_URL || process.env.AWS_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const res = await pool.query(query, [teamId]);
  return (res.rows || []).map((p) => {
    const rawCollabs = Array.isArray(p.collaborators) ? p.collaborators : [];
    const collaborators = rawCollabs.map((c) => ({
      ...c,
      avatar_url: c.avatar_path && cfBase
        ? (/^https?:\/\//i.test(c.avatar_path) ? c.avatar_path : `${cfBase}/${c.avatar_path.replace(/^\/+/, '')}`)
        : c.avatar_path || null,
    }));
    return {
      ...p,
      collaborators,
      thumbnailUrl: p.thumbnail_path && cfBase
        ? (/^https?:\/\//i.test(p.thumbnail_path) ? p.thumbnail_path : `${cfBase}/${p.thumbnail_path.replace(/^\/+/, '')}`)
        : null,
    };
  });
}

async function createTeamVideoProject(teamId, creatorAccountId, creatorUserId, data) {
  const name = (data.name || 'Team Video Project').trim().slice(0, 50);
  const width = parseInt(data.width, 10) || 1920;
  const height = parseInt(data.height, 10) || 1080;

  const projRes = await pool.query(`
    INSERT INTO projects (name, status, width, height, duration_seconds)
    VALUES ($1, 'active', $2, $3, 0)
    RETURNING project_id as id, project_id, name, status, width, height, duration_seconds, created_at, updated_at
  `, [name, width, height]);

  const newProject = projRes.rows[0];

  await pool.query(`
    INSERT INTO team_video_projects (team_id, project_id, created_by_account_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (team_id, project_id) DO NOTHING
  `, [teamId, newProject.id, creatorAccountId]);

  // Ensure all active team members receive access automatically (Leader as Owner, members as Editor)
  await ensureTeamMembersHaveProjectAccess(teamId, newProject.id);

  return newProject;
}

async function ensureTeamMembersHaveProjectAccess(teamId, specificProjectId = null) {
  if (!teamId) return;

  let projectIds = [];
  if (specificProjectId) {
    projectIds = [specificProjectId];
  } else {
    const pRes = await pool.query(`
      SELECT project_id FROM team_video_projects WHERE team_id = $1
    `, [teamId]);
    projectIds = pRes.rows.map(r => r.project_id);
  }

  if (projectIds.length === 0) return;

  const membersRes = await pool.query(`
    SELECT DISTINCT u.user_id, tm.role as team_role
      FROM team_members tm
      JOIN users u ON u.user_id = tm.user_id
     WHERE tm.team_id = $1 AND tm.status = 'Active'
  `, [teamId]);

  const CURSOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#6366f1'];

  for (const projId of projectIds) {
    for (const member of membersRes.rows) {
      const assignedRole = member.team_role === 'Owner' ? 'Owner' : 'Editor';
      const randomColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
      await pool.query(`
        INSERT INTO project_members (project_id, user_id, role, cursor_color, joined_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (project_id, user_id)
        DO UPDATE SET deleted_at = NULL, role = CASE WHEN EXCLUDED.role = 'Owner' THEN 'Owner' ELSE project_members.role END
      `, [projId, member.user_id, assignedRole, randomColor]);
    }
  }
}

async function deleteTeamVideoProject(teamId, projectId) {
  await pool.query(`
    DELETE FROM team_video_projects WHERE team_id = $1 AND project_id = $2
  `, [teamId, projectId]);
  return { success: true };
}

module.exports={createTeam,getUserId,isAccountVerified,isActiveTeamOwner,getTeamOwnerVerificationEligibility,getActiveTeamOwnerAccountIds,getTeam,listTeams,getMembership,listMembers,listJoinRequests,upsertMembership,updateMembership,updateTeam,softDeleteTeam,findByCode,getTeamInvitePreview,transferOwnership,wallet,getTeamTransactions,distributeTeamFunds,addTeamFunds,listMarketplacePosts,reviews,addReview,addReport,getTeamInbox,createTeamInbox,syncTeamInboxMembers,getTeamCreationEligibility,getTeamMemberLimitEligibility,listTeamTasks,createTeamTask,updateTeamTask,deleteTeamTask,listTeamVideoProjects,createTeamVideoProject,ensureTeamMembersHaveProjectAccess,deleteTeamVideoProject};

