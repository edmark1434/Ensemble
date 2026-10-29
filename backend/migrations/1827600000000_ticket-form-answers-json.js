/**
 * Ticket answers and the submit-time snapshot live on the ticket.
 * form_answers is the per-type question list. submission_context is who
 * submitted it and from where. Picker ids in form_answers are not copied
 * back into ticket_form_values on the way down; the display text is.
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE tickets
      ADD COLUMN form_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN submission_context jsonb NOT NULL DEFAULT '{}'::jsonb
  `);
  await pgm.db.query(`
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_form_answers_is_array
        CHECK (jsonb_typeof(form_answers) = 'array'),
      ADD CONSTRAINT tickets_submission_context_is_object
        CHECK (jsonb_typeof(submission_context) = 'object')
  `);

  const existing = await pgm.db.query(`SELECT to_regclass('public.ticket_form_values') AS name`);
  if (existing.rows[0]?.name) {
    const columns = await pgm.db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ticket_form_values'
    `);
    const names = new Set(columns.rows.map((row) => row.column_name));
    const answerOrder = names.has('ticket_form_value_id')
      ? 'v.ticket_form_value_id'
      : names.has('created_at')
        ? 'v.created_at, v.field_key'
        : 'v.field_key';
    await pgm.db.query(`
      UPDATE tickets t
      SET
        form_answers = COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'key', v.field_key,
              'label', v.field_label,
              'value', v.value
            )
            ORDER BY ${answerOrder}
          )
          FROM ticket_form_values v
          WHERE v.ticket_id = t.ticket_id
            AND NOT starts_with(v.field_key, 'context_')
        ), '[]'::jsonb),
        submission_context = COALESCE((
          SELECT jsonb_strip_nulls(jsonb_build_object(
            'accountId', MAX(v.value) FILTER (WHERE v.field_key = 'context_account_id'),
            'username', MAX(v.value) FILTER (WHERE v.field_key = 'context_username'),
            'email', MAX(v.value) FILTER (WHERE v.field_key = 'context_email'),
            'plan', MAX(v.value) FILTER (WHERE v.field_key = 'context_plan'),
            'submittedAt', MAX(v.value) FILTER (WHERE v.field_key = 'context_submitted_at'),
            'browser', MAX(v.value) FILTER (WHERE v.field_key = 'context_browser'),
            'device', MAX(v.value) FILTER (WHERE v.field_key = 'context_device'),
            'page', MAX(v.value) FILTER (WHERE v.field_key = 'context_page')
          ))
          FROM ticket_form_values v
          WHERE v.ticket_id = t.ticket_id
            AND starts_with(v.field_key, 'context_')
        ), '{}'::jsonb)
    `);
    await pgm.db.query(`DROP TABLE ticket_form_values`);
  }
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS ticket_form_values (
      ticket_form_value_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
      field_key VARCHAR(80) NOT NULL,
      field_label VARCHAR(160) NOT NULL,
      value TEXT NOT NULL,
      CONSTRAINT ticket_form_values_ticket_field_key UNIQUE (ticket_id, field_key)
    )
  `);
  await pgm.db.query(`
    INSERT INTO ticket_form_values (ticket_id, field_key, field_label, value)
    SELECT
      t.ticket_id,
      LEFT(answer->>'key', 80),
      LEFT(COALESCE(NULLIF(answer->>'label', ''), answer->>'key'), 160),
      LEFT(answer->>'value', 2000)
    FROM tickets t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.form_answers, '[]'::jsonb)) AS answer
    WHERE COALESCE(answer->>'key', '') <> ''
      AND COALESCE(answer->>'value', '') <> ''
    ON CONFLICT (ticket_id, field_key) DO UPDATE
      SET field_label = EXCLUDED.field_label,
          value = EXCLUDED.value
  `);
  await pgm.db.query(`
    INSERT INTO ticket_form_values (ticket_id, field_key, field_label, value)
    SELECT
      t.ticket_id,
      mapping.field_key,
      mapping.field_label,
      LEFT(t.submission_context->>mapping.source_key, 500)
    FROM tickets t
    CROSS JOIN (
      VALUES
        ('accountId', 'context_account_id', 'Member ID'),
        ('username', 'context_username', 'Username'),
        ('email', 'context_email', 'Email'),
        ('plan', 'context_plan', 'Plan'),
        ('submittedAt', 'context_submitted_at', 'Submitted at'),
        ('browser', 'context_browser', 'Browser'),
        ('device', 'context_device', 'Device'),
        ('page', 'context_page', 'Page they came from')
    ) AS mapping(source_key, field_key, field_label)
    WHERE COALESCE(t.submission_context->>mapping.source_key, '') <> ''
    ON CONFLICT (ticket_id, field_key) DO UPDATE
      SET field_label = EXCLUDED.field_label,
          value = EXCLUDED.value
  `);
  await pgm.db.query(`
    ALTER TABLE tickets
      DROP CONSTRAINT IF EXISTS tickets_form_answers_is_array,
      DROP CONSTRAINT IF EXISTS tickets_submission_context_is_object,
      DROP COLUMN form_answers,
      DROP COLUMN submission_context
  `);
};
