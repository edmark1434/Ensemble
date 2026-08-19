const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

content = content.replace(
  "await client.query('DELETE FROM gig_requirements WHERE gig_id = $1', [gigId]);",
  `await client.query('DELETE FROM gig_requirement_choices WHERE gig_requirement_id IN (SELECT gig_requirement_id FROM gig_requirements WHERE gig_id = $1)', [gigId]);
        await client.query('DELETE FROM gig_requirements WHERE gig_id = $1', [gigId]);`
);

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
