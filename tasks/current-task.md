# Active Task: Skeleton Loading for /transactions Page

## Implementation Objective

Add comprehensive, theme-adaptive skeleton loading states to the `/transactions` page ([`main.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/11_transactionhistory/main.tsx)) when the page is loading, replacing the abrupt empty areas and basic spinner with structured skeleton placeholders for:
1. Top summary metric cards (Available Balance hero card + 4 supporting metric cards).
2. Charts section (Credit Flow Mix donut chart + Activity Timeline bar chart).
3. Main ledger card transaction table (8 pulsing rows with Date, Transaction, Type, Direction pill, Counterparty/Flow, Credits amount, and Status badge placeholders + pagination footer).

## Acceptance Criteria

- [x] When navigating or loading `/transactions`, top metric cards show skeleton placeholders instead of being hidden.
- [x] Charts section renders skeleton donut and timeline bar placeholders while loading.
- [x] Ledger table renders an 8-row table skeleton with matching column structure while data is loading.
- [x] Once data resolves, smoothly transitions to live wallet summaries, charts, and transaction rows.
- [x] Both dark and light themes render clean, accessible pulsing skeleton blocks.
- [x] `cd frontend && npm run build` passes with zero errors.
