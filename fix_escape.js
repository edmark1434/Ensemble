const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/4_create_milestones.tsx', 'utf8');

code = code.replace(/\\\\`/g, '`');
code = code.replace(/\\\\\$/g, '$');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/4_create_milestones.tsx', code);
