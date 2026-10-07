/**
 * Ticket audit events, reply guides, satisfaction, and first-staff-reply time.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS ticket_events (
      ticket_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES tickets(ticket_id),
      event_type VARCHAR(40) NOT NULL,
      summary TEXT NOT NULL,
      actor_staff_id UUID REFERENCES staff(staff_id),
      actor_account_id UUID REFERENCES accounts(account_id),
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_created
      ON ticket_events (ticket_id, created_at DESC)
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS ticket_articles (
      article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_type VARCHAR(80) NOT NULL,
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      created_by_staff_id UUID REFERENCES staff(staff_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS idx_ticket_articles_type
      ON ticket_articles (ticket_type)
      WHERE deleted_at IS NULL
  `);

  await pgm.db.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_score SMALLINT
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_comment VARCHAR(1000)
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS satisfaction_at TIMESTAMPTZ
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_staff_reply_at TIMESTAMPTZ
  `);
  await pgm.db.query(`
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_satisfaction_score_check
  `);
  await pgm.db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_satisfaction_score_check
      CHECK (satisfaction_score IS NULL OR satisfaction_score BETWEEN 1 AND 5)
  `);
  await pgm.db.query(`
    UPDATE tickets
    SET first_staff_reply_at = last_message_at
    WHERE first_staff_reply_at IS NULL
      AND LOWER(COALESCE(last_message_author_type, '')) = 'staff'
      AND last_message_at IS NOT NULL
  `);

  await pgm.db.query(`
    INSERT INTO ticket_articles (ticket_type, title, body)
    SELECT * FROM (VALUES
      (
        'Account Access',
        'Cannot sign in',
        'Thanks for writing in. Try a password reset from the login page, then sign in with the same email on the account. If Google sign-in is tied to a different email, tell us the address you used and we will match it to the account.'
      ),
      (
        'Billing and Payments',
        'Payment not showing',
        'Thanks for the receipt. We check the payment status and the matching credit transaction on this ticket before changing a balance. If the provider still shows pending, the credits are not issued until that payment succeeds.'
      ),
      (
        'Technical Issue',
        'Bug report',
        'Thanks for the report. The screenshot is attached to this ticket. Tell us the page you were on, what you expected, and what happened instead so we can reproduce it.'
      )
    ) AS seed(ticket_type, title, body)
    WHERE NOT EXISTS (
      SELECT 1 FROM ticket_articles existing
      WHERE existing.ticket_type = seed.ticket_type
        AND existing.title = seed.title
        AND existing.deleted_at IS NULL
    )
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_satisfaction_score_check`);
  await pgm.db.query(`ALTER TABLE tickets DROP COLUMN IF EXISTS first_staff_reply_at`);
  await pgm.db.query(`ALTER TABLE tickets DROP COLUMN IF EXISTS satisfaction_at`);
  await pgm.db.query(`ALTER TABLE tickets DROP COLUMN IF EXISTS satisfaction_comment`);
  await pgm.db.query(`ALTER TABLE tickets DROP COLUMN IF EXISTS satisfaction_score`);
  await pgm.db.query(`DROP TABLE IF EXISTS ticket_articles`);
  await pgm.db.query(`DROP TABLE IF EXISTS ticket_events`);
};
