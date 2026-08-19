const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

content = content.replace(
  `INSERT INTO gig_requirements (
                          gig_id, requirement_text, is_required, requirement_type, order_number
                      ) VALUES ($1, $2, $3, $4, $5) RETURNING gig_requirement_id`,
  `INSERT INTO gig_requirements (
                          gig_id, type, question, is_required
                      ) VALUES ($1, $2, $3, $4) RETURNING gig_requirement_id`
);

content = content.replace(
  `gigId, q.question, q.isRequired ? true : false, q.type || 'text', q.order || 1`,
  `gigId, q.type || 'text', q.question, q.isRequired ? true : false`
);

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
