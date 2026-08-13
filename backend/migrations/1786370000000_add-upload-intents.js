exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('upload_intents', {
    upload_intent_id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('gen_random_uuid()') },
    account_id: { type: 'uuid', notNull: true, references: 'accounts(account_id)', onDelete: 'CASCADE' },
    original_name: { type: 'text', notNull: true },
    staging_key: { type: 'text', notNull: true, unique: true },
    final_key: { type: 'text', notNull: true, unique: true },
    expected_mime_type: { type: 'varchar(100)', notNull: true },
    max_size_bytes: { type: 'integer', notNull: true },
    expires_at: { type: 'timestamp with time zone', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    consumed_at: { type: 'timestamp with time zone' },
    file_id: { type: 'uuid', references: 'files(file_id)', onDelete: 'SET NULL' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('upload_intents', 'upload_intents_positive_max_size', { check: 'max_size_bytes > 0' });
  pgm.addConstraint('upload_intents', 'upload_intents_status_check', { check: "status IN ('pending', 'finalizing', 'consumed')" });
  pgm.createIndex('upload_intents', ['account_id', 'created_at']);
  pgm.createIndex('upload_intents', 'expires_at');
};

exports.down = (pgm) => pgm.dropTable('upload_intents', { ifExists: true });
