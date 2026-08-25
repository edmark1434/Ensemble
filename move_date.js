const fs = require('fs');

const files = [
  'frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx',
  'frontend/src/pages/user/1_home/home_components/home_featured_gigs.tsx',
  'frontend/src/pages/user/7_gigs/gig_components/gigs_other_services.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Regex to remove the right-side clock block in grid view
  const oldClockRegex = /<div className="flex items-center gap-2 text-\[10px\] font-medium text-gray-500 dark:text-zinc-400 shrink-0">\s*<span className="flex items-center gap-1">\s*<Clock className="h-3 w-3 text-gray-400 dark:text-zinc-500" \/> \{formatTimeAgo\(gig\.postedAt\)\}\s*<\/span>\s*<\/div>/g;
  
  code = code.replace(oldClockRegex, '');

  // Regex to inject the clock block under the freelancer rating
  const ratingRowRegex = /(<div className="flex items-center gap-1 mt-0\.5 text-\[10px\] text-gray-500 dark:text-zinc-400">[\s\S]*?<span className="text-\[9px\] text-gray-500 dark:text-zinc-400 font-medium">Freelancer Rating:<\/span>[\s\S]*?<Star className="h-2\.5 w-2\.5 text-yellow-500 fill-yellow-500" \/>[\s\S]*?<span>\{\(gig\.freelancerRating \|\| gig\.clientRating\) > 0 \? `\$\{Number\(gig\.freelancerRating \|\| gig\.clientRating\)\.toFixed\(1\)\} \(\$\{gig\.ratingCount\}\)` : "N\/A"\}<\/span>[\s\S]*?<\/div>)/g;
  
  code = code.replace(ratingRowRegex, (match) => {
    return match + `
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 dark:text-zinc-500 font-medium">
                          <Clock className="h-2.5 w-2.5" /> 
                          <span>{formatTimeAgo(gig.postedAt)}</span>
                        </div>`;
  });

  fs.writeFileSync(file, code);
  console.log(`Updated ${file}`);
}
