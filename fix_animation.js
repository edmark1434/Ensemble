const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/landing/pages/page_AskOurChatbot.tsx', 'utf8');

// Replace the JSX for the loading state
const jsxRegex = /<div className="ensemble-message-bubble ensemble-typing">[\s\S]*?<\/div>/;
content = content.replace(jsxRegex, `<div className="ensemble-message-bubble ensemble-typing">
                  <div className="ensemble-typing-dots">
                    <span /><span /><span />
                  </div>
                  <em>Joeds AI is searching Ensemble documentation</em>
                </div>`);

// Replace CSS
content = content.replace('.ensemble-message-avatar.is-thinking::after { position: absolute; inset: -4px; border: 1px solid transparent; border-top-color: #60a5fa; border-right-color: rgba(96,165,250,.25); border-radius: 11px; content: ""; animation: ensemble-logo-orbit 1.2s linear infinite; }', '');

content = content.replace('.ensemble-typing { display: flex; align-items: center; gap: 4px; color: ${theme === \'dark\' ? "#8b95a7" : "#64748b"}; }', '.ensemble-typing { display: flex; align-items: center; gap: 8px; color: ${theme === \'dark\' ? "#94a3b8" : "#475569"}; }');

content = content.replace('.ensemble-typing span { width: 5px; height: 5px; border-radius: 50%; background: #60a5fa; animation: ensemble-bounce 1.15s infinite ease-in-out; }', '.ensemble-typing-dots { display: flex; gap: 4px; align-items: center; background: ${theme === \'dark\' ? \'rgba(255,255,255,0.06)\' : \'rgba(0,0,0,0.04)\'}; padding: 5px 8px; border-radius: 8px; }\n          .ensemble-typing-dots span { width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; animation: ensemble-bounce 1.4s infinite ease-in-out; }');

content = content.replace('.ensemble-typing span:nth-child(2) { animation-delay: .12s; } .ensemble-typing span:nth-child(3) { animation-delay: .24s; }', '.ensemble-typing-dots span:nth-child(1) { animation-delay: 0s; }\n          .ensemble-typing-dots span:nth-child(2) { animation-delay: .15s; }\n          .ensemble-typing-dots span:nth-child(3) { animation-delay: .3s; }');

content = content.replace('.ensemble-typing em { margin-left: 7px; font-style: normal; font-size: 11px; }', '.ensemble-typing em { font-style: normal; font-size: 12px; font-weight: 500; letter-spacing: 0.2px; }');

// Add a glowing shadow pulse to the avatar instead of the weird rotating border
content = content.replace('.ensemble-message-avatar.is-thinking img { animation: ensemble-logo-pulse 1.4s ease-in-out infinite; }', '.ensemble-message-avatar.is-thinking { animation: ensemble-avatar-glow 2s infinite ease-in-out; border-color: rgba(59, 130, 246, 0.4); }\n          .ensemble-message-avatar.is-thinking img { animation: ensemble-logo-pulse 1.4s ease-in-out infinite; }');

// Replace the keyframes
content = content.replace('@keyframes ensemble-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-3px); opacity: 1; } }', '@keyframes ensemble-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .3; } 30% { transform: translateY(-3px); opacity: 1; } }\n          @keyframes ensemble-avatar-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } 50% { box-shadow: 0 0 12px 0 rgba(59, 130, 246, 0.35); } }');

content = content.replace('@keyframes ensemble-logo-orbit { to { transform: rotate(360deg); } }', '');

fs.writeFileSync('frontend/src/pages/landing/pages/page_AskOurChatbot.tsx', content);
