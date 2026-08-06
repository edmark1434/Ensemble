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
  pgm.createIndex("verification_attachments", ["verification_id", "index"], {
    unique: true,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable("verification_attachments", {
    ifExists: true,
    cascade: true,
  });
};
