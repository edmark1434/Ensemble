const fs = require('fs');

const files = [
  'src/pages/setup_account/00_VerifyEmail.tsx',
  'src/pages/setup_account/01_PersonalDetails.tsx',
  'src/pages/setup_account/02_UploadImage.tsx',
  'src/pages/setup_account/04_Survey.tsx'
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');

  // Update classes
  c = c.replace(/className="setup-page-wrapper"/g, 'className="setup-page-wrapper bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white"');
  c = c.replace(/className="setup-card"/g, 'className="setup-card bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none"');

  // Strip hardcoded dark background and border from CSS
  c = c.replace(/background:\s*\$\{T\.bg\};/g, '');
  c = c.replace(/background:\s*rgba\(8,\s*10,\s*18,\s*0\.8\);/g, '');
  c = c.replace(/backdrop-filter:\s*blur\(12px\);/g, '');
  c = c.replace(/-webkit-backdrop-filter:\s*blur\(12px\);/g, '');
  c = c.replace(/border:\s*1px solid rgba\(42,\s*45,\s*62,\s*0\.4\);/g, '');

  // Strip input and card CSS hardcodes
  c = c.replace(/background:\s*\$\{T\.bgInput\};/g, '');
  c = c.replace(/border:\s*1px solid \$\{T\.border\};/g, '');
  c = c.replace(/color:\s*#e2e8f0;/g, '');

  // General inline style fixes
  c = c.replace(/color:\s*T\.text/g, 'color: "inherit"');
  c = c.replace(/color:\s*T\.muted/g, 'color: "inherit"');
  
  // Specific element class injections
  c = c.replace(/style=\{\{\s*width: 48,\s*height: 48,\s*borderRadius: 12,\s*background: T\.bgInput,\s*border: `1px solid \$\{T\.border\}`,\s*display: "flex",\s*alignItems: "center",\s*justifyContent: "center",\s*color: T\.accent,\s*marginBottom: 20,?\s*\}\}/g, 
    'className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-brand-500 dark:text-brand-400"');
    
  // Sub-headers text color
  c = c.replace(/<p style=\{\{\s*color: "inherit",\s*fontSize: 14,\s*marginBottom: 28,\s*lineHeight: 1\.5\s*\}\}>/g,
    '<p className="text-gray-500 dark:text-zinc-400 text-sm mb-7 leading-relaxed">');
  c = c.replace(/<p style=\{\{\s*color: T\.muted,\s*fontSize: 14,\s*marginBottom: 28,\s*lineHeight: 1\.5\s*\}\}>/g,
    '<p className="text-gray-500 dark:text-zinc-400 text-sm mb-7 leading-relaxed">');

  // Input styles
  c = c.replace(/style=\{\{\s*width: "100%",\s*maxWidth: "68px",\s*height: "54px",\s*background: T\.bgInput,\s*border: `1px solid \$\{error \? T\.error : digit \? T\.borderFoc : T\.border\}`,\s*borderRadius: 10,\s*color: "#fff",\s*fontSize: 20,\s*fontWeight: 700,\s*textAlign: "center",\s*outline: "none",\s*transition: "all \.15s ease",?\s*\}\}/g,
    'className={`w-full max-w-[68px] h-[54px] rounded-xl text-center text-xl font-bold outline-none transition-all duration-150 text-gray-900 dark:text-white ${error ? "border-red-500" : digit ? "border-brand-500" : "border-gray-200 dark:border-white/10"} bg-white dark:bg-white/5`}');

  // Progress bar background
  c = c.replace(/background: T\.border/g, 'background: "rgba(100, 100, 100, 0.2)"');
  
  // Next buttons
  c = c.replace(/background: loading \? "#555" : "#fff", color: "#080a12"/g, 'background: loading ? "var(--border-color)" : "var(--text-main)", color: "var(--btn-text)"');
  c = c.replace(/background: \(isUploading \|\| isSaved \|\| loading \|\| !previewUrl\) \? "#555" : "#fff",\s*color: \(isUploading \|\| isSaved \|\| loading \|\| !previewUrl\) \? "#888" : "#080a12"/g, 
    'background: (isUploading || isSaved || loading || !previewUrl) ? "var(--border-color)" : "var(--text-main)", color: (isUploading || isSaved || loading || !previewUrl) ? "#888" : "var(--btn-text)"');

  // VerifyEmail resend button
  c = c.replace(/color: canResend \? T\.accent : T\.dim/g, 'color: canResend ? "#4a6fa5" : "#888"');

  // Add tailwind classes to form inputs/selects in other pages
  c = c.replace(/className="dropdown-select"/g, 'className="dropdown-select bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"');
  c = c.replace(/className="form-input"/g, 'className="form-input bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"');

  // Purpose card classes
  c = c.replace(/className={`purpose-card/g, 'className={`purpose-card bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white');
  c = c.replace(/color: isActive \? T\.text : "#e2e8f0"/g, 'color: "inherit"');
  c = c.replace(/background: rgba\(74, 111, 165, 0\.1\)/g, 'background: "var(--accent-alpha)"');

  // UploadImage specific
  c = c.replace(/background: T\.bg/g, 'background: "transparent"');
  c = c.replace(/background: T\.bgInput/g, 'background: "transparent"');
  c = c.replace(/background: isUploading \|\| isSaved \? "#555" : "#fff",\s*color: isUploading \|\| isSaved \? "#888" : "#080a12"/g, 'background: isUploading || isSaved ? "var(--border-color)" : "var(--text-main)", color: isUploading || isSaved ? "#888" : "var(--btn-text)"');
  c = c.replace(/color: isUploading \? T\.dim : T\.text/g, 'color: isUploading ? "#888" : "inherit"');

  fs.writeFileSync(file, c, 'utf8');
}
console.log('Applied uniform theme fixes');
