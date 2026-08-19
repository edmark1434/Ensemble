const fs = require('fs');

function fixTypes(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/q\.type === 'file-upload'/g, "q.type === 'attachment'");
  content = content.replace(/q\.type === 'multiple-choice'/g, "q.type === 'multiple_choice'");
  fs.writeFileSync(file, content);
}

fixTypes('frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx');
fixTypes('frontend/src/pages/user/7_gigs/gig_components/GigViewDetails.tsx');

// Also remove duplicate Requirements block in GigRichText
let grtContent = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx', 'utf8');
const dupReqStart = grtContent.indexOf('{/* REQUIREMENTS */}');
if (dupReqStart !== -1) {
  const nextDiv = grtContent.indexOf('</div>', dupReqStart + 500); // this is a rough guess
  // It's safer to use regex or string replace
}
