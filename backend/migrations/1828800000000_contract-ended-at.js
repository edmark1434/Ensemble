/**
 * Record when each contract ended, so a dispute can only be filed up to 30 days after that
 * (DISPUTE_FILING_WINDOW_DAYS in backend/lib/DisputeEscrow.js).
 *
 * Contracts end from many code paths (milestone approval, cancellation, gig rejection, ban
 * cleanup, dispute settlement), so a trigger stamps `ended_at` instead of every caller:
 *   - status moves to an ended status (done, completed, closed, cancelled, rejected):
 *     ended_at = now, or kept when it was already ended (Done → Closed keeps the first end)
 *   - status moves back to a live status: ended_at = NULL
 * The list must match ENDED_CONTRACT_STATUSES in backend/lib/DisputeEscrow.js.
 *
 * Backfill for contracts that already ended: the last credit movement on the contract or its
 * milestones, else the deadline (capped at now), else when the contract was created.
 */

const ENDED = `('done', 'completed', 'closed', 'cancelled', 'rejected')`;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.addColumns(
    'contracts',
    {
      ended_at: { type: 'timestamp without time zone' },
    },
    { ifNotExists: true }
  );

  pgm.sql(`
    WITH moves AS (
      SELECT c.contract_id, MAX(ct.created_at) AS last_at
      FROM credit_transactions ct
      JOIN contracts c
        ON ct.reference_table = 'contracts'
       AND ct.reference_id::text = c.contract_id::text
      GROUP BY c.contract_id
      UNION ALL
      SELECT cm.contract_id, MAX(ct.created_at) AS last_at
      FROM credit_transactions ct
      JOIN contract_milestones cm
        ON ct.reference_table IN ('contract_milestones', 'contract_milestone_revisions')
       AND ct.reference_id::text = cm.contract_milestone_id::text
      GROUP BY cm.contract_id
    ),
    last_move AS (
      SELECT contract_id, MAX(last_at) AS last_at
      FROM moves
      GROUP BY contract_id
    ),
    src AS (
      SELECT
        c.contract_id,
        COALESCE(lm.last_at, LEAST(c.deadline_at, CURRENT_TIMESTAMP::timestamp), c.created_at) AS ended_at
      FROM contracts c
      LEFT JOIN last_move lm ON lm.contract_id = c.contract_id
      WHERE LOWER(c.status) IN ${ENDED}
        AND c.ended_at IS NULL
    )
    UPDATE contracts c
    SET ended_at = src.ended_at
    FROM src
    WHERE src.contract_id = c.contract_id
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_contract_ended_at() RETURNS trigger AS $$
    BEGIN
      IF LOWER(NEW.status) IN ${ENDED} THEN
        IF TG_OP = 'UPDATE' AND LOWER(OLD.status) IN ${ENDED} AND OLD.ended_at IS NOT NULL THEN
          NEW.ended_at := OLD.ended_at;
        ELSE
          NEW.ended_at := COALESCE(NEW.ended_at, CURRENT_TIMESTAMP);
        END IF;
      ELSE
        NEW.ended_at := NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_contracts_ended_at ON contracts;
    CREATE TRIGGER trg_contracts_ended_at
      BEFORE INSERT OR UPDATE OF status ON contracts
      FOR EACH ROW
      EXECUTE FUNCTION set_contract_ended_at();
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_contracts_ended_at ON contracts;
    DROP FUNCTION IF EXISTS set_contract_ended_at();
  `);
  pgm.dropColumns('contracts', ['ended_at'], { ifExists: true });
};
