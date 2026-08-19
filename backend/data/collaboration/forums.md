# Forums

Routes: `/forums`, `/forums/group/:id`, `/forums/discussion/:postId`

Sources:

- `frontend/src/pages/user/4_forums/Forums.tsx`
- `frontend/src/pages/user/4_forums/SelectedGroup.tsx`
- `frontend/src/pages/user/4_forums/ExpandDiscussion.tsx`
- `frontend/src/pages/user/4_forums/forum_modals/NewDiscussionModal.tsx`
- `frontend/src/pages/user/4_forums/forum_modals/EditPostModal.tsx`
- `frontend/src/pages/user/4_forums/forum_modals/CreateGroupModal.tsx`

## Forum groups and discussions

The forum area lets users browse groups, open a selected group, and view an individual discussion. Authorized interfaces support creating groups and creating or editing discussions.

## Discussion participation

Discussion pages support posts, comments, replies, and reactions according to the current account's permissions. Media uploads use the platform's prepared-upload flow and effective file-size rules.

## Forum reports and moderation

Forum content can enter report, ticket, dispute, or moderation workflows. Forum moderators have a specialist queue for groups, posts, comments, discussions, and forum reports.

Dynamic group and discussion routes require a real identifier and accessible resource. The assistant must not claim content was removed, restored, or moderated without an authorized backend action.
