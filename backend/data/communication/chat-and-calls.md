# Chat, Inbox, Calls, and Meetings

Primary route: `/inbox/*`

Sources:

- `frontend/src/components/ui/inbox/inbox_main.tsx`
- `frontend/src/components/ui/inbox/inbox_dataset.tsx`
- `frontend/src/components/ui/chat_bubble/chat_state.ts`
- `frontend/src/components/ui/chat_bubble/chat_bubble_components/ChatWindow.tsx`
- `frontend/src/components/ui/chat_bubble/chat_bubble_components/CallOverlay.tsx`

## Conversations

The inbox supports direct, group, job, gig, and marketplace-related conversations. Conversations can carry listing context such as a title, preview, and route back to the related item.

## Messages

The chat state supports:

- sending messages and attachments
- replying to messages
- editing and deleting messages
- message reactions
- pinning messages
- typing and online indicators
- unread counts

Permissions and conversation membership determine which actions are available.

## Groups

Users can create group conversations and, where authorized, manage member roles or status and update the group profile image.

## Calls

The interface supports browser-based direct and group call signaling, including ringing, active, busy, reject, end, media-state, and participant-left states. Camera and microphone availability depend on browser permission and connection conditions.

## Google Meet

Google Meet flows support requested, scheduled, active, and ended meeting states. Creating a meeting requires the server-side Google integration to be configured and the requesting account to connect Google when required.

The documentation assistant cannot join, create, end, or inspect a private conversation unless an authorized backend action explicitly provides that capability.
