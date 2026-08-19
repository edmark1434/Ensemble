const fs = require('fs');
const file = 'backend/repositories/GigRepositories.js';
let content = fs.readFileSync(file, 'utf8');

// For updateGigRepository
content = content.replace(
  /let qType = 'free_text';\s*if \(q\.type === 'Multiple Choice' \|\| q\.type === 'choice' \|\| q\.type === 'multiple-choice' \|\| q\.type === 'multiple_choice'\) qType = 'multiple_choice';\s*if \(q\.type === 'Attachment' \|\| q\.type === 'file' \|\| q\.type === 'file-upload' \|\| q\.type === 'attachment'\) qType = 'attachment';/g,
  `let qType = 'text';
                if (q.type === 'Multiple Choice' || q.type === 'choice' || q.type === 'multiple-choice' || q.type === 'multiple_choice') qType = 'choice';
                if (q.type === 'Attachment' || q.type === 'file' || q.type === 'file-upload' || q.type === 'attachment') qType = 'file';`
);

// For createGigRepository (same)
content = content.replace(
  /let type = 'free_text';\s*if \(q\.type === 'Multiple Choice' \|\| q\.type === 'choice' \|\| q\.type === 'multiple-choice' \|\| q\.type === 'multiple_choice'\) type = 'multiple_choice';\s*if \(q\.type === 'Attachment' \|\| q\.type === 'file' \|\| q\.type === 'file-upload' \|\| q\.type === 'attachment'\) type = 'attachment';/g,
  `let type = 'text';
                if (q.type === 'Multiple Choice' || q.type === 'choice' || q.type === 'multiple-choice' || q.type === 'multiple_choice') type = 'choice';
                if (q.type === 'Attachment' || q.type === 'file' || q.type === 'file-upload' || q.type === 'attachment') type = 'file';`
);

fs.writeFileSync(file, content);
console.log('Fixed backend to save choice/file/text directly');
