const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_pages/gig_create_page.tsx', 'utf8');

// 1. Pass props
code = code.replace(/<GigCreateHeader currentSlide=\{currentSlide\} onReturn=\{handleReturnTrigger\} \/>/, `<GigCreateHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} highestStepReached={highestStepReached} onJumpToReview={() => handleNext(6)} />`);

// 2. Remove old button
const oldButtonCode = `{highestStepReached >= 6 && currentSlide < 6 && (
                <div className="absolute -bottom-16 right-0">
                  <button onClick={() => handleNext(6)} className="flex items-center gap-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 px-6 py-2.5 text-xs font-bold hover:bg-purple-600/20 transition-all border border-purple-500/20">
                    Jump to Review <Rocket className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}`;
if (code.includes(oldButtonCode)) {
    code = code.replace(oldButtonCode, '');
} else {
    console.log("Could not find old button to remove!");
}

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_pages/gig_create_page.tsx', code);
