const fs = require('fs');
let content = fs.readFileSync('backend/repositories/GigRepositories.js', 'utf8');

// Add termsOfService to getGigByIdRepository select list
content = content.replace(
  'as gallery,\n              (SELECT json_agg(t.name) FROM gig_tags gt JOIN tags t ON gt.tag_id = t.tag_id WHERE gt.gig_id = g.gig_id) as skills,',
  `as gallery,
              (SELECT terms_description FROM terms_of_service WHERE account_id = g.freelancer_account_id AND terms_type = 'gigs' ORDER BY created_at DESC LIMIT 1) as "termsOfService",
              (SELECT json_agg(t.name) FROM gig_tags gt JOIN tags t ON gt.tag_id = t.tag_id WHERE gt.gig_id = g.gig_id) as skills,`
);

// Map termsOfService in the return block for getGigByIdRepository
content = content.replace(
  `termsOfService: '',`,
  `termsOfService: row.termsOfService || '',`
);

// For updating terms_of_service, find updateGigRepository
const updateGigMatch = content.match(/async function updateGigRepository\(gigId, accountId, gigData\) \{[\s\S]*?try \{[\s\S]*?await client\.query\('BEGIN'\);/);
if (updateGigMatch) {
  const replaceWith = `${updateGigMatch[0]}
        if (gigData.termsOfService) {
            await client.query(
                \`INSERT INTO terms_of_service (terms_title, terms_description, terms_type, account_id)
                 VALUES ($1, $2, $3, $4)\`,
                ['Gig Custom Terms', gigData.termsOfService, 'gigs', accountId]
            );
        }
`;
  content = content.replace(updateGigMatch[0], replaceWith);
}

fs.writeFileSync('backend/repositories/GigRepositories.js', content);
console.log('Fixed termsOfService fetching and updating');
