const fs = require('fs');

function applyRichText(file, replaceString) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(replaceString, `<div dangerouslySetInnerHTML={{ __html: gig.description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }} />`);
  fs.writeFileSync(file, content);
}

function applyRichTextSelected(file, replaceString) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(replaceString, `<div dangerouslySetInnerHTML={{ __html: selectedGig.description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }} />`);
  fs.writeFileSync(file, content);
}

// 1. gig_lists.tsx
applyRichText('frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx', 'dangerouslySetInnerHTML={{ __html: gig.description }}');
applyRichText('frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx', 'dangerouslySetInnerHTML={{ __html: gig.description }}');

// 2. GigRichText.tsx
applyRichText('frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx', 'dangerouslySetInnerHTML={{ __html: gig.description }}');

// 3. GigViewDetails.tsx
applyRichTextSelected('frontend/src/pages/user/7_gigs/gig_components/GigViewDetails.tsx', 'dangerouslySetInnerHTML={{ __html: selectedGig.description }}');

console.log('Rich text applied!');
