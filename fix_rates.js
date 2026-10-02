const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/3_create_tiers.tsx', 'utf8');

code = code.replace(/<div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">/g, '<div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-1">');
code = code.replace(/\{\[10, 15, 20, 25, 30\]\.map/g, '{[10, 15, 20, 25, 30, 40, 50].map');

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/3_create_tiers.tsx', code);
