# Current Task — Suspended Accounts Stay Signed In

Suspended accounts, including Google sign-in, can still use Ensemble. The suspension stays highly visible and a notification is sent. Banned and locked accounts remain blocked.

## Acceptance Criteria

- [x] Suspended is not a login or session block. Banned, locked, and deleted accounts still are.
- [x] Google sign-in for an existing suspended account creates a session and returns the suspension on the user.
- [x] A persistent amber notice stays on screen while the account is suspended.
- [x] Suspending an account, including the automatic warning limit, creates an in-app notification and broadcasts it.

# Previous Task — Enforce Suspend, Ban, and Violation Notices

Make account suspend and ban actually stop platform access, and show a highly visible notice for banned, suspended, locked, and warned accounts.

## Acceptance Criteria

- [x] Login, refresh, session, JWT, and Socket.IO reject accounts whose status is Banned, Suspended, or Locked, and clear the existing session.
- [x] Login and staff/admin sign-in show a large restriction notice with active violations.
- [x] An in-app full-screen notice appears when a live session is rejected.
- [x] Active accounts with open violations see a sticky warning banner.
# Current Task — Gigs Final Confirmation before Deduction of Credits

Transition Gig order acceptance and contract funding from the previous unilateral deduction by the freelancer to a mutual two-step handshake:
1. **Freelancer Acceptance**: Freelancer accepts gig order; order status transitions to `'Accepted'` without deducting client wallet credits. Client receives real-time notification to review and confirm contract.
2. **Client Final Confirmation & Deduction**: Client visits `/gigs/orders/sent/:orderId`, reviews terms and credit deduction, certifies agreement, and confirms contract. Backend validates balance, holds credits in escrow, generates contract + milestones, updates order status to `'In Contract'`, and starts the contract.

## Implementation Objectives
- [x] **Backend - Repository Layer (`GigRepositories.js`)**:
  - Refactor `acceptGigOrderRepository`:
    - Validates order is `Pending` or `Shortlisted`.
    - Updates `gig_requests.status = 'Accepted'`.
    - Does NOT deduct credits or create contract.
    - Returns order info (orderId, status, client_account_id, freelancer_account_id, gig_title).
  - Add `confirmGigOrderContractRepository(orderId, clientAccountIds)`:
    - Validates order belongs to client and is in `'Accepted'` status.
    - Prevents race conditions with `FOR UPDATE OF gr` and checks `gig_contracts` for duplicates.
    - Locks client account wallet and freelancer escrow wallet `FOR UPDATE`.
    - Checks `clientWallet.balance_credits >= rate_credits`.
    - Atomically debits client wallet and credits freelancer escrow wallet (`'Escrow Hold'`).
    - Creates contract (`status = 'Active'`), `credit_transactions`, `gig_contracts`, and `contract_milestones`.
    - Updates `gig_requests.status = 'In Contract'`.
    - Returns `{ contractId, gig_title, freelancer_account_id, client_account_id }`.
  - Update `getOrderByIdRepository`, `getMyOrdersRepository`, and `getIncomingOrdersRepository`:
    - `LEFT JOIN gig_contracts gc ON r.gig_request_id = gc.gig_request_id` to include `gc.contract_id as contract_id`.
  - Update duplicate order check to include `'shortlisted'` and `'in contract'`.
- [x] **Backend - Service & Controller Layer (`GigServices.js`, `GigControllers.js`, `Gig.js`)**:
  - In `GigServices.js`:
    - Add `acceptGigOrderService(orderId, actorIds)`: calls repository and sends notification/socket event to client.
    - Add `confirmGigOrderContractService(orderId, actorIds)`: calls repository and sends notification/socket events to both client and freelancer.
  - In `GigControllers.js`:
    - Update `acceptGigOrderController`: invokes `acceptGigOrderService`.
    - Add `confirmGigOrderContractController`: invokes `confirmGigOrderContractService`.
  - In `Gig.js`:
    - Register route `POST /orders/:orderId/confirm-contract`.
- [x] **Frontend - Incoming Order Detail (`incoming_order_detail.tsx`)**:
  - Update "Accept Gig Order" modal to clarify that accepting will notify the client to review, agree to terms, and fund the contract in escrow.
  - When order is in `'Accepted'` status, show an informative banner: "Order Accepted — Awaiting Client Confirmation & Escrow Funding", with discussion chat button.
  - If contract is already created (`order.contract_id`), show button to "View Active Contract".
- [x] **Frontend - Sent Order Detail (`sent_order_detail.tsx`)**:
  - When `order.status === 'Accepted'` and no `contract_id`:
    - Prominently display the "Freelancer Accepted Your Order - Final Confirmation & Contract Funding" panel.
    - Fetch and display the client's current wallet balance (`/api/accounts/wallet`).
    - Display required credits, balance status (sufficient vs. insufficient), and link to top up credits if needed.
    - Add Terms of Service agreement checkbox and "Confirm & Start Contract" button.
    - On confirmation, post to `/api/gigs/orders/:orderId/confirm-contract`, show success toast, and navigate to `/contracts/:contractId`.
  - When `order.status === 'In Contract'` or `order.contract_id` exists:
    - Display "Contract Active" badge and "View Active Contract" button linking to `/contracts/:contractId`.
- [x] **Frontend - Orders List & Badges (`orders_list.tsx`, `sent_orders.tsx`, `incoming_orders.tsx`, `orders_main.tsx`, `orders_statuses.tsx`)**:
  - Support `'In Contract'` and `'Shortlisted'` status badges and counts.
  - Add quick action for client when `'Accepted'` to "Confirm & Fund" or when `'In Contract'` to "View Contract".
- [x] **Recent Fixes — Order Placement, Duplicate Checks & Orders Count**:
  - **Duplicate Active Order Check (`GigRepositories.js`)**: Updated `submitGigOrderRepository` duplicate check to join `contracts c`. Cancelled, closed, or completed contracts no longer block placing a new order. Added auto-healing query to sync stale `'In Contract'` orders whose linked contracts were cancelled/closed to `'Cancelled'` (or `'Completed'` if done).
  - **Contract Cancellation Sync (`MilestoneRepositories.js`, `DashboardRepositories.js`)**: Ensured `cancelContractAndRefundUnfinishedMilestones`, `adminRefundStalledMilestone`, `approveMilestoneSubmit`, and `submitContractReview` properly update linked `gig_requests.status` to `'Cancelled'` or `'Completed'`.
  - **Order Status Resolution (`GigRepositories.js`)**: `getIncomingOrdersRepository`, `getMyOrdersRepository`, `getOrderByIdRepository`, and `getGigByIdRepository` now resolve true status by joining `contracts`.
  - **Order Notification & CTA Rename**: Sent real-time notification to the freelancer upon order placement. Renamed "Pay with Credits" to "Request to Order" and removed the shortlist button from gig order detail.
  - **Orders Count Display (`orders_select_gig_page.tsx`)**: Replaced hardcoded `0` with `{gig.ordersCount || 0}`.
- [x] **Verification**:
  - `node --check` on all modified backend files passed.
  - `npm run build` on `frontend` passed.

