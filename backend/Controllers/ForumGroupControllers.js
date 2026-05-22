const {
    createGroup,
} = require('../Services/ForumGroupServices');

async function createForumGroup(req, res) {
    try{
        let groupData = req.body;
        groupData.members = [{
            role: "Admin",
            userId: req.session.userId
        }];
        const newGroupId = await createGroup(groupData);
        res.status(201).json({ message: 'Forum group created successfully', groupId: newGroupId });
    }catch(err){
        console.error('Error in createForumGroup controller:', err);
        res.status(500).json({ error: 'Failed to create forum group' });
    }
}
module.exports = {
    createForumGroup,
}