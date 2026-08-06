/**
 * Moderator marketplace queue. Report, dispute, violation, and ticket fields
 * are defined by their original table migrations.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('marketplace_listings', {
    listing_id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    listing_number: { type: 'varchar(20)', notNull: true, unique: true },
    submitted_by_account_id: { type: 'uuid' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    category: { type: 'varchar(50)' },
    price_credits: { type: 'integer', notNull: true, default: 0 },
    thumbnail_url: { type: 'text' },
    status: { type: 'varchar(50)', notNull: true, default: 'pending' },
    rejection_reason: { type: 'text' },
    reviewed_by_staff_id: { type: 'uuid' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'marketplace_listings',
    'marketplace_listings_submitted_by_account_id_fkey',
    'FOREIGN KEY (submitted_by_account_id) REFERENCES accounts(account_id)'
  );
  pgm.addConstraint(
    'marketplace_listings',
    'marketplace_listings_reviewed_by_staff_id_fkey',
    'FOREIGN KEY (reviewed_by_staff_id) REFERENCES staff(staff_id)'
  );
  pgm.createIndex('marketplace_listings', 'status', {
    name: 'idx_marketplace_listings_status',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('marketplace_listings', { ifExists: true });
};
