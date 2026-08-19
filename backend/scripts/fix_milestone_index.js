const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

// Find and replace the milestones insertion in updateGigRepository
content = content.replace(
  /if \(gigData\.milestones && gigData\.milestones\.length > 0\) \{\s*for \(const m of gigData\.milestones\) \{\s*await client\.query\(\s*'INSERT INTO gig_milestones \(gig_id, name, description\) VALUES \(\$1, \$2, \$3\)',\s*\[gigId, m\.name, m\.description\]\s*\);\s*\}\s*\}/g,
  `if (gigData.milestones && gigData.milestones.length > 0) {
            for (let i = 0; i < gigData.milestones.length; i++) {
                const m = gigData.milestones[i];
                await client.query(
                    'INSERT INTO gig_milestones (gig_id, index, name, description) VALUES ($1, $2, $3, $4)',
                    [gigId, i, m.name, m.description]
                );
            }
        }`
);

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
