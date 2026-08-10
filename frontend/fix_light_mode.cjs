const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/user/6_job_market/job_components/job_viewdetails.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_tabs.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_statuses.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_filters.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_list.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_creation_components/1_proposal_pitch.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_creation_components/2_proposal_terms.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_creation_components/3_proposal_milestones.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_creation_components/4_proposal_review.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_creation_components/5_proposal_success.tsx',
  'src/pages/user/6_job_market/job_proposals/proposals_components/proposals_creation_components/proposal_create_header.tsx',
];

const basePath = 'C:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend';

const replacements = [
  { regex: /bg-\[#080a12\]/g, replacement: 'bg-gray-50 dark:bg-[#080a12]' },
  { regex: /bg-zinc-950\/60/g, replacement: 'bg-white/80 dark:bg-zinc-950/60 shadow-sm dark:shadow-none' },
  { regex: /text-white/g, replacement: 'text-gray-900 dark:text-white' },
  { regex: /text-zinc-400/g, replacement: 'text-gray-500 dark:text-zinc-400' },
  { regex: /text-zinc-300/g, replacement: 'text-gray-600 dark:text-zinc-300' },
  { regex: /text-zinc-500/g, replacement: 'text-gray-500 dark:text-zinc-500' },
  { regex: /text-zinc-200/g, replacement: 'text-gray-700 dark:text-zinc-200' },
  { regex: /text-zinc-100/g, replacement: 'text-gray-900 dark:text-zinc-100' },
  { regex: /border-white\/10/g, replacement: 'border-gray-200 dark:border-white/10' },
  { regex: /border-white\/5/g, replacement: 'border-gray-100 dark:border-white/5' },
  { regex: /border-white\/15/g, replacement: 'border-gray-200 dark:border-white/15' },
  { regex: /border-zinc-800/g, replacement: 'border-gray-200 dark:border-zinc-800' },
  { regex: /border-zinc-700/g, replacement: 'border-gray-300 dark:border-zinc-700' },
  { regex: /bg-white\/5/g, replacement: 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none' },
  { regex: /bg-white\/10/g, replacement: 'bg-gray-100 dark:bg-white/10' },
  { regex: /bg-\[#0d0f1a\]\/70/g, replacement: 'bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none' },
  { regex: /bg-\[#0d0f1a\]\/60/g, replacement: 'bg-white dark:bg-[#0d0f1a]/60 shadow-sm dark:shadow-none' },
  { regex: /bg-\[#0d0f1a\]/g, replacement: 'bg-white dark:bg-[#0d0f1a]' },
  { regex: /bg-zinc-900\/40/g, replacement: 'bg-white dark:bg-zinc-900/40 shadow-sm dark:shadow-none' },
  { regex: /bg-zinc-900\/30/g, replacement: 'bg-white dark:bg-zinc-900/30' },
  { regex: /bg-zinc-950\/80/g, replacement: 'bg-gray-50 dark:bg-zinc-950/80' },
  { regex: /bg-\[#0a0d18\]/g, replacement: 'bg-white dark:bg-[#0a0d18]' },
  { regex: /bg-\[#0f1115\]/g, replacement: 'bg-gray-50 dark:bg-[#0f1115]' },
  { regex: /bg-\[#0a0c10\]/g, replacement: 'bg-gray-100 dark:bg-[#0a0c10]' },
  { regex: /hover:bg-white\/10/g, replacement: 'hover:bg-gray-50 dark:hover:bg-white/10' },
  { regex: /hover:bg-white\/5/g, replacement: 'hover:bg-gray-50 dark:hover:bg-white/5' },
  { regex: /hover:text-white/g, replacement: 'hover:text-gray-900 dark:hover:text-white' },
  { regex: /bg-white\/\[0\.025\]/g, replacement: 'bg-gray-50 dark:bg-white/[0.025]' },
  { regex: /bg-white\/\[0\.02\]/g, replacement: 'bg-gray-50 dark:bg-white/[0.02]' },
  { regex: /bg-white\/\[0\.015\]/g, replacement: 'bg-gray-50 dark:bg-white/[0.015]' },
  { regex: /bg-white\/\[0\.03\]/g, replacement: 'bg-gray-50 dark:bg-white/[0.03]' },
  { regex: /hover:bg-white\/\[0\.03\]/g, replacement: 'hover:bg-gray-100 dark:hover:bg-white/[0.03]' },
  { regex: /hover:bg-white\/\[0\.04\]/g, replacement: 'hover:bg-gray-100 dark:hover:bg-white/[0.04]' },
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(basePath, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  replacements.forEach(({ regex, replacement }) => {
    // Avoid double-replacing if already contains dark: prefix for this pattern (crude check)
    // Actually, just apply if it doesn't already have dark: right before it or something.
    // Better: split by classNames and apply, or just run it since these files are known.
    // We'll just run it, but be careful with `text-white` not inside `dark:text-white`.
    
    content = content.replace(regex, (match, offset, string) => {
        // If it's already preceded by dark:, don't replace
        if (offset >= 5 && string.slice(offset - 5, offset) === 'dark:') {
            return match;
        }
        // If it's preceded by hover:, it's safe (our regex handles hover: separately or not)
        // Wait, text-white is matched. If it's hover:text-white, it's matched by hover:text-white if placed before text-white.
        return replacement;
    });
  });

  // some cleanup for double classes (if any)
  // e.g. text-gray-900 dark:text-gray-900 dark:text-white
  content = content.replace(/dark:text-gray-900 dark:text-white/g, 'dark:text-white');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${file}`);
});
