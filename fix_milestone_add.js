const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/4_create_milestones.tsx', 'utf8');

code = code.replace(/\{ name: "", description: "", amount: 0 \}/g, '{ id: Date.now().toString(), name: "", description: "" }');
fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/4_create_milestones.tsx', code);
