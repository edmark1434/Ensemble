const fs = require('fs');

function fixTypes(file) {
  let content = fs.readFileSync(file, 'utf8');
  // First, replace any previous attachment/multiple_choice checks if any exist
  content = content.replace(/q\.type === 'attachment'/g, "(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload')");
  content = content.replace(/q\.type === 'multiple_choice'/g, "(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice')");
  fs.writeFileSync(file, content);
}

fixTypes('frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx');
fixTypes('frontend/src/pages/user/7_gigs/gig_components/GigViewDetails.tsx');
console.log('Fixed types in UI');
