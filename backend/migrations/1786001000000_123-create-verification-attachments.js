/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable("verification_attachments", {
    verification_id: {
      type: "uuid",
      notNull: true,
    },
    file_id: {
      type: "uuid",
      notNull: true,
    },
    document_type: {
      type: "varchar(100)",
      notNull: true,
    },
    index: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    submission_version: {
      type: "integer",
      notNull: true,
      default: 1,
    },
    is_latest: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    is_required: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    created_at: {
      type: "timestamp without time zone",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.addConstraint(
    "verification_attachments",
    "verification_attachments_pkey",
    "PRIMARY KEY (verification_id, file_id)"
  );

  pgm.addConstraint(
    "verification_attachments",
    "verification_attachments_verification_id_fkey",
    "FOREIGN KEY (verification_id) REFERENCES verifications(verification_id) ON UPDATE CASCADE ON DELETE CASCADE"
  );

  pgm.addConstraint(
    "verification_attachments",
    "verification_attachments_file_id_fkey",
    "FOREIGN KEY (file_id) REFERENCES files(file_id) ON UPDATE CASCADE ON DELETE CASCADE"
  );

  pgm.createIndex("verification_attachments", "file_id");
  pgm.createIndex(
    "verification_attachments",
    ["verification_id", "submission_version", "index"],
    {
      unique: true,
      name: "verification_attachments_submission_index",
    }
  );
  pgm.createIndex(
    "verification_attachments",
    ["verification_id", "is_latest"],
    {
      name: "verification_attachments_latest_index",
    }
  );

  pgm.createTable("business_verification_details", {
    verification_id: {
      type: "uuid",
      primaryKey: true,
      notNull: true,
    },
    business_type: { type: "varchar(80)", notNull: true },
    registered_business_name: { type: "varchar(255)", notNull: true },
    registration_number: { type: "varchar(120)", notNull: true },
    registration_country: { type: "varchar(120)", notNull: true },
    relationship_to_business: { type: "varchar(80)", notNull: true },
    submitted_by_account_id: { type: "uuid", notNull: true },
    submission_version: { type: "integer", notNull: true, default: 1 },
    created_at: {
      type: "timestamp without time zone",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: "timestamp without time zone",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.addConstraint(
    "business_verification_details",
    "business_verification_details_verification_id_fkey",
    "FOREIGN KEY (verification_id) REFERENCES verifications(verification_id) ON DELETE CASCADE"
  );
  pgm.addConstraint(
    "business_verification_details",
    "business_verification_details_submitted_by_account_id_fkey",
    "FOREIGN KEY (submitted_by_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT"
  );
  pgm.createIndex(
    "business_verification_details",
    "submitted_by_account_id"
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable("business_verification_details", {
    ifExists: true,
    cascade: true,
  });
  pgm.dropTable("verification_attachments", {
    ifExists: true,
    cascade: true,
  });
};
