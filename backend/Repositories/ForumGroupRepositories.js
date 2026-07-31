const { ObjectId } = require('mongodb');
const { getMongoClient } = require('../lib/mongodb');

function getForumDb() {
  const client = getMongoClient();
  if (!client) {
    throw new Error('MongoDB is not connected. Set MONGODB_URI in backend/.env to use forum features.');
  }
  return client.db('ensemble');
}

async function createForumGroup({
    imageUrl = null,
    groupName = null,
    description = null,
    members = [],
    tags = [],
    created_at = new Date(),
    gradient = null,
    deleted_at = null,
    status = 'active',
}){
    try{
        const forumGroupsCollection = getForumDb().collection('forum_groups');
        const result = await forumGroupsCollection.insertOne({
            image_url: imageUrl,
            group_name: groupName,
            description,
            members,
            tags,
            created_at,
            gradient,
            deleted_at,
            status,
        });
        return result.insertedId;
    }catch(err){
        console.error('Error creating forum group:', err);
        throw err;
    }
}

async function getForumGroupById(groupId){
    try{
        const forumGroupsCollection = getForumDb().collection('forum_groups');
            const result = await forumGroupsCollection.findOne({ _id: new ObjectId(groupId), status: 'active', deleted_at: null });
        return result;
    }catch(err){
        console.error(`Error fetching forum group with id ${groupId}:`, err);
        throw err;
    }
}

async function getAllForumGroups(){
    try{
        const forumGroupsCollection = getForumDb().collection('forum_groups');
        const result = await forumGroupsCollection.find({ status: 'active', deleted_at: null }).toArray();
        return result;
    }catch(err){
        console.error('Error fetching all forum groups:', err);
        throw err;
    }
}

async function getForumGroupsByMemberId(memberId){
    try{
        const forumGroupsCollection = getForumDb().collection('forum_groups');
        const normalizedMemberId = Number.isNaN(Number(memberId)) ? memberId : Number(memberId);
        const result = await forumGroupsCollection.find({
            members: { $elemMatch: { userId: normalizedMemberId, is_banned: { $ne: true } } },
            status: 'active',
            deleted_at: null,
        }).toArray();
        return result;
    }catch(err){
        console.error(`Error fetching forum groups for member id ${memberId}:`, err);
        throw err;
    }
}

async function updateForumGroupRepositories(groupId, updateData) {
    try {
        const forumGroupsCollection = getForumDb().collection('forum_groups');
        const result = await forumGroupsCollection.updateOne(
            { _id: new ObjectId(groupId), status: 'active' },
            { $set: updateData }
        );
        return result;
    }catch(err) {
        console.error(`Error updating forum group with id ${groupId}:`, err);
        throw err;
    }
}

async function updateForumGroupMembers(groupId, updateData) {
    try {
        const forumGroupsCollection = getForumDb().collection('forum_groups');
        const result = await forumGroupsCollection.updateOne(
            { _id: new ObjectId(groupId), status: 'active' },
            { $push: {
                members: updateData
            } }
        );
        return result;
    }catch(err) {
        console.error(`Error updating forum group members with id ${groupId}:`, err);
        throw err;
    }
}

async function deleteForumGroupRepositories(groupId) {
    try {
        const forumGroupsCollection = getForumDb().collection('forum_groups');
        const result = await forumGroupsCollection.updateOne(
            { _id: new ObjectId(groupId), status: 'active' },
            { $set: { deleted_at: new Date(), status: 'inactive' } }
        );
        return result;
    }catch(err) {
        console.error(`Error deleting forum group with id ${groupId}:`, err);
        throw err;
    }
}

async function updateForumGroupMember(groupId, memberId, fields) {
    const normalizedMemberId = Number.isNaN(Number(memberId)) ? memberId : Number(memberId);
    const updates = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`members.$.${key}`, value]));
    return getForumDb().collection('forum_groups').updateOne(
        { _id: new ObjectId(groupId), 'members.userId': normalizedMemberId },
        { $set: updates }
    );
}

async function removeForumGroupMember(groupId, memberId) {
    const normalizedMemberId = Number.isNaN(Number(memberId)) ? memberId : Number(memberId);
    return getForumDb().collection('forum_groups').updateOne(
        { _id: new ObjectId(groupId) },
        { $pull: { members: { userId: normalizedMemberId } } }
    );
}

module.exports = {
    createForumGroup,
    getForumGroupById,
    getAllForumGroups,
    getForumGroupsByMemberId,
    updateForumGroupRepositories,
    updateForumGroupMembers,
    deleteForumGroupRepositories,
    updateForumGroupMember,
    removeForumGroupMember,
}
