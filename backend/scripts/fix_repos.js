const fs = require('fs');
const file = 'backend/repositories/GigRepositories.js';
let content = fs.readFileSync(file, 'utf8');

// Update getGigByIdRepository
content = content.replace(
  /'isRequired', gr\.is_required,/g,
  `'isRequired', gr.is_required,
                  'multipleAnswer', gr.multiple_answer,
                  'fileLimit', gr.file_limit,
                  'fileTypes', gr.file_types,`
);

// Update createGigRepository
content = content.replace(
  /const reqQuery = `\s*INSERT INTO gig_requirements \(\s*gig_id, type, question, is_required\s*\) VALUES \(\$1, \$2, \$3, \$4\) RETURNING gig_requirement_id;\s*`;\s*let type = 'text';/g,
  `const reqQuery = \`
                    INSERT INTO gig_requirements (
                        gig_id, type, question, is_required, multiple_answer, file_limit, file_types
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING gig_requirement_id;
                \`;
                let type = 'text';`
);

content = content.replace(
  /const reqRes = await client\.query\(reqQuery, \[\s*gigId, type, q\.question, q\.isRequired\s*\]\);/g,
  `const reqRes = await client.query(reqQuery, [
                    gigId, type, q.question, q.isRequired, q.multipleAnswer || false, q.fileLimit || null, JSON.stringify(q.fileTypes || [])
                ]);`
);

// Update updateGigRepository
content = content.replace(
  /const reqQuery = 'INSERT INTO gig_requirements \(gig_id, type, question, is_required\) VALUES \(\$1, \$2, \$3, \$4\) RETURNING gig_requirement_id';/g,
  `const reqQuery = 'INSERT INTO gig_requirements (gig_id, type, question, is_required, multiple_answer, file_limit, file_types) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING gig_requirement_id';`
);

content = content.replace(
  /const qRes = await client\.query\(reqQuery, \[gigId, qType, q\.question, q\.isRequired \? true : false\]\);/g,
  `const qRes = await client.query(reqQuery, [gigId, qType, q.question, q.isRequired ? true : false, q.multipleAnswer || false, q.fileLimit || null, JSON.stringify(q.fileTypes || [])]);`
);

fs.writeFileSync(file, content);
console.log('Fixed GigRepositories');
