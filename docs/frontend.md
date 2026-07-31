# Frontend Structure

Forum frontend lives in

frontend/src/pages/user/4_forums/

Main pages include

- Forums.tsx
- SelectedGroup.tsx
- ExpandDiscussion.tsx

Modals include

- CreateGroupModal.tsx
- EditGroupModal.tsx
- DeleteGroupModal.tsx
- LeaveGroupModal.tsx

- NewDiscussionModal.tsx
- EditDiscussionModal.tsx
- DeleteDiscussionModal.tsx

- EditPostModal.tsx
- DeletePostModal.tsx

- RemoveMemberModal.tsx
- ReportMemberModal.tsx

---

## Responsibilities

Frontend handles

- Rendering
- Forms
- State
- API requests
- WebSocket events
- Optimistic UI updates

Backend is responsible for validation.

---

## UI Goal

The forums should feel similar to Reddit.

Support

- Infinite scrolling
- Replies
- Nested comments
- Live updates
- Smooth interactions

Avoid unnecessary rerenders.