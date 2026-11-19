# Task: Dispute filing blocked by a pending payout

## Implementation Objective
A contract whose earlier dispute (by either side) has a ruled payout still `scheduled` or `failed` cannot get a new dispute. The dispute form must say so before the member fills it in, not only after Submit, and error toasts must show their full message.

## Acceptance Criteria
- `disputeFilingBlock` reports `DISPUTE_PAYOUT_PENDING` after the permanent blocks (`DISPUTE_ALREADY_FILED`, `DISPUTE_WINDOW_CLOSED`); filing and `GET /api/contracts` (`dispute_filing`) use the same rule.
- The message differs for a failed payout and names the dispute number only when the viewer may open that case.
- `dispute_filing.pendingPayout` carries the case (id/number null when hidden), `payoutStatus` and `releaseAt`.
- `POST /api/contracts/:id/dispute` returns `code` with filing-block errors.
- Dispute form: the contract is tagged "Dispute payout pending", the banner explains it (with the scheduled payout date when in the future), Submit is disabled, and a block returned at submit time updates the banner instead of only toasting.
- Contract details actions menu links to the blocking dispute when the viewer can open it.
- Error toasts are not cut off at two lines and stay up long enough to read.
