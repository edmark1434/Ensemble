
const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

content = content.replace(
  /INSERT INTO gig_requirements \([\s\S]*?\) VALUES \(\$1, \$2, \$3, \$4, \$5\) RETURNING gig_requirement_id/,
  `INSERT INTO gig_requirements (
                        gig_id, type, question, is_required
                    ) VALUES ($1, $2, $3, $4) RETURNING gig_requirement_id`
);

// We need to make sure the arguments array matches the 4 placeholders.
// It is currently: [gigId, q.type || 'text', q.question, q.isRequired ? true : false]
// Wait, if it's already 4 arguments, then we are good!

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
console.log('Fixed');
