const fs = require('fs');
const file = 'backend/repositories/GigRepositories.js';
let content = fs.readFileSync(file, 'utf8');

// For createGigRepository
content = content.replace(
  /let type = 'free_text';\s*if \(q\.type === 'Multiple Choice'\) type = 'multiple_choice';\s*if \(q\.type === 'Attachment'\) type = 'attachment';/g,
  `let type = 'free_text';
                if (q.type === 'Multiple Choice' || q.type === 'choice' || q.type === 'multiple-choice' || q.type === 'multiple_choice') type = 'multiple_choice';
                if (q.type === 'Attachment' || q.type === 'file' || q.type === 'file-upload' || q.type === 'attachment') type = 'attachment';`
);

// For updateGigRepository
content = content.replace(
  /let qType = 'free_text';\s*if \(q\.type === 'Multiple Choice'\) qType = 'multiple_choice';\s*if \(q\.type === 'Attachment'\) qType = 'attachment';/g,
  `let qType = 'free_text';
                if (q.type === 'Multiple Choice' || q.type === 'choice' || q.type === 'multiple-choice' || q.type === 'multiple_choice') qType = 'multiple_choice';
                if (q.type === 'Attachment' || q.type === 'file' || q.type === 'file-upload' || q.type === 'attachment') qType = 'attachment';`
);

fs.writeFileSync(file, content);
console.log('Fixed backend types');
