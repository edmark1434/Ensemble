const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

content = content.replace(
  "const qRes = await client.query(reqQuery, [gigId, q.type || 'text', q.question, q.isRequired ? true : false]);",
  `let qType = 'free_text';
                if (q.type === 'Multiple Choice') qType = 'multiple_choice';
                if (q.type === 'Attachment') qType = 'attachment';
                const qRes = await client.query(reqQuery, [gigId, qType, q.question, q.isRequired ? true : false]);`
);

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
