const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

content = content.replace(
  "INSERT INTO tags (name, type) VALUES ($1, $2) RETURNING tag_id', [skill, 'skill']",
  "INSERT INTO tags (name) VALUES ($1) RETURNING tag_id', [skill]"
);

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
console.log('Fixed tags insertion');
