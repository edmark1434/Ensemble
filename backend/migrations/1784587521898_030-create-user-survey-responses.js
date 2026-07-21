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
  pgm.createTable('user_survey_responses', {
    response_id: { 
      type: 'uuid', 
      primaryKey: true, 
      notNull: true, 
      default: pgm.func('gen_random_uuid()') 
    },
    survey_id: { type: 'uuid', notNull: true },
    question_id: { type: 'uuid', notNull: true },
    option_id: { type: 'uuid' },
    response_text: { type: 'text' },
    created_at: { type: 'timestamp without time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    user_id: { type: 'uuid' },
  });

  pgm.addConstraint('user_survey_responses', 'fk_response_survey', 'FOREIGN KEY (survey_id) REFERENCES surveys(survey_id)');
  pgm.addConstraint('user_survey_responses', 'fk_response_question', 'FOREIGN KEY (question_id) REFERENCES questions(question_id)');
  pgm.addConstraint('user_survey_responses', 'fk_response_option', 'FOREIGN KEY (option_id) REFERENCES question_options(option_id)');
  pgm.addConstraint('user_survey_responses', 'user_survey_responses_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('user_survey_responses', { ifExists: true });
};

