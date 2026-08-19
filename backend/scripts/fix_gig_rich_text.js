const fs = require('fs');
const file = 'frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rich Text
const badStr = 'dangerouslySetInnerHTML={{ __html: gig.description }}';
const goodStr = 'dangerouslySetInnerHTML={{ __html: gig.description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }}';
content = content.replace(badStr, goodStr);

// 2. Types
content = content.replace(/q\.type === 'file-upload'/g, "q.type === 'attachment'");
content = content.replace(/q\.type === 'multiple-choice'/g, "q.type === 'multiple_choice'");

// 3. Duplicate Block
// The duplicate block starts at `{/* REQUIREMENTS */}` and goes down to `</section>\n            )}`
const startIdx = content.indexOf('{/* REQUIREMENTS */}');
if (startIdx !== -1) {
    // find the NEXT `</section>\n            )}`
    const nextEnd = content.indexOf(')}', content.indexOf('</section>', startIdx)) + 2;
    content = content.substring(0, startIdx) + content.substring(nextEnd);
}

fs.writeFileSync(file, content);
console.log('Fixed properly');
