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

  // 1. Remove rating from the image thumbnail
  code = code.replace(/<div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-\[11px\] font-semibold drop-shadow-md z-10">[\s\S]*?<\/div>/g, '');

  // 2. Remove old rating from below the user's name
  code = code.replace(/<div className="flex items-center gap-1 text-\[10px\] text-gray-500 dark:text-zinc-400">\s*<Star className="h-2\.5 w-2\.5 text-yellow-500 fill-yellow-500" \/>\s*<span>\{gig\.ratingCount > 0 \? `\$\{gig\.clientRating\} \(\$\{gig\.ratingCount\}\)` : "N\/A"\}<\/span>\s*<\/div>/g, '');
  
  // 3. Add Service Rating below the description
  // Note: the line looks like: dangerouslySetInnerHTML={{ __html: gig.description... }} />
  // then we inject the Service Rating right after it.
  const descRegex = /(<div\s+className="text-\[12px\] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed(?: mb-3)?"\s+dangerouslySetInnerHTML=\{\{\s*__html:\s*gig\.description.*?\}\}\s*\/>)/g;
  
  code = code.replace(descRegex, (match) => {
    return match + `\n                    <div className="flex items-center text-[10px] text-gray-500 dark:text-zinc-400 font-bold mt-3 mb-2">
                      <span>Service Rating:</span>
                      <div className="ml-1.5 flex items-center gap-1">
                        <StarRating value={gig.clientRating || 0} size="sm" />
                      </div>
                      <span className="text-amber-500 ml-1.5">{gig.ratingCount > 0 ? Number(gig.clientRating).toFixed(1) : "0.0"}</span>
                      <span className="font-normal ml-0.5 text-gray-400">({gig.ratingCount || 0})</span>
                    </div>`;
  });

  // 4. Adjust the separation line margins
  // It looks like: className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5
  code = code.replace(/className="mt-2 pt-4 border-t border-gray-200 dark:border-white\/5/g, 'className="pt-3 border-t border-gray-200 dark:border-white/5');

  // 5. Add back the Freelancer Rating under the username
  // The current username block is: <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">{gig.postedBy}</p>
  const usernameRegex = /(<p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">\{gig\.postedBy\}<\/p>)/g;
  
  code = code.replace(usernameRegex, `$1
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-gray-500 dark:text-zinc-400 font-medium">Freelancer Rating:</span>
                          <StarRating value={gig.freelancerRating || gig.clientRating || 0} size="sm" />
                          <span className="text-amber-500 text-[10px] font-bold">
                            {(gig.freelancerRating || gig.clientRating) > 0 ? Number(gig.freelancerRating || gig.clientRating).toFixed(1) : "0.0"}
                          </span>
                        </div>`);

  fs.writeFileSync(file, code);
  console.log(`Refactored ${file}`);
}
