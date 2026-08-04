const { pool } = require('../lib/database');
const { lazyCollection } = require('../lib/mongodb');
const TeamInbox = lazyCollection('inbox');

async function createTeam(data, ownerUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = (await client.query(`INSERT INTO accounts (display_name, handle, type, tagline, description, status, avatar_file_id) VALUES ($1,$2,'Team',$3,$4,'Active',$5) RETURNING *`, [data.name, data.handle, data.tagline || null, data.description || null, data.avatarFileId || null])).rows[0];
    const team = (await client.query(`INSERT INTO teams (account_id, join_code, visibility, join_policy, category, website, location) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [account.account_id, data.joinCode, data.visibility, data.joinPolicy, data.category || null, data.website || null, data.location || null])).rows[0];
    await client.query(`INSERT INTO team_members (team_id,user_id,role,status) VALUES ($1,$2,'Owner','Active')`, [team.team_id, ownerUserId]);
    await client.query('COMMIT');
    return { ...team, ...account };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function getUserId(accountId) { return (await pool.query('SELECT user_id FROM users WHERE account_id=$1', [accountId])).rows[0]?.user_id || null; }
async function getTeam(teamId, accountId) {
  return (await pool.query(`SELECT t.*,a.display_name,a.handle,a.tagline,a.description,a.status AS account_status,f.path AS avatar_path,
    COALESCE(mc.member_count,0)::int member_count,tm.role current_user_role,tm.status current_user_status,
    o.display_name owner_name,o.handle owner_handle
    FROM teams t JOIN accounts a ON a.account_id=t.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id
    LEFT JOIN users cu ON cu.account_id=$2 LEFT JOIN team_members tm ON tm.team_id=t.team_id AND tm.user_id=cu.user_id
    LEFT JOIN (SELECT team_id,count(*) member_count FROM team_members WHERE status='Active' GROUP BY team_id) mc ON mc.team_id=t.team_id
    LEFT JOIN team_members om ON om.team_id=t.team_id AND om.role='Owner' AND om.status='Active' LEFT JOIN users ou ON ou.user_id=om.user_id LEFT JOIN accounts o ON o.account_id=ou.account_id
    WHERE t.team_id=$1 AND t.deleted_at IS NULL`, [teamId, accountId])).rows[0] || null;
}
async function listTeams(accountId, q='', mine=false, limit=20, offset=0) {
  return (await pool.query(`SELECT t.team_id,t.account_id,t.category,t.visibility,a.display_name,a.handle,a.description,f.path avatar_path,
    count(am.user_id) FILTER (WHERE am.status='Active')::int member_count, mine.role current_user_role,mine.status current_user_status
    FROM teams t JOIN accounts a ON a.account_id=t.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id
    LEFT JOIN team_members am ON am.team_id=t.team_id LEFT JOIN users u ON u.account_id=$1 LEFT JOIN team_members mine ON mine.team_id=t.team_id AND mine.user_id=u.user_id
    WHERE t.deleted_at IS NULL AND ($2='' OR a.display_name ILIKE '%'||$2||'%' OR a.handle ILIKE '%'||$2||'%') AND ($3::boolean=FALSE OR mine.status='Active') AND (t.visibility='Public' OR mine.status='Active')
    GROUP BY t.team_id,a.account_id,f.path,mine.role,mine.status ORDER BY a.display_name LIMIT $4 OFFSET $5`, [accountId,q,mine,limit,offset])).rows;
}
async function getMembership(teamId, accountId) { return (await pool.query(`SELECT tm.*,u.account_id,a.display_name,a.handle FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id WHERE tm.team_id=$1 AND u.account_id=$2`,[teamId,accountId])).rows[0]||null; }
async function listMembers(teamId, statuses=null) { return (await pool.query(`SELECT tm.*,u.account_id,a.display_name,a.handle,f.path avatar_path FROM team_members tm JOIN users u ON u.user_id=tm.user_id JOIN accounts a ON a.account_id=u.account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tm.team_id=$1 AND ($2::text[] IS NULL OR tm.status=ANY($2)) ORDER BY tm.joined_at`,[teamId,statuses])).rows; }
async function upsertMembership(teamId,userId,role,status,invitedBy=null) { return (await pool.query(`INSERT INTO team_members(team_id,user_id,role,status,invited_by_account_id,invited_at,deleted_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $4='Invited' THEN NOW() END,NULL) ON CONFLICT(team_id,user_id) DO UPDATE SET role=EXCLUDED.role,status=EXCLUDED.status,invited_by_account_id=EXCLUDED.invited_by_account_id,invited_at=EXCLUDED.invited_at,deleted_at=NULL,updated_at=NOW() RETURNING *`,[teamId,userId,role,status,invitedBy])).rows[0]; }
async function updateMembership(teamId,userId,fields) { const allowed=['role','status']; const entries=Object.entries(fields).filter(([k])=>allowed.includes(k)); const vals=entries.map(([,v])=>v); vals.push(teamId,userId); return (await pool.query(`UPDATE team_members SET ${entries.map(([k],i)=>`${k}=$${i+1}`).join(',')},updated_at=NOW() WHERE team_id=$${vals.length-1} AND user_id=$${vals.length} RETURNING *`,vals)).rows[0]||null; }
async function updateTeam(teamId, accountId, data) { const client=await pool.connect(); try { await client.query('BEGIN'); const a=(await client.query(`UPDATE accounts SET display_name=COALESCE($3,display_name),handle=COALESCE($4,handle),description=COALESCE($5,description),tagline=COALESCE($6,tagline),avatar_file_id=COALESCE($7,avatar_file_id) WHERE account_id=$1 AND EXISTS(SELECT 1 FROM teams WHERE team_id=$2 AND account_id=$1) RETURNING *`,[accountId,teamId,data.name,data.handle,data.description,data.tagline,data.avatarFileId])).rows[0]; const t=(await client.query(`UPDATE teams SET visibility=COALESCE($2,visibility),join_policy=COALESCE($3,join_policy),category=COALESCE($4,category),website=COALESCE($5,website),location=COALESCE($6,location),updated_at=NOW() WHERE team_id=$1 RETURNING *`,[teamId,data.visibility,data.joinPolicy,data.category,data.website,data.location])).rows[0]; await client.query('COMMIT'); return {...t,...a}; } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();} }
async function softDeleteTeam(teamId){return (await pool.query(`UPDATE teams SET deleted_at=NOW() WHERE team_id=$1 RETURNING *`,[teamId])).rows[0];}
async function findByCode(code){return (await pool.query(`SELECT * FROM teams WHERE upper(join_code)=upper($1) AND deleted_at IS NULL`,[code])).rows[0]||null;}
async function transferOwnership(teamId,oldUserId,newUserId){const c=await pool.connect();try{await c.query('BEGIN');await c.query(`UPDATE team_members SET role='Admin',updated_at=NOW() WHERE team_id=$1 AND user_id=$2 AND role='Owner'`,[teamId,oldUserId]);await c.query(`UPDATE team_members SET role='Owner',updated_at=NOW() WHERE team_id=$1 AND user_id=$2 AND status='Active'`,[teamId,newUserId]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function wallet(teamId){return (await pool.query(`SELECT COALESCE(sum(w.balance_credits) FILTER(WHERE w.type='account wallets'),0)::int available_balance,COALESCE(sum(w.balance_credits) FILTER(WHERE w.type='escrow wallets'),0)::int escrow_balance,COALESCE(sum(w.frozen_balance_credits),0)::int frozen_balance,COALESCE(sum(w.balance_credits),0)::int total_balance FROM teams t JOIN account_wallets aw ON aw.account_id=t.account_id JOIN wallets w ON w.wallet_id=aw.wallet_id WHERE t.team_id=$1`,[teamId])).rows[0];}
async function reviews(teamId){return (await pool.query(`SELECT tr.*,a.display_name,a.handle,f.path avatar_path FROM team_reviews tr JOIN accounts a ON a.account_id=tr.reviewer_account_id LEFT JOIN files f ON f.file_id=a.avatar_file_id WHERE tr.team_id=$1 ORDER BY tr.created_at DESC`,[teamId])).rows;}
async function addReview(teamId,accountId,data){return (await pool.query(`INSERT INTO team_reviews(team_id,reviewer_account_id,rating,comment,reference_type,reference_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[teamId,accountId,data.rating,data.comment||null,data.referenceType||null,data.referenceId||null])).rows[0];}
async function addReport(teamId,accountId,data){const team=await getTeam(teamId,accountId);return (await pool.query(`INSERT INTO reports(type,reference_table,reference_prefix,reference_id,status,by_account_id,for_account_id,target_type,target_id,target_label,reason,description) VALUES('Team Report','teams','TEAM',$1,'Open',$2,$3,'Team',$1,$4,$5,$6) RETURNING *`,[teamId,accountId,team.account_id,team.display_name,data.category,data.description])).rows[0];}
async function getTeamInbox(teamId){return TeamInbox.findOne({team_id:String(teamId),conversation_type:'group',deleted_at:null});}
async function createTeamInbox(team,members){const now=new Date();const result=await TeamInbox.insertOne({team_id:String(team.team_id),team_account_id:String(team.account_id),conversation_name:team.display_name,conversation_type:'group',conversation_image_key:team.avatar_path||null,members:members.map(m=>({account_id:String(m.account_id),role:m.role==='Owner'?'owner':'member',status:'active',joined_at:now})),pinned_messages:[],created_at:now,updated_at:now,deleted_at:null});return TeamInbox.findOne({_id:result.insertedId});}
async function syncTeamInboxMembers(teamId,members){const inbox=await getTeamInbox(teamId);if(!inbox)return null;const active=new Map(members.map(m=>[String(m.account_id),m])),now=new Date();const merged=(inbox.members||[]).map(m=>active.has(String(m.account_id))?{...m,status:'active',role:active.get(String(m.account_id)).role==='Owner'?'owner':'member'}:{...m,status:'removed',left_at:now});for(const m of members)if(!merged.some(x=>String(x.account_id)===String(m.account_id)))merged.push({account_id:String(m.account_id),role:m.role==='Owner'?'owner':'member',status:'active',joined_at:now});await TeamInbox.updateOne({_id:inbox._id},{$set:{members:merged,updated_at:now}});return TeamInbox.findOne({_id:inbox._id});}
module.exports={createTeam,getUserId,getTeam,listTeams,getMembership,listMembers,upsertMembership,updateMembership,updateTeam,softDeleteTeam,findByCode,transferOwnership,wallet,reviews,addReview,addReport,getTeamInbox,createTeamInbox,syncTeamInboxMembers};
