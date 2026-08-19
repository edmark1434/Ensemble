const fs = require('fs');

const file = 'frontend/src/pages/user/7_gigs/gig_pages/gig_order_page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Change questionAnswers type
content = content.replace(
  'useState<Record<string, string>>({});',
  'useState<Record<string, any>>({});'
);

// Replace questionnaire rendering
const oldBlockStart = '{q.type === "multiple-choice" || q.type === "choice" ? (';
const oldBlockEnd = '} else {'; // wait, it's just `)}` at the end of map

// It's easier to replace with a regex or slice. Let's find the exact block.
const mapStart = '{gig.questionnaires.map((q, idx) => (';
const mapEnd = '))}';
const beforeMap = content.indexOf(mapStart);
const afterMap = content.indexOf(mapEnd, beforeMap) + mapEnd.length;

let oldMapBlock = content.substring(beforeMap, afterMap);

let newMapBlock = `{gig.questionnaires.map((q, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/10">
                                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-3">
                                  {q.question} {(q.required || q.isRequired) && <span className="text-red-500">*</span>}
                                </p>
                                
                                {(q.type === "multiple-choice" || q.type === "choice" || q.type === 'multiple_choice') ? (
                                  q.multipleAnswer ? (
                                    <div className="space-y-2">
                                      {q.options?.map((opt, oIdx) => (
                                        <label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface cursor-pointer hover:border-blue-500 transition-colors">
                                          <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                                            checked={(questionAnswers[idx] || []).includes(opt)}
                                            onChange={(e) => {
                                              setQuestionAnswers(prev => {
                                                const current = prev[idx] || [];
                                                if (e.target.checked) return { ...prev, [idx]: [...current, opt] };
                                                return { ...prev, [idx]: current.filter((v: string) => v !== opt) };
                                              })
                                            }}
                                          />
                                          <span className="text-sm text-gray-700 dark:text-zinc-300">{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {q.options?.map((opt, oIdx) => (
                                        <label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface cursor-pointer hover:border-blue-500 transition-colors">
                                          <input 
                                            type="radio" 
                                            name={\`q-\${idx}\`}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                                            checked={questionAnswers[idx] === opt}
                                            onChange={() => setQuestionAnswers(prev => ({ ...prev, [idx]: opt }))}
                                            required={(q.required || q.isRequired) && !questionAnswers[idx]}
                                          />
                                          <span className="text-sm text-gray-700 dark:text-zinc-300">{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )
                                ) : (q.type === "file-upload" || q.type === "file" || q.type === "attachment") ? (
                                  <div>
                                    <input
                                      type="file"
                                      accept={q.fileTypes?.length ? q.fileTypes.map(t => '.' + t).join(',') : '*'}
                                      className="w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
                                      required={q.required || q.isRequired}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file && q.fileLimit && file.size > q.fileLimit * 1024 * 1024) {
                                          alert(\`File size must be less than \${q.fileLimit}MB\`);
                                          e.target.value = '';
                                          return;
                                        }
                                        // Normally we'd upload this immediately and save the URL in questionAnswers, but for now we can just store the file object or name.
                                        setQuestionAnswers(prev => ({ ...prev, [idx]: file ? file.name : "" }));
                                      }}
                                    />
                                    {q.fileLimit && <p className="mt-1.5 text-xs text-gray-500">Max size: {q.fileLimit}MB</p>}
                                  </div>
                                ) : (
                                  <textarea
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                                    placeholder="Your answer..."
                                    value={questionAnswers[idx] || ""}
                                    onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                                    required={q.required || q.isRequired}
                                  />
                                )}
                              </div>
                            ))}`;

content = content.replace(oldMapBlock, newMapBlock);

fs.writeFileSync(file, content);
console.log('Fixed gig_order_page.tsx');
