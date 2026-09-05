const { pool } = require('../lib/Database');
const { lazyCollection } = require('../lib/MongoDb');
const TeamInbox = lazyCollection('inbox');

async function createTeam(data, ownerUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = (await client.query(`INSERT INTO accounts (display_name, handle, type, tagline, description, status, avatar_file_id) VALUES ($1,$2,'Team',$3,$4,'Active',$5) RETURNING account_id, display_name, handle, type, tagline, description, status, avatar_file_id, merit_score, created_at, deleted_at`, [data.name, data.handle, data.tagline || null, data.description || null, data.avatarFileId || null])).rows[0];
    const team = (await client.query(`INSERT INTO teams (account_id, join_code, visibility, join_policy, category, website, location) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [account.account_id, data.joinCode, data.visibility, data.joinPolicy, data.category || null, data.website || null, data.location || null])).rows[0];
    await client.query(`INSERT INTO team_members (team_id,user_id,role,status) VALUES ($1,$2,'Owner','Active')`, [team.team_id, ownerUserId]);
    await client.query('COMMIT');
    return { ...team, ...account };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function getUserId(accountId) { return (await pool.query('SELECT user_id FROM users WHERE account_id=$1', [accountId])).rows[0]?.user_id || null; }
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
    LEFT JOIN account_verification_sessions avs
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
  return (await pool.query(`SELECT t.*,a.display_name,a.handle,a.tagline,a.description,a.status AS account_status,f.path AS avatar_path,
    COALESCE(mc.member_count,0)::int member_count,tm.role current_user_role,tm.status current_user_status,
    COALESCE(v.is_verified,FALSE) is_business_verified,v.verified_at business_verified_at,
    COALESCE(cv.is_verified,FALSE)
      AND (cvs.expires_at IS NULL OR cvs.expires_at > NOW()) current_user_is_verified,
    avs.verification_status business_verification_status,
    o.display_name owner_name,o.handle owner_handle
    FROM teams t JOIN accounts a ON a.account_id=t.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id=t.account_id
    LEFT JOIN account_verification_sessions avs ON avs.verification_session_id=v.verification_session_id
    LEFT JOIN users cu ON cu.account_id=$2
    LEFT JOIN verifications cv ON cv.account_id=cu.account_id
    LEFT JOIN account_verification_sessions cvs ON cvs.verification_session_id=cv.verification_session_id
    LEFT JOIN team_members tm ON tm.team_id=t.team_id AND tm.user_id=cu.user_id
    LEFT JOIN (SELECT team_id,count(*) member_count FROM team_members WHERE status='Active' GROUP BY team_id) mc ON mc.team_id=t.team_id
    LEFT JOIN team_members om ON om.team_id=t.team_id AND om.role='Owner' AND om.status='Active' LEFT JOIN users ou ON ou.user_id=om.user_id LEFT JOIN accounts o ON o.account_id=ou.account_id
    WHERE t.team_id=$1 AND t.deleted_at IS NULL`, [teamId, accountId])).rows[0] || null;
}
async function listTeams(accountId, q='', mine=false, limit=20, offset=0) {
  return (await pool.query(`SELECT t.team_id,t.account_id,t.category,t.visibility,a.display_name,a.handle,a.description,f.path avatar_path,
    COALESCE(v.is_verified,FALSE) AS is_business_verified,
    count(am.user_id) FILTER (WHERE am.status='Active')::int member_count, mine.role current_user_role,mine.status current_user_status
    FROM teams t JOIN accounts a ON a.account_id=t.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id=t.account_id
    LEFT JOIN team_members am ON am.team_id=t.team_id LEFT JOIN users u ON u.account_id=$1 LEFT JOIN team_members mine ON mine.team_id=t.team_id AND mine.user_id=u.user_id
    WHERE t.deleted_at IS NULL AND ($2='' OR a.display_name ILIKE '%'||$2||'%' OR a.handle ILIKE '%'||$2||'%') AND ($3::boolean=FALSE OR mine.status='Active') AND (t.visibility='Public' OR mine.status='Active')
    GROUP BY t.team_id,a.account_id,f.path,v.is_verified,mine.role,mine.status ORDER BY a.display_name LIMIT $4 OFFSET $5`, [accountId,q,mine,limit,offset])).rows;
}
async function getMembership(teamId, accountId) { return (await pool.query(`SELECT tm.*,u.account_id,a.display_name,a.handle FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id WHERE tm.team_id=$1 AND u.account_id=$2`,[teamId,accountId])).rows[0]||null; }
async function listMembers(teamId, statuses=null) { return (await pool.query(`SELECT tm.*,u.account_id,a.display_name,a.handle,f.path avatar_path FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tm.team_id=$1 AND ($2::text[] IS NULL OR tm.status=ANY($2)) ORDER BY tm.joined_at`,[teamId,statuses])).rows; }
async function listJoinRequests(teamId, search='') { return (await pool.query(`SELECT tm.team_id,u.account_id,a.display_name,a.handle,f.path AS avatar_path,tm.role,tm.status,COALESCE(tm.updated_at,tm.joined_at) AS requested_at FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tm.team_id=$1 AND tm.status='Pending' AND ($2='' OR a.display_name ILIKE '%'||$2||'%' OR a.handle ILIKE '%'||$2||'%') ORDER BY COALESCE(tm.updated_at,tm.joined_at) DESC`,[teamId,search])).rows; }
async function upsertMembership(teamId,userId,role,status,invitedBy=null) { return (await pool.query(`INSERT INTO team_members(team_id,user_id,role,status,invited_by_account_id,invited_at,deleted_at) VALUES($1,$2,$3,$4::varchar,$5,CASE WHEN $4::varchar='Invited'::varchar THEN NOW() END,NULL) ON CONFLICT(team_id,user_id) DO UPDATE SET role=EXCLUDED.role,status=EXCLUDED.status,invited_by_account_id=EXCLUDED.invited_by_account_id,invited_at=EXCLUDED.invited_at,deleted_at=NULL,updated_at=NOW() RETURNING *`,[teamId,userId,role,status,invitedBy])).rows[0]; }
async function updateMembership(teamId,userId,fields) { const allowed=['role','status']; const entries=Object.entries(fields).filter(([k])=>allowed.includes(k)); const vals=entries.map(([,v])=>v); vals.push(teamId,userId); return (await pool.query(`UPDATE team_members SET ${entries.map(([k],i)=>`${k}=$${i+1}`).join(',')},updated_at=NOW() WHERE team_id=$${vals.length-1} AND user_id=$${vals.length} RETURNING *`,vals)).rows[0]||null; }
async function updateTeam(teamId, accountId, data) { const client=await pool.connect(); try { await client.query('BEGIN'); const a=(await client.query(`UPDATE accounts SET display_name=COALESCE($3,display_name),handle=COALESCE($4,handle),description=COALESCE($5,description),tagline=COALESCE($6,tagline),avatar_file_id=COALESCE($7,avatar_file_id) WHERE account_id=$1 AND EXISTS(SELECT 1 FROM teams WHERE team_id=$2 AND account_id=$1) RETURNING *`,[accountId,teamId,data.name,data.handle,data.description,data.tagline,data.avatarFileId])).rows[0]; const t=(await client.query(`UPDATE teams SET visibility=COALESCE($2,visibility),join_policy=COALESCE($3,join_policy),category=COALESCE($4,category),website=COALESCE($5,website),location=COALESCE($6,location),updated_at=NOW() WHERE team_id=$1 RETURNING *`,[teamId,data.visibility,data.joinPolicy,data.category,data.website,data.location])).rows[0]; await client.query('COMMIT'); return {...t,...a}; } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} }
async function softDeleteTeam(teamId){return (await pool.query(`UPDATE teams SET deleted_at=NOW() WHERE team_id=$1 RETURNING *`,[teamId])).rows[0];}
async function findByCode(code){return (await pool.query(`SELECT * FROM teams WHERE upper(join_code)=upper($1) AND deleted_at IS NULL`,[code])).rows[0]||null;}
async function transferOwnership(teamId,oldUserId,newUserId){const c=await pool.connect();try{await c.query('BEGIN');await c.query(`UPDATE team_members SET role='Admin',updated_at=NOW() WHERE team_id=$1 AND user_id=$2 AND role='Owner'`,[teamId,oldUserId]);await c.query(`UPDATE team_members SET role='Owner',updated_at=NOW() WHERE team_id=$1 AND user_id=$2 AND status='Active'`,[teamId,newUserId]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function wallet(teamId){return (await pool.query(`SELECT COALESCE(sum(w.balance_credits) FILTER(WHERE w.type='account wallets'),0)::int available_balance,COALESCE(sum(w.balance_credits) FILTER(WHERE w.type='escrow wallets'),0)::int escrow_balance,COALESCE(sum(w.frozen_balance_credits),0)::int frozen_balance,COALESCE(sum(w.balance_credits),0)::int total_balance FROM teams t JOIN account_wallets aw ON aw.account_id=t.account_id JOIN wallets w ON w.wallet_id=aw.wallet_id WHERE t.team_id=$1`,[teamId])).rows[0];}
async function getTeamTransactions(teamId,{page=1,pageSize=10,search='',dateFrom='',dateTo=''}={}){const limit=Math.min(Math.max(Number(pageSize)||10,1),50),offset=(Math.max(Number(page)||1,1)-1)*limit,term=String(search||'').trim();const filters=[`ct.reference_table='teams'`,`ct.reference_id=$1`],values=[teamId],add=(sql,value)=>{values.push(value);filters.push(`${sql}=$${values.length}`);};if(term)add(`destination.display_name ILIKE`, `%${term}%`);if(dateFrom)add(`ct.created_at >=`, dateFrom);if(dateTo)add(`ct.created_at <`, `${dateTo}T23:59:59.999Z`);const where=filters.join(' AND ');const total=(await pool.query(`SELECT COUNT(*)::int AS total FROM credit_transactions ct JOIN wallets destination_wallet ON destination_wallet.wallet_id=ct.destination_wallet_id JOIN account_wallets destination_aw ON destination_aw.wallet_id=destination_wallet.wallet_id JOIN accounts destination ON destination.account_id=destination_aw.account_id WHERE ${where}`,values)).rows[0].total;values.push(limit,offset);const items=(await pool.query(`SELECT ct.credit_transaction_id,ct.type,ct.amount_credits,ct.status,ct.created_at,destination.display_name AS recipient_name,destination.handle AS recipient_handle FROM credit_transactions ct JOIN wallets destination_wallet ON destination_wallet.wallet_id=ct.destination_wallet_id JOIN account_wallets destination_aw ON destination_aw.wallet_id=destination_wallet.wallet_id JOIN accounts destination ON destination.account_id=destination_aw.account_id WHERE ${where} ORDER BY ct.created_at DESC,ct.credit_transaction_id DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values)).rows;return{items,pagination:{page:Math.max(Number(page)||1,1),page_size:limit,total,total_pages:Math.max(Math.ceil(total/limit),1)}};}
async function distributeTeamFunds(teamId, recipients) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const source=(await client.query(`SELECT w.wallet_id,w.balance_credits,w.status FROM teams t JOIN account_wallets aw ON aw.account_id=t.account_id JOIN wallets w ON w.wallet_id=aw.wallet_id WHERE t.team_id=$1 AND t.deleted_at IS NULL AND w.type='account wallets' FOR UPDATE`,[teamId])).rows[0];
    if(!source||String(source.status).toLowerCase()!=='active')throw new Error('Team account wallet is unavailable');
    const recipientIds=recipients.map((recipient)=>recipient.account_id);
    const recipientWallets=(await client.query(`SELECT aw.account_id,w.wallet_id,w.status FROM account_wallets aw JOIN wallets w ON w.wallet_id=aw.wallet_id JOIN users u ON u.account_id=aw.account_id JOIN team_members tm ON tm.user_id=u.user_id WHERE tm.team_id=$1 AND tm.status='Active' AND aw.account_id=ANY($2::uuid[]) AND w.type='account wallets' ORDER BY w.wallet_id FOR UPDATE`,[teamId,recipientIds])).rows;
    if(recipientWallets.length!==recipients.length||recipientWallets.some((wallet)=>String(wallet.status).toLowerCase()!=='active'))throw new Error('Every recipient must be an active Team member with an active account wallet');
    const total=recipients.reduce((sum,recipient)=>sum+recipient.amount_credits,0);
    if(Number(source.balance_credits)<total)throw new Error('Insufficient available Team balance');
    await client.query('UPDATE wallets SET balance_credits=balance_credits-$1 WHERE wallet_id=$2',[total,source.wallet_id]);
    const walletsByAccountId=new Map(recipientWallets.map((wallet)=>[String(wallet.account_id),wallet]));
    const transactions=[];
    for(const recipient of recipients){const destination=walletsByAccountId.get(String(recipient.account_id));await client.query('UPDATE wallets SET balance_credits=balance_credits+$1 WHERE wallet_id=$2',[recipient.amount_credits,destination.wallet_id]);const transaction=(await client.query(`INSERT INTO credit_transactions (type,amount_credits,status,source_wallet_id,destination_wallet_id,fee_transaction_id,reference_table,reference_id) VALUES ('Fund Transfer',$1,'completed',$2,$3,NULL,'teams',$4) RETURNING *`,[recipient.amount_credits,source.wallet_id,destination.wallet_id,teamId])).rows[0];transactions.push({...transaction,recipient_account_id:recipient.account_id});}
    await client.query('COMMIT');
    return {transactions,distributed_credits:total,available_balance:Number(source.balance_credits)-total};
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
async function addReport(teamId,accountId,data){const team=await getTeam(teamId,accountId);return (await pool.query(`INSERT INTO reports(type,reference_table,reference_prefix,reference_id,status,by_account_id,for_account_id,target_type,target_id,description,updated_at) VALUES($1,'teams','TEAM',$2,'Open',$3,$4,'Team',$2,$5,NOW()) RETURNING *`,[data.category || 'Team Report',teamId,accountId,team.account_id,data.description])).rows[0];}
async function getTeamInbox(teamId){return TeamInbox.findOne({team_id:String(teamId),conversation_type:'group',deleted_at:null});}
async function createTeamInbox(team,members){const now=new Date();const result=await TeamInbox.insertOne({team_id:String(team.team_id),team_account_id:String(team.account_id),conversation_name:team.display_name,conversation_type:'group',conversation_image_key:team.avatar_path||null,members:members.map(m=>({account_id:String(m.account_id),role:m.role==='Owner'?'owner':'member',status:'active',joined_at:now})),pinned_messages:[],created_at:now,updated_at:now,deleted_at:null});return TeamInbox.findOne({_id:result.insertedId});}
async function syncTeamInboxMembers(teamId,members){const inbox=await getTeamInbox(teamId);if(!inbox)return null;const active=new Map(members.map(m=>[String(m.account_id),m])),now=new Date();const merged=(inbox.members||[]).map(m=>active.has(String(m.account_id))?{...m,status:'active',role:active.get(String(m.account_id)).role==='Owner'?'owner':'member'}:{...m,status:'removed',left_at:now});for(const m of members)if(!merged.some(x=>String(x.account_id)===String(m.account_id)))merged.push({account_id:String(m.account_id),role:m.role==='Owner'?'owner':'member',status:'active',joined_at:now});await TeamInbox.updateOne({_id:inbox._id},{$set:{members:merged,updated_at:now}});return TeamInbox.findOne({_id:inbox._id});}
module.exports={createTeam,getUserId,isActiveTeamOwner,getTeamOwnerVerificationEligibility,getActiveTeamOwnerAccountIds,getTeam,listTeams,getMembership,listMembers,listJoinRequests,upsertMembership,updateMembership,updateTeam,softDeleteTeam,findByCode,transferOwnership,wallet,getTeamTransactions,distributeTeamFunds,listMarketplacePosts,reviews,addReview,addReport,getTeamInbox,createTeamInbox,syncTeamInboxMembers};
