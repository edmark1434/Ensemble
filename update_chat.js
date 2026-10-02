const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/ui/chat_bubble/chat_bubble_components/ChatWindow.tsx', 'utf8');

const regex = /<div className=\{`flex max-w-\[100%\] min-w-0 items-end gap-1\.5 \$\{isMe \? "flex-row-reverse" : ""\}`\}>\s*\{\!isMe && \(/g;

const replacement = `{!isMe && (conversation?.conversation_type === 'team' || conversation?.conversation_type === 'group' || conversation?.is_group) && (
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium ml-[34px] mb-0.5">
                      {message.author_name || "User"}
                    </span>
                  )}
                  <div className={\`flex max-w-[100%] min-w-0 items-end gap-1.5 \${isMe ? "flex-row-reverse" : ""}\`}>
                    {!isMe && (`;

content = content.replace(regex, replacement);
fs.writeFileSync('frontend/src/components/ui/chat_bubble/chat_bubble_components/ChatWindow.tsx', content);
