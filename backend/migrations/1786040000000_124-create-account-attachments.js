/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('account_attachments', {
    account_attachment_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    account_id: { type: 'uuid', notNull: true },
    attachment_kind: { type: 'varchar(30)', notNull: true },
    attachment_type: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    file_id: { type: 'uuid' },
    external_url: { type: 'text' },
    is_public: { type: 'boolean', notNull: true, default: true },
    display_order: { type: 'integer', notNull: true, default: 0 },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp without time zone',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: 'timestamp without time zone' },
  });

  pgm.addConstraint(
    'account_attachments',
    'account_attachments_account_id_fkey',
    'FOREIGN KEY (account_id) REFERENCES accounts(account_id)'
  );
  pgm.addConstraint(
    'account_attachments',
    'account_attachments_file_id_fkey',
    'FOREIGN KEY (file_id) REFERENCES files(file_id)'
  );
  pgm.addConstraint(
    'account_attachments',
    'account_attachments_kind_check',
    "CHECK (attachment_kind IN ('file', 'link'))"
  );
  pgm.addConstraint(
    'account_attachments',
    'account_attachments_source_check',
    "CHECK ((attachment_kind = 'file' AND file_id IS NOT NULL AND external_url IS NULL) OR (attachment_kind = 'link' AND file_id IS NULL AND external_url IS NOT NULL))"
  );
  pgm.createIndex('account_attachments', ['account_id', 'deleted_at'], {
    name: 'account_attachments_account_active_index',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('account_attachments', { ifExists: true });
};
