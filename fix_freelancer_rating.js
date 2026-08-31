const fs = require('fs');

const files = [
  'frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx',
  'frontend/src/pages/user/1_home/home_components/home_featured_gigs.tsx',
  'frontend/src/pages/user/7_gigs/gig_components/gigs_other_services.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Regex to match the newly added Freelancer Rating block with StarRating
  const regex = /<div className="flex items-center gap-1 mt-0\.5">[\s\S]*?<span className="text-\[9px\] text-gray-500 dark:text-zinc-400 font-medium">Freelancer Rating:<\/span>[\s\S]*?<StarRating value=\{gig\.freelancerRating \|\| gig\.clientRating \|\| 0\} size="sm" \/>[\s\S]*?<span className="text-amber-500 text-\[10px\] font-bold">[\s\S]*?<\/span>[\s\S]*?<\/div>/g;

  code = code.replace(regex, `<div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
                          <span className="text-[9px] text-gray-500 dark:text-zinc-400 font-medium">Freelancer Rating:</span>
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                          <span>{(gig.freelancerRating || gig.clientRating) > 0 ? \`\${Number(gig.freelancerRating || gig.clientRating).toFixed(1)} (\${gig.ratingCount})\` : "N/A"}</span>
                        </div>`);

  fs.writeFileSync(file, code);
  console.log(`Updated ${file}`);
}
