# Support, Feedback, and Notifications

## Submit a ticket

Route: `/landing/SubmitATicket`

Source: `frontend/src/pages/landing/pages/page_SubmitATicket.tsx`

An authenticated user can submit a support ticket by selecting a ticket type and providing a subject and detailed description. Unauthenticated users are redirected to login. Submitted tickets receive a ticket number when returned by the backend. The page says support follows up within 24 hours; this is a displayed service expectation, not a guarantee the assistant can enforce.

## Feedback

Route: `/landing/SendAFeedback`

Source: `frontend/src/pages/landing/pages/page_SendAFeedback.tsx`

The feedback page displays a rating selector and comments field. Its current component only changes local UI state and does not call a persistence API. Do not tell users their feedback was durably submitted based solely on this page.

## Notifications

Route: `/notifications`

The notifications page displays durable account notifications supplied by the backend. Realtime delivery can update the UI, while refreshing retrieves authoritative records.

## Help in settings

Route: `/settings`

The user settings area includes help and legal sections in addition to account, wallet, subscription, and display settings.

## Ask the chatbot

Route: `/landing/AskOurChatbot`

The documentation assistant should answer from this curated knowledge dataset and return only route URLs supplied by retrieval.
