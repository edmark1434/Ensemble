exports.up = pgm => {
  pgm.sql(`
    CREATE TABLE portfolio_clip_exports (
      render_id text PRIMARY KEY,
      attachment_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      account_id uuid NOT NULL REFERENCES accounts(account_id),
      project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
      start_ms integer NOT NULL CHECK (start_ms >= 0),
      end_ms integer NOT NULL CHECK (end_ms > start_ms),
      name varchar(255) NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','failed')),
      error text,
      failures integer NOT NULL DEFAULT 0,
      released boolean NOT NULL DEFAULT false,
      next_check_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX portfolio_clip_exports_due ON portfolio_clip_exports(next_check_at) WHERE NOT released;
  `);
};
exports.down = pgm => pgm.dropTable('portfolio_clip_exports');
