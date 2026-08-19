const fs = require('fs');

const file = 'frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace setIsCheckoutOpen(true)
content = content.replace(/setIsCheckoutOpen\(true\)/g, "navigate(`/gigs/services/${gig.id}/order`, { state: { tierIndex: activeTierIdx } })");

fs.writeFileSync(file, content);
console.log('Replaced all');
