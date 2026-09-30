const { pool } = require('../lib/Database');

async function getAdminUserSurveyResponses() {
  const query = `
    SELECT 
      u.user_id,
      u.account_id,
      u.email_address,
      a.handle,
      a.display_name,
      u.first_name,
      u.last_name,
      q.question_text,
      o.option_text,
      r.response_text as option_value_text,
      r.created_at
    FROM user_survey_responses r
    JOIN users u ON r.user_id = u.user_id
    JOIN accounts a ON a.account_id = u.account_id
    JOIN questions q ON r.question_id = q.question_id
    LEFT JOIN question_options o ON r.option_id = o.option_id
    ORDER BY r.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

module.exports = {
  getAdminUserSurveyResponses,
};
