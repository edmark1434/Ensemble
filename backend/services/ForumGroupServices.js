const {
    createForumGroup,
    getForumGroupById,
    getAllForumGroups,
    getForumGroupsByMemberId,
    updateForumGroupRepositories,
    updateForumGroupMembers,
    deleteForumGroupRepositories,
    updateForumGroupMember,
    removeForumGroupMember,
} = require('../repositories/ForumGroupRepositories');
const { emitForumEvent } = require('../lib/WebSocket');
const { attachGroupMemberIdentities } = require('./ForumIdentityServices');
const dotenv = require('dotenv');
dotenv.config();
function actorId(session = {}) {
    return session.userId || session.accountId || session.account_id || null;
}
function isStaff(session = {}) {
    const role = String(session.role || session.staffRole || '').toLowerCase();
    return role.includes('moderator') || role === 'admin';
}
async function requireGroupManager(groupId, session, adminOnly = false) {
    const group = await getForumGroupById(groupId);
    if (!group) throw new Error('Forum group not found');
    if (isStaff(session)) return group;
    const member = group.members?.find((item) => String(item.userId) === String(actorId(session)) && !item.is_banned);
    if (!member || (adminOnly ? member.role !== 'Admin' : !['Admin', 'Moderator'].includes(member.role))) {
        throw new Error('Not authorized to manage this group');
    }
    return group;
}
function dataValidation(groupData, action = 'create') {
    if (action === 'create') {
        if (!groupData.groupName) {
            throw new Error('Group name is required');
        }
        if (!groupData.description) {
            throw new Error('Description is required');
        }
    }
    if(action === 'update'){
        if (!groupData.groupId) {
            throw new Error('Group ID is required for update');
        }
    }
    if (groupData.members && !Array.isArray(groupData.members)) {
        throw new Error('Members must be an array');
    }
    if (groupData.tags && !Array.isArray(groupData.tags)) {
        throw new Error('Tags must be an array');
    }
    if(groupData.imageUrl && typeof groupData.imageUrl !== 'string'){
        throw new Error('Image URL must be a string');
    }
    if(groupData.gradient && typeof groupData.gradient !== 'string'){
        throw new Error('Gradient must be a string');
    }
    return true;
}
async function createGroup(groupData){
    groupData.imageUrl = groupData.imageKey;
    delete groupData.imageKey;
    dataValidation(groupData);
    const groupId = await createForumGroup(groupData);
    const group = await getForumGroupById(groupId);
    emitForumEvent('group.created', { groupId: String(groupId), group });
    return groupId;
}

async function listForumGroups() {
    return await getAllForumGroups();
}

async function listForumGroupsByMemberId(memberId) {
    if (!memberId) {
        throw new Error('memberId is required');
    }

    return await getForumGroupsByMemberId(memberId);
}

async function getForumGroup(groupId) {
    dataValidation({ groupId }, 'update');
    const group = await getForumGroupById(groupId);
    return attachGroupMemberIdentities(group);
}

async function updateForumGroupServices(groupId, updatePayload, session = {}) {
    await requireGroupManager(groupId, session);
    const allowedFields = ['group_name', 'description', 'image_url', 'tags', 'gradient'];
    updatePayload = Object.fromEntries(Object.entries(updatePayload).filter(([key]) => allowedFields.includes(key)));
    if (!Object.keys(updatePayload).length) throw new Error('No valid group fields provided');
    dataValidation({ groupId, ...updatePayload }, 'update');
    const result = await updateForumGroupRepositories(groupId, updatePayload);
    const group = await getForumGroupById(groupId);
    emitForumEvent('group.updated', { groupId: String(groupId), group });
    return result;
}

async function listJoinedForumGroups(session = {}) {
    const id = actorId(session);
    if (!id) throw new Error('Authenticated user is required');
    return getForumGroupsByMemberId(id);
}

async function updateForumGroupMembersServices(groupId, updatePayload) {
    dataValidation({ groupId }, 'update');
    if(!updatePayload || updatePayload.length === 0){
        throw new Error('Update payload is required to update group members');
    }
    const group = await getForumGroupById(groupId);
    if (!group) throw new Error('Forum group not found');
    const existing = group.members?.find((item) => String(item.userId) === String(updatePayload.userId));
    if (existing?.is_banned) throw new Error('You are banned from this group');
    if (existing) return group;
    const result = await updateForumGroupMembers(groupId, updatePayload);
    const updatedGroup = await getForumGroupById(groupId);
    emitForumEvent('group.member_joined', { groupId: String(groupId), group: updatedGroup });
    return result;
}

async function setForumGroupMemberRoleServices(groupId, memberId, role, session = {}) {
    if (!['Admin', 'Moderator', 'Member'].includes(role)) throw new Error('Invalid group role');
    await requireGroupManager(groupId, session, true);
    const result = await updateForumGroupMember(groupId, memberId, { role });
    if (!result.matchedCount) throw new Error('Group member not found');
    emitForumEvent('group.member_updated', { groupId, memberId, role });
    return getForumGroupById(groupId);
}

async function setForumGroupMemberBanServices(groupId, memberId, isBanned, session = {}) {
    const group = await requireGroupManager(groupId, session);
    const target = group.members?.find((item) => String(item.userId) === String(memberId));
    if (!target) throw new Error('Group member not found');
    if (target.role === 'Admin' && !isStaff(session)) throw new Error('Group admins cannot be banned');
    await updateForumGroupMember(groupId, memberId, {
        is_banned: Boolean(isBanned),
        banned_at: isBanned ? new Date() : null,
        banned_by: isBanned ? actorId(session) : null,
    });
    emitForumEvent(isBanned ? 'group.member_banned' : 'group.member_unbanned', { groupId, memberId });
    return getForumGroupById(groupId);
}

async function removeForumGroupMemberServices(groupId, memberId, session = {}) {
    const group = await requireGroupManager(groupId, session);
    const target = group.members?.find((item) => String(item.userId) === String(memberId));
    if (!target) throw new Error('Group member not found');
    if (target.role === 'Admin') throw new Error('Group admins cannot be removed');
    await removeForumGroupMember(groupId, memberId);
    emitForumEvent('group.member_removed', { groupId, memberId });
    return getForumGroupById(groupId);
}

async function deleteForumGroupServices(groupId, session = {}) {
    await requireGroupManager(groupId, session, true);
    dataValidation({ groupId }, 'update');
    const group = await getForumGroupById(groupId);
    const result = await deleteForumGroupRepositories(groupId);
    emitForumEvent('group.deleted', { groupId: String(groupId), group });
    return result;
}

module.exports = {
    createGroup,
    listForumGroups,
    listForumGroupsByMemberId,
    listJoinedForumGroups,
    getForumGroup,
    updateForumGroupServices,
    updateForumGroupMembersServices,
    deleteForumGroupServices,
    setForumGroupMemberRoleServices,
    setForumGroupMemberBanServices,
    removeForumGroupMemberServices,
}
