const fs = require('fs');

function fix(file, varName) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    new RegExp('<div dangerouslySetInnerHTML={{ __html: ' + varName + '\.description\\.replace\\(/\\\\n/g, "<br/>"\\)\\.replace\\(/\\\\\\*\\\\\\*\\(\\. \\?\\)\\\\\\*\\\\\\*/g, "<strong>\\$1</strong>"\\)\\.replace\\(/\\\\\\*\\(\\. \\?\\)\\\\\\*/g, "<em>\\$1</em>"\\) }} />', 'g'),
    'dangerouslySetInnerHTML={{ __html: ' + varName + '.description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }}'
  );
  fs.writeFileSync(file, content);
}

// Since the regex might be tricky with all the escapes, let's just do standard string replacement
function fixString(file, varName) {
  let content = fs.readFileSync(file, 'utf8');
  const badStr = '<div dangerouslySetInnerHTML={{ __html: ' + varName + '.description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }} />';
  const goodStr = 'dangerouslySetInnerHTML={{ __html: ' + varName + '.description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }}';
  
  // replace all occurrences
  content = content.split(badStr).join(goodStr);
  fs.writeFileSync(file, content);
}

fixString('frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx', 'gig');
fixString('frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx', 'gig');
fixString('frontend/src/pages/user/7_gigs/gig_components/GigViewDetails.tsx', 'selectedGig');

console.log("Fixed!");
