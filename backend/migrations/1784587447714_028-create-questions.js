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
  pgm.createTable('questions', {
    question_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    survey_id: { type: 'uuid', notNull: true },
    question_text: { type: 'text', notNull: true },
    question_type: { type: 'varchar(30)', notNull: true },
    is_required: { type: 'boolean', default: false },
    display_order: { type: 'integer', notNull: true },
    created_at: { type: 'timestamp without time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp without time zone', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.addConstraint('questions', 'fk_question_survey', 'FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('questions', { ifExists: true });
};
