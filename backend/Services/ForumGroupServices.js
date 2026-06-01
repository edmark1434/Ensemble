const {
    createForumGroup,
    getForumGroupById,
    getAllForumGroups,
    getForumGroupsByMemberId,
} = require('../Repositories/ForumGroupRepositories');
const dotenv = require('dotenv');
dotenv.config();
function dataValidation(groupData){
    if (!groupData.groupName) {
        throw new Error('Group name is required');
    }
    if (!groupData.description) {
        throw new Error('Description is required');
    }
    if (!Array.isArray(groupData.members)) {
        throw new Error('Members must be an array');
    }
    if (!Array.isArray(groupData.tags)) {
        throw new Error('Tags must be an array');
    }
    if(groupData.imageUrl && typeof groupData.imageUrl !== 'string'){
        throw new Error('Image URL must be a string');
    }
    return true;
}
async function createGroup(groupData){
    dataValidation(groupData);
    return await createForumGroup(groupData);
}



module.exports = {
    createGroup,
}