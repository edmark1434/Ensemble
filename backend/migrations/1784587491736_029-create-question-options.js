/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('question_options', {
    option_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    question_id: { type: 'uuid', notNull: true },
    option_text: { type: 'text', notNull: true },
    option_value: { type: 'varchar(100)' },
    display_order: { type: 'integer', notNull: true },
    created_at: { type: 'timestamp without time zone', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.addConstraint('question_options', 'fk_question', 'FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('question_options', { ifExists: true });
};
