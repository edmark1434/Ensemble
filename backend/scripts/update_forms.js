const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/5_create_forms.tsx', 'utf8');

// Limit to 8 questions
content = content.replace('const handleAddQuestion = () => {', 
  'const handleAddQuestion = () => {\n    if (questionnaires.length >= 8) return;');

const fileUploadOptions = `
              {/* File Upload Options */}
              {q.type === "file" && (
                <div className="pl-2 border-l-2 border-blue-500/50 ml-2 mb-4 space-y-3">
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase">Max Files</label>
                      <input type="number" min="1" max="10" value={q.fileLimit || 1} onChange={e => updateQuestion(q.id, "fileLimit", parseInt(e.target.value))} className="w-20 rounded-lg border bg-white dark:bg-dark-base px-3 py-1.5 text-xs outline-none focus:border-blue-500 border-gray-200 dark:border-white/10" />
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs flex-wrap">
                    {["image", "document", "video", "archive"].map(ft => (
                      <label key={ft} className="flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-zinc-300">
                        <input type="checkbox" checked={q.fileTypes?.includes(ft)} onChange={e => {
                          const current = q.fileTypes || [];
                          if (e.target.checked) updateQuestion(q.id, "fileTypes", [...current, ft]);
                          else updateQuestion(q.id, "fileTypes", current.filter(t => t !== ft));
                        }} className="text-blue-500 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="capitalize">{ft}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Multiple Choice Options */}
`;

content = content.replace(
  '{/* Multiple Choice Options */}',
  fileUploadOptions
);

content = content.replace(
  '<Plus className="h-5 w-5" /> Add New Requirement',
  '<Plus className="h-5 w-5" /> {questionnaires.length >= 8 ? "Max Questions Reached (8)" : "Add New Requirement"}'
);

content = content.replace(
  'onClick={handleAddQuestion}',
  'onClick={handleAddQuestion} disabled={questionnaires.length >= 8}'
);

fs.writeFileSync('frontend/src/pages/user/7_gigs/gig_components/gig_creation_components/5_create_forms.tsx', content);
