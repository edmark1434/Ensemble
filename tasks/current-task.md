# Current Task — Floating Chat Sync & Inbox Skeleton Loading

Sync the minimized floating chat stack with the chat system so it displays real recent conversations, and add a skeleton loading state to the inbox while data is fetching from the database.

## Acceptance Criteria

- [x] **Backend Member Profile Enrichment**:
  - In `backend/services/InboxServices.js`, enrich inboxes returned by `getAllInboxesByAccountIdServices` and `getInboxByAccountIdServices` with member names, handles, and avatars from PostgreSQL.
  - Set direct chat `conversation_name` and `profile_image` using the other member's profile if unset.
- [x] **Chat State & Floating Windows**:
  - In `frontend/src/components/ui/chat_bubble/chat_state.ts`, add `hasLoadedConversations` to track when initial conversations have loaded from DB.
  - Sanitize initial floating windows from `localStorage` so stale mock datasets do not persist.
  - Keep conversations sorted by recent message activity on new messages.
- [x] **Floating Chat Minimized Sync**:
  - In `frontend/src/components/ui/Layout.tsx`, derive `recentChats` from the chat system's real conversations, mapping each conversation to a `ChatTarget` (with proper name, avatar, and unread count).
  - In `frontend/src/components/ui/chat_bubble/chat_main.tsx`, sync minimized chats with `recentChats`, fix `closeWindow(chat)` bug, support dismissing from stack with `X`, and limit the stack height.
- [x] **Inbox Skeleton Loading**:
  - In `frontend/src/components/ui/inbox/inbox_components/inbox_list.tsx`, replace the small spinner with a skeleton loading list.
  - In `frontend/src/components/ui/inbox/inbox_main.tsx`, show the skeleton loading state until initial conversations finish fetching from DB.
  - In `frontend/src/components/ui/inbox/inbox_components/inbox_panel_viewmessage.tsx`, replace the text "Loading messages..." with skeleton message bubbles.
- [x] **Message Seen Receipts & Profile Avatars**:
  - In `backend/services/InboxServices.js`, enriched inbox members with full name fallback and real avatar URLs from `files` / `account_profile_files` (fixed `f2.created_at` column error).
  - In `backend/services/InboxServices.js` and `backend/lib/WebSocket.js`, emit `messagesSeen` across both conversation room and each individual member account room.
  - In `frontend/src/components/ui/inbox/inbox_main.tsx`, seed profiles synchronously from cached conversations, resolve real CDN/attachment avatar URLs, compute `seenReaderIds` for all conversation types (direct, marketplace, and group chats), and auto-mark active conversations as read.
  - In `frontend/src/components/ui/chat_bubble/chat_bubble_components/ChatWindow.tsx`, update seen avatar lookup to use real profile avatars instead of letter initials.
- [x] **Verification**:
  - `node -c backend/services/InboxServices.js` & `node -c backend/lib/WebSocket.js` exit code 0.
  - `cd frontend && npm run build` passed with 0 errors.

Status: Completed.

