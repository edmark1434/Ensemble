const { getPublicForumUserIdentities } = require('../repositories/UserRepositories');

async function resolvePublicForumIdentities(userIds = []) {
    const identities = await getPublicForumUserIdentities(userIds);
    return new Map(identities.map((identity) => [String(identity.user_id), identity]));
}

async function attachDiscussionIdentities(discussions = []) {
    const userIds = discussions.flatMap((discussion) => [
        discussion.user_id,
        ...(discussion.comments || []).map((comment) => comment.user_id),
    ]);
    const identities = await resolvePublicForumIdentities(userIds);

    return discussions.map((discussion) => ({
        ...discussion,
        author_identity: identities.get(String(discussion.user_id)) || null,
        comments: (discussion.comments || []).map((comment) => ({
            ...comment,
            author_identity: identities.get(String(comment.user_id)) || null,
        })),
    }));
}

async function attachGroupMemberIdentities(group) {
    if (!group) return group;
    const identities = await resolvePublicForumIdentities(
        (group.members || []).map((member) => member.userId)
    );

    return {
        ...group,
        members: (group.members || []).map((member) => ({
            ...member,
            identity: identities.get(String(member.userId)) || null,
        })),
    };
}

module.exports = {
    attachDiscussionIdentities,
    attachGroupMemberIdentities,
};
