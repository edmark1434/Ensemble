const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', 'utf8');

content = content.replace(
  '{description}',
  '<div dangerouslySetInnerHTML={{ __html: description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }} />'
);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', content);
