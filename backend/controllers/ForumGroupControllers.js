const {
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
} = require('../services/ForumGroupServices');

async function createForumGroup(req, res) {
    try{
        let groupData = req.body;
        groupData.members = [{
            role: "Admin",
            userId: req.session.userId,
            joined_at: new Date(),
        }];
        groupData.tags = groupData.tags.map(tag => {
            return {
                tag,
                tag_id: Math.floor(Math.random() * 1000000),
            }
        });
        const newGroupId = await createGroup(groupData);
        res.status(201).json({ message: 'Forum group created successfully', groupId: newGroupId });
    }catch(err){
        console.error('Error in createForumGroup controller:', err);
        res.status(500).json({ error: 'Failed to create forum group' });
    }
}

async function getAllForumGroupsController(req, res) {
    try {
        const groups = await listForumGroups();
        res.status(200).json(groups);
    } catch (err) {
        console.error('Error fetching forum groups:', err);
        res.status(500).json({ error: 'Failed to fetch forum groups' });
    }
}

async function getForumGroupsByMemberIdController(req, res) {
    try {
        const groups = await listForumGroupsByMemberId(req.params.memberId);
        res.status(200).json(groups);
    } catch (err) {
        console.error('Error fetching forum groups by member id:', err);
        res.status(400).json({ error: err.message });
    }
}

async function getForumGroupByIdController(req, res) {
    try {
        const group = await getForumGroup(req.params.groupId);
        res.status(200).json(group);
    } catch (err) {
        console.error('Error fetching forum group by id:', err);
        res.status(400).json({ error: err.message });
    }
}

async function updateForumGroupController(req, res) {
    try {
        const result = await updateForumGroupServices(req.params.groupId, req.body, req.session);
        res.status(200).json({ message: 'Forum group updated successfully', result });
    } catch (err) {
        console.error('Error updating forum group:', err);
        res.status(400).json({ error: err.message });
    }
}

async function updateForumGroupMembersController(req, res){
    const user_id =  req.session?.userId || req.body.user_id;

    try{
        const result = await updateForumGroupMembersServices(req.params.groupId, {userId: user_id, joined_at: new Date(), role: 'Member'});
        res.status(200).json({ message: 'Forum group members updated successfully', result });
    }
    catch(err){
        console.error('Error updating forum group members:', err);
        res.status(400).json({ error: err.message });
    }
}

async function deleteForumGroupController(req, res) {
    try {
        const result = await deleteForumGroupServices(req.params.groupId, req.session);
        res.status(200).json({ message: 'Forum group deleted successfully', result });
    } catch (err) {
        console.error('Error deleting forum group:', err);
        res.status(400).json({ error: err.message });
    }
}

async function updateForumGroupMemberRoleController(req, res) {
    try {
        res.status(200).json(await setForumGroupMemberRoleServices(req.params.groupId, req.params.memberId, req.body.role, req.session));
    } catch (err) { res.status(400).json({ error: err.message }); }
}

async function getJoinedForumGroupsController(req, res) {
    try {
        res.status(200).json(await listJoinedForumGroups(req.session));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

async function updateForumGroupMemberBanController(req, res) {
    try {
        res.status(200).json(await setForumGroupMemberBanServices(req.params.groupId, req.params.memberId, req.body.isBanned, req.session));
    } catch (err) { res.status(400).json({ error: err.message }); }
}

async function removeForumGroupMemberController(req, res) {
    try {
        res.status(200).json(await removeForumGroupMemberServices(req.params.groupId, req.params.memberId, req.session));
    } catch (err) { res.status(400).json({ error: err.message }); }
}

module.exports = {
    createForumGroup,
    getAllForumGroupsController,
    getForumGroupsByMemberIdController,
    getJoinedForumGroupsController,
    getForumGroupByIdController,
    updateForumGroupController,
    updateForumGroupMembersController,
    deleteForumGroupController,
    updateForumGroupMemberRoleController,
    updateForumGroupMemberBanController,
    removeForumGroupMemberController,
}
