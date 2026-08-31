const fs = require('fs');

const files = [
  'frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx',
  'frontend/src/pages/user/1_home/home_components/home_featured_gigs.tsx',
  'frontend/src/pages/user/7_gigs/gig_components/gigs_other_services.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Add import for StarRating if not present
  if (!code.includes('StarRating')) {
    code = code.replace(/import { useNavigate } from "react-router-dom";/, 'import { useNavigate } from "react-router-dom";\nimport { StarRating } from "@/components/ui/star-rating";');
  }

  // 1. Replace the Service Rating block with StarRating and fix margins
  const oldServiceRatingRegex = /<div className="flex items-center text-\[10px\] text-gray-500 dark:text-zinc-400 font-bold mt-2">[\s\S]*?<\/div>/g;
  
  code = code.replace(oldServiceRatingRegex, `
                    <div className="flex items-center text-[10px] text-gray-500 dark:text-zinc-400 font-bold mt-3 mb-2">
                      <span>Service Rating:</span>
                      <div className="ml-1.5 flex items-center gap-1">
                        <StarRating value={gig.clientRating || 0} size="sm" />
                      </div>
                      <span className="text-amber-500 ml-1.5">{gig.ratingCount > 0 ? Number(gig.clientRating).toFixed(1) : "0.0"}</span>
                      <span className="font-normal ml-0.5 text-gray-400">({gig.ratingCount || 0})</span>
                    </div>`);
                    
  // 2. Adjust the separation line margins
  // It looks like: <div className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5
  code = code.replace(/className="mt-2 pt-4 border-t border-gray-200 dark:border-white\/5/g, 'className="pt-3 border-t border-gray-200 dark:border-white/5');

  // 3. Add back the Freelancer Rating under the username
  // The current username block is: <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">{gig.postedBy}</p>
  const usernameRegex = /(<p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">\{gig\.postedBy\}<\/p>)/g;
  
  // Wait, I only want to append it once per username match, but if it already has the Freelancer rating I shouldn't append it again.
  if (!code.includes('Freelancer Rating:')) {
    code = code.replace(usernameRegex, `$1
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-gray-500 dark:text-zinc-400 font-medium">Freelancer Rating:</span>
                          <StarRating value={gig.freelancerRating || gig.clientRating || 0} size="sm" />
                          <span className="text-amber-500 text-[10px] font-bold">
                            {(gig.freelancerRating || gig.clientRating) > 0 ? Number(gig.freelancerRating || gig.clientRating).toFixed(1) : "0.0"}
                          </span>
                        </div>`);
  }

  fs.writeFileSync(file, code);
  console.log(`Refactored ${file}`);
}
