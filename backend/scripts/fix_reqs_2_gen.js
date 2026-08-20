const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

// 1. Replace the INSERT query
content = content.replace(
  /INSERT INTO gig_requirements \([\s\S]*?\) VALUES \(\$1, \$2, \$3, \$4, \$5\) RETURNING gig_requirement_id/,
  `INSERT INTO gig_requirements (
                        gig_id, type, question, is_required
                    ) VALUES ($1, $2, $3, $4) RETURNING gig_requirement_id`
);

// 2. Replace the query parameters for updateGigRepository
content = content.replace(
  /gigId,\s*q\.type\s*\|\|\s*'text',\s*q\.question,\s*q\.isRequired\s*\?\s*true\s*:\s*false/g,
  `gigId, q.type || 'text', q.question, q.isRequired ? true : false`
); // Actually let me just check what the parameters are currently.
// Wait, before, they were: gigId, q.type || 'text', q.question, q.isRequired ? true : false
// because I replaced them in the first script!
// Let me verify if they still have 5 arguments or 4.

fs.writeFileSync('backend/scripts/fix_reqs_2.js', `
const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

content = content.replace(
  /INSERT INTO gig_requirements \\([\\s\\S]*?\\) VALUES \\(\\$1, \\$2, \\$3, \\$4, \\$5\\) RETURNING gig_requirement_id/,
  \`INSERT INTO gig_requirements (
                        gig_id, type, question, is_required
                    ) VALUES ($1, $2, $3, $4) RETURNING gig_requirement_id\`
);

// We need to make sure the arguments array matches the 4 placeholders.
// It is currently: [gigId, q.type || 'text', q.question, q.isRequired ? true : false]
// Wait, if it's already 4 arguments, then we are good!

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
console.log('Fixed');
`);
