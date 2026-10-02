const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/gig_create_header.tsx', 'utf8');

// Add props
code = code.replace(/interface GigCreateHeaderProps \{/, `interface GigCreateHeaderProps {\n  highestStepReached?: number;\n  onJumpToReview?: () => void;`);
code = code.replace(/export const GigCreateHeader: React\.FC<GigCreateHeaderProps> = \(\{/, `export const GigCreateHeader: React.FC<GigCreateHeaderProps> = ({\n  highestStepReached = 1,\n  onJumpToReview,`);

// Add floating button
const oldCircle = `{isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>`;
const newCircle = `{isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {step.id === 6 && highestStepReached >= 6 && currentSlide < 6 && (
                  <button 
                    onClick={onJumpToReview}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-purple-700 transition flex items-center gap-1 animate-bounce whitespace-nowrap cursor-pointer z-50"
                  >
                    Jump Here <span className="text-[8px]">🚀</span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-600 rotate-45" />
                  </button>
                )}`;
code = code.replace(oldCircle, newCircle);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/gig_create_header.tsx', code);
