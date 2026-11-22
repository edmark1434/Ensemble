/**
 * Team members named in a contract dispute.
 *
 * When a client disputes a contract whose freelancer side is a team (the freelancer is a team
 * account) or works through the contract's workspace team (`teams.team_type = 'contractual'`:
 * included members and subcontractors), the client chooses who on that side answers for it:
 * the team leader (default), specific members, or everyone.
 *
 * - `dispute_members`: one row per named person. `team_account_id` is the team they were named
 *   through (the freelancer team, or the contract workspace team for workspace-only people),
 *   `team_role` their role there when named, `is_leader` the person who answers for the side
 *   (the team's leader, or the freelancer themself on a personal contract), `source` where the
 *   roster found them (`team`, `contract`, `both`), `named_by` who named them (`filer` at filing,
 *   `staff` from the dispute console). Staff removals are soft (`removed_at`, `removed_by_staff_id`,
 *   `removed_reason`) so the case keeps who was originally named; a re-added person is restored.
 * - `disputes.respondent_member_scope`: what the filer chose (`leader`, `selected`, `all`), or
 *   NULL when the other side was a single person.
 *
 * Named members can read and answer the case like the disputee once it is public, are told when
 * it opens, and are the default reach of a dispute ban (staff can widen or narrow it).
 * Logic: backend/services/DisputeMemberServices.js, backend/repositories/DisputeMemberRepositories.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS dispute_members (
      dispute_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id uuid NOT NULL REFERENCES disputes(dispute_id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      team_account_id uuid NULL REFERENCES accounts(account_id) ON DELETE SET NULL,
      team_role varchar(50) NULL,
      is_leader boolean NOT NULL DEFAULT false,
      source varchar(10) NOT NULL DEFAULT 'team',
      named_by varchar(10) NOT NULL DEFAULT 'filer',
      added_by_account_id uuid NULL REFERENCES accounts(account_id) ON DELETE SET NULL,
      added_by_staff_id uuid NULL REFERENCES staff(staff_id) ON DELETE SET NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      removed_at timestamp without time zone NULL,
      removed_by_staff_id uuid NULL REFERENCES staff(staff_id) ON DELETE SET NULL,
      removed_reason varchar(40) NULL,
      CONSTRAINT dispute_members_unique UNIQUE (dispute_id, account_id),
      CONSTRAINT dispute_members_source_check CHECK (source IN ('team', 'contract', 'both')),
      CONSTRAINT dispute_members_named_by_check CHECK (named_by IN ('filer', 'staff')),
      CONSTRAINT dispute_members_removed_check CHECK (removed_at IS NOT NULL OR removed_reason IS NULL)
    )
  `);
  // A member's own cases (Cases list, access checks) look rows up by account.
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_dispute_members_account_active
      ON dispute_members (account_id, dispute_id)
      WHERE removed_at IS NULL
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_dispute_members_team
      ON dispute_members (team_account_id)
      WHERE team_account_id IS NOT NULL
  `);

  await pgm.db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS respondent_member_scope varchar(10) NULL
  `);
  await pgm.db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'disputes_respondent_member_scope_check'
      ) THEN
        ALTER TABLE disputes
          ADD CONSTRAINT disputes_respondent_member_scope_check
          CHECK (respondent_member_scope IS NULL OR respondent_member_scope IN ('leader', 'selected', 'all'));
      END IF;
    END $$;
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_respondent_member_scope_check`);
  await pgm.db.query(`ALTER TABLE disputes DROP COLUMN IF EXISTS respondent_member_scope`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_dispute_members_team`);
  await pgm.db.query(`DROP INDEX IF EXISTS idx_dispute_members_account_active`);
  await pgm.db.query(`DROP TABLE IF EXISTS dispute_members`);
};
