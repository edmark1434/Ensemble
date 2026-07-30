const {
    createForumGroup,
    getForumGroupById,
    getAllForumGroups,
    getForumGroupsByMemberId,
    updateForumGroupRepositories,
    updateForumGroupMembers,
    deleteForumGroupRepositories,
} = require('../Repositories/ForumGroupRepositories');
const dotenv = require('dotenv');
dotenv.config();
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
    return await createForumGroup(groupData);
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
    return await getForumGroupById(groupId);
}

async function updateForumGroupServices(groupId, updatePayload) { 
    dataValidation({ groupId, ...updatePayload }, 'update');
    return await updateForumGroupRepositories(groupId, updatePayload);
}

async function updateForumGroupMembersServices(groupId, updatePayload) {
    dataValidation({ groupId }, 'update');
    if(!updatePayload || updatePayload.length === 0){
        throw new Error('Update payload is required to update group members');
    }
    return await updateForumGroupMembers(groupId, updatePayload);
}

async function deleteForumGroupServices(groupId) {
    dataValidation({ groupId }, 'update');
    return await deleteForumGroupRepositories(groupId);
}

module.exports = {
    createGroup,
    listForumGroups,
    listForumGroupsByMemberId,
    getForumGroup,
    updateForumGroupServices,
    updateForumGroupMembersServices,
    deleteForumGroupServices,
}