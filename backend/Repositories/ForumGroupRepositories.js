const {client } = require('../lib/mongodb');

async function createForumGroup({
    imageUrl = null,
    groupName = null,
    description = null,
    members = [],
    tags=[],
}){
    try{
        const db = client.db('ensemble');
        const forumGroupsCollection = db.collection('forum_groups');
        const result = await forumGroupsCollection.insertOne({
            image_url: imageUrl,
            group_name: groupName,
            description,
            members,
            tags,
        });
        return result.insertedId;
    }catch(err){
        console.error('Error creating forum group:', err);
        throw err;
    }
}

async function getForumGroupById(groupId){
    try{
        const db = client.db('ensemble');
        const forumGroupsCollection = db.collection('forum_groups');
        const result = await forumGroupsCollection.findOne({ _id: new ObjectId(groupId) });
        return result;
    }catch(err){
        console.error(`Error fetching forum group with id ${groupId}:`, err);
        throw err;
    }
}

async function getAllForumGroups(){
    try{
        const db = client.db('ensemble');
        const forumGroupsCollection = db.collection('forum_groups');
        const result = await forumGroupsCollection.find({}).toArray();
        return result;
    }catch(err){
        console.error('Error fetching all forum groups:', err);
        throw err;
    }
}

async function getForumGroupsByMemberId(memberId){
    try{
        const db = client.db('ensemble');
        const forumGroupsCollection = db.collection('forum_groups');
        const result = await forumGroupsCollection.find({ members: memberId }).toArray();
        return result;
    }catch(err){
        console.error(`Error fetching forum groups for member id ${memberId}:`, err);
        throw err;
    }
}

module.exports = {
    createForumGroup,
    getForumGroupById,
    getAllForumGroups,
    getForumGroupsByMemberId,
}