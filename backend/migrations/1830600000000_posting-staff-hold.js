/**
 * Staff hold on job and gig postings.
 *
 * `jobs.staff_hold_at` / `gigs.staff_hold_at` are set when staff pause, close or archive a
 * posting (Jobs desk, platform view, or a sanctioned job/gig report) and cleared when staff
 * reopen it. While set, the owner cannot change the posting's status themselves (gig open/close
 * toggle, job edit); they are told to open a support ticket instead.
 * Logic: backend/repositories/JobsModeratorRepositories.js (`updateJobsGigsPosting`),
 * backend/services/PostingModerationServices.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS staff_hold_at timestamp without time zone NULL;
    ALTER TABLE gigs ADD COLUMN IF NOT EXISTS staff_hold_at timestamp without time zone NULL;
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE gigs DROP COLUMN IF EXISTS staff_hold_at;
    ALTER TABLE jobs DROP COLUMN IF EXISTS staff_hold_at;
  `);
};
