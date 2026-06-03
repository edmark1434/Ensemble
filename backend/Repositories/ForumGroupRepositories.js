const { ObjectId } = require('mongodb');
const { client } = require('../lib/mongodb');
const db = client.db('ensemble');
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
        const forumGroupsCollection = db.collection('forum_groups');
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
        const forumGroupsCollection = db.collection('forum_groups');
            const result = await forumGroupsCollection.findOne({ _id: new ObjectId(groupId),status: 'active' });
        return result;
    }catch(err){
        console.error(`Error fetching forum group with id ${groupId}:`, err);
        throw err;
    }
}

async function getAllForumGroups(){
    try{
        const forumGroupsCollection = db.collection('forum_groups');
        const result = await forumGroupsCollection.find({status: 'active'}).toArray();
        return result;
    }catch(err){
        console.error('Error fetching all forum groups:', err);
        throw err;
    }
}

async function getForumGroupsByMemberId(memberId){
    try{
        const forumGroupsCollection = db.collection('forum_groups');
        const normalizedMemberId = Number.isNaN(Number(memberId)) ? memberId : Number(memberId);
        const result = await forumGroupsCollection.find({ 'members.userId': normalizedMemberId, status: 'active' }).toArray();
        return result;
    }catch(err){
        console.error(`Error fetching forum groups for member id ${memberId}:`, err);
        throw err;
    }
}

async function updateForumGroupRepositories(groupId, updateData) { 
    try {
        const forumGroupsCollection = db.collection('forum_groups');
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

async function deleteForumGroupRepositories(groupId) { 
    try {
        const forumGroupsCollection = db.collection('forum_groups');
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

module.exports = {
    createForumGroup,
    getForumGroupById,
    getAllForumGroups,
    getForumGroupsByMemberId,
    updateForumGroupRepositories,
    deleteForumGroupRepositories,
}