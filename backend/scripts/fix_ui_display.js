const fs = require('fs');

function updateDisplay(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /\{\(q\.type === 'multiple_choice' \|\| q\.type === 'choice' \|\| q\.type === 'multiple-choice'\) \? 'Multiple Choice' : 'Text Answer'\}/g,
    `{(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}`
  );
  
  // Replace the span containing the type with one that also includes multipleAnswer text
  const oldSpan = `<span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 font-medium">
                                  {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                                </span>`;
                                
  const newSpan1 = `<span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 font-medium">
                                  {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                                </span>
                                {(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                    {q.multipleAnswer ? 'Multiple Answers' : 'Single Answer'}
                                  </span>
                                )}`;
                                
  const oldSpan2 = `<span className="text-xs px-2 py-1 rounded bg-white dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-medium">
                              {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                            </span>`;
                            
  const newSpan2 = `<span className="text-xs px-2 py-1 rounded bg-white dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-medium">
                              {(q.type === 'attachment' || q.type === 'file' || q.type === 'file-upload') ? 'File Upload' : (q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') ? 'Multiple Choice' : 'Text Answer'}
                            </span>
                            {(q.type === 'multiple_choice' || q.type === 'choice' || q.type === 'multiple-choice') && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                {q.multipleAnswer ? 'Multiple Answers' : 'Single Answer'}
                              </span>
                            )}`;

  content = content.replace(oldSpan, newSpan1);
  content = content.replace(oldSpan2, newSpan2);
  
  // fix required rendering (use q.required || q.isRequired)
  content = content.replace(/\{q\.required && \(/g, "{(q.required || q.isRequired) && (");
  
  fs.writeFileSync(file, content);
}

updateDisplay('frontend/src/pages/user/7_gigs/gig_components/GigViewDetails.tsx');
updateDisplay('frontend/src/pages/user/7_gigs/gig_components/GigRichText.tsx');
console.log('Fixed UI display');
