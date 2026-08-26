const fs = require('fs');
const path = require('path');

const filesToProcess = [
  "src/pages/landing/nav_Landing.tsx",
  "src/pages/landing/section_Hero.tsx",
  "src/pages/landing/section_HowItWorks.tsx",
  "src/pages/landing/section_Features.tsx",
  "src/pages/landing/section_Testimonials.tsx",
  "src/pages/landing/section_ScrollExpand.tsx",
  "src/pages/landing/section_ScrollText.tsx",
  "src/pages/landing/section_CallForAction.tsx",
  "src/pages/landing/section_Footer.tsx",
  "src/pages/landing/section_gallery.tsx",
  "src/pages/landing/pages/page_AboutUs.tsx",
  "src/pages/landing/pages/page_AskOurChatbot.tsx",
  "src/pages/landing/pages/page_FAQ.tsx",
  "src/pages/landing/pages/page_HowToHire.tsx",
  "src/pages/landing/pages/page_HowToWork.tsx",
  "src/pages/landing/pages/page_Pricing.tsx",
  "src/pages/landing/pages/page_PrivacyPolicy.tsx",
  "src/pages/landing/pages/page_SendAFeedback.tsx",
  "src/pages/landing/pages/page_SubmitATicket.tsx",
  "src/pages/landing/pages/page_SupportUs.tsx",
  "src/pages/landing/pages/page_TermsOfService.tsx"
];

const patterns = [
  // Page backgrounds
  {
    regex: /style=\{\{\s*([^}]*)background:\s*"#080a12"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="bg-gray-50 dark:bg-dark-base" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  {
    regex: /style=\{\{\s*([^}]*)backgroundColor:\s*"#080a12"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="bg-gray-50 dark:bg-dark-base" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  // Text colors
  {
    regex: /style=\{\{\s*([^}]*)color:\s*"#fff"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="text-gray-900 dark:text-white" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  {
    regex: /style=\{\{\s*([^}]*)color:\s*"#ffffff"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="text-gray-900 dark:text-white" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  {
    regex: /style=\{\{\s*([^}]*)color:\s*"#080a12"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="text-white dark:text-gray-900" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  // Dim text
  {
    regex: /style=\{\{\s*([^}]*)color:\s*"#7a8499"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="text-gray-500 dark:text-zinc-400" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  {
    regex: /style=\{\{\s*([^}]*)color:\s*"#a1a1aa"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="text-gray-500 dark:text-zinc-400" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  // Borders
  {
    regex: /style=\{\{\s*([^}]*)border:\s*"1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="border border-gray-200 dark:border-white/10" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  {
    regex: /style=\{\{\s*([^}]*)border:\s*"1px solid rgba\(255,255,255,0\.05\)"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="border border-gray-200 dark:border-white/5" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  {
    regex: /style=\{\{\s*([^}]*)background:\s*"rgba\(255,255,255,0\.03\)"(,?\s*[^}]*)\}\}/g,
    replacer: (match, p1, p2) => `className="bg-gray-100 dark:bg-white/[0.03]" style={{${p1}${p2.replace(/^,/, '')}}}`
  },
  // Aurora color stops
  {
    regex: /colorStops=\{\["#A855F7", "#080a12", "#3B82F6"\]\}/g,
    replacer: () => `colorStops={["#A855F7", document.documentElement.classList.contains("dark") ? "#080a12" : "#f9fafb", "#3B82F6"]}`
  }
];

let modifiedCount = 0;

for (const file of filesToProcess) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log("Missing:", file);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Cleanup edge case formatting first
  content = content.replace(/,\s*\}/g, '}');

  for (const {regex, replacer} of patterns) {
    // We might have multiple passes needed if multiple attributes exist
    // But since regex consumes the whole style string, we need to apply it iteratively or carefully.
    // To handle multiple attributes in one style block, we should probably just loop until no more matches.
    let prev;
    do {
      prev = content;
      content = content.replace(regex, replacer);
      // Merge multiple classNames if they get created
      content = content.replace(/className="([^"]+)" className="([^"]+)"/g, 'className="$1 $2"');
      content = content.replace(/className="([^"]+)"\s+className="([^"]+)"/g, 'className="$1 $2"');
    } while (content !== prev);
  }

  // Final cleanup of empty styles
  content = content.replace(/style=\{\{\s*\}\}/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated:", file);
    modifiedCount++;
  }
}

console.log(`Finished updating ${modifiedCount} files.`);
