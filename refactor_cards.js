const fs = require('fs');

const files = [
  'frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx',
  'frontend/src/pages/user/1_home/home_components/home_featured_gigs.tsx',
  'frontend/src/pages/user/7_gigs/gig_components/gigs_other_services.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // 1. Remove rating from the image thumbnail
  const target1 = `                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[11px] font-semibold drop-shadow-md z-10">
                        <Star className="h-3 w-3 fill-white text-white" />
                        <span>{gig.ratingCount > 0 ? \`\${gig.clientRating} (\${gig.ratingCount})\` : "N/A"}</span>
                      </div>`;
  const target1List = `                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[11px] font-semibold drop-shadow-md z-10">
                    <Star className="h-3 w-3 fill-white text-white" />
                    <span>{gig.ratingCount > 0 ? \`\${gig.clientRating} (\${gig.ratingCount})\` : "N/A"}</span>
                  </div>`;
  
  // Wait, I should just use regex to remove it safely regardless of indentation!
  code = code.replace(/<div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-\[11px\] font-semibold drop-shadow-md z-10">[\s\S]*?<\/div>/g, '');

  // 2. Remove rating from below the user's name
  code = code.replace(/<div className="flex items-center gap-1 text-\[10px\] text-gray-500 dark:text-zinc-400">\s*<Star className="h-2\.5 w-2\.5 text-yellow-500 fill-yellow-500" \/>\s*<span>\{gig\.ratingCount > 0 \? `\$\{gig\.clientRating\} \(\$\{gig\.ratingCount\}\)` : "N\/A"\}<\/span>\s*<\/div>/g, '');
  
  // 3. Add Service Rating below the description
  const descRegex = /(<div\s+className="text-\[12px\] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed(?: mb-3)?"\s+dangerouslySetInnerHTML=\{\{\s*__html:\s*gig\.description.*?\}\}\s*\/>)/g;
  code = code.replace(descRegex, (match) => {
    return match + `\n                    <div className="flex items-center text-[10px] text-gray-500 dark:text-zinc-400 font-bold mt-2">
                      <span>Service Rating:</span>
                      <div className="flex gap-0.5 text-amber-500 ml-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                      <span className="text-amber-500 ml-1">{gig.ratingCount > 0 ? Number(gig.clientRating).toFixed(1) : "0.0"}</span>
                      <span className="font-normal ml-0.5">({gig.ratingCount || 0})</span>
                    </div>`;
  });

  fs.writeFileSync(file, code);
  console.log(`Refactored ${file}`);
}
