/**
 * What a contract really released, for the "owed to members" reserve on team wallets and for
 * contract fund distributions (team workspaces and freelancer subcontractors).
 *
 * A contract pays a team through `Escrow Release` rows that reference `contracts`. The team must
 * pass those credits on to its members before it can spend them. A dispute reversal can take part
 * (or all) of a release back out of the receiving wallet (docs/api.md "Contract disputes"):
 *  - while the reversal is scheduled, the credits already sit in the payer's own escrow wallet,
 *    so counting the whole release would reserve credits the team no longer has;
 *  - once it is paid, the original row is marked `Reversed` even when only part was taken, so
 *    dropping the row would free credits the team still owes its members.
 * So a release counts while `Completed` or `Reversed`, minus every reversal payout against it that
 * still stands (`scheduled`, `paid`, `failed`). A withdrawn ruling (`cancelled`) gave the credits
 * back, so it no longer reduces the release.
 */

/** The ledger statuses a release still counts under. */
function releaseCountsSql(alias = 'ct') {
  return `LOWER(${alias}.status::text) IN ('completed', 'reversed')`;
}

/** Credits of one `Escrow Release` row that are still the receiver's after dispute reversals. */
function netReleaseCreditsSql(alias = 'ct') {
  return `(${alias}.amount_credits - COALESCE((
    SELECT SUM(dp_rev.amount_credits)
    FROM dispute_payouts dp_rev
    WHERE dp_rev.reverses_credit_transaction_id = ${alias}.credit_transaction_id
      AND dp_rev.kind = 'reversal'
      AND dp_rev.status IN ('scheduled', 'paid', 'failed')
  ), 0))`;
}

module.exports = { releaseCountsSql, netReleaseCreditsSql };
