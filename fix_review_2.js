const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', 'utf8');

// 1. Fix Skills
const descHTML = `<div dangerouslySetInnerHTML={{ __html: description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }} />
              </div>`;
const newDescHTML = `<div dangerouslySetInnerHTML={{ __html: description.replace(/\\n/g, "<br/>").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>").replace(/\\*(.*?)\\*/g, "<em>$1</em>") }} />
              </div>
              {skills && skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-[10px] font-bold">
                      {skill}
                    </span>
                  ))}
                </div>
              )}`;

code = code.replace(descHTML, newDescHTML);
// Make the description container not truncate if they also want to read the description fully, or maybe they just wanted TOS to be bigger. The prompt said "make the terms of servce bigger so that i can see all terms written there"

// 2. Fix TOS
const oldTOS = `<div className="text-[10px] text-gray-600 dark:text-zinc-400 bg-white dark:bg-dark-base p-3 rounded-xl border border-gray-200 dark:border-white/10 line-clamp-3">`;
const newTOS = `<div className="text-[10px] text-gray-600 dark:text-zinc-400 bg-white dark:bg-dark-base p-3 rounded-xl border border-gray-200 dark:border-white/10 whitespace-pre-wrap max-h-64 overflow-y-auto">`;

code = code.replace(oldTOS, newTOS);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/6_create_review.tsx', code);
