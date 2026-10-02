const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/landing/pages/page_AskOurChatbot.tsx', 'utf8');

const regex = /function parseMarkdownBold([\s\S]*?)$/;
if (regex.test(content)) {
  content = content.replace(regex, ''); 
} else {
  // If it's the original file
  const originalInlineAnswer = /function InlineAnswer([\s\S]*?)$/;
  content = content.replace(originalInlineAnswer, '');
}

const fixedReplacement = `
function parseMarkdownBold(text: string) {
  const parts = text.split(/(\\*\\*.*?\\*\\*)/g);
  return parts.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      return <strong key={i} className="font-bold text-gray-900 dark:text-gray-100">{chunk.slice(2, -2)}</strong>;
    }
    return chunk;
  });
}

function InlineAnswer({ text, links }: { text: string; links: VerifiedLink[] }) {
  const linkMap = new Map(links.map((link) => [\`[[\${link.id}]]\`, link]));
  const parts = text.split(/(\\[\\[LINK_\\d+\\]\\])/g);
  return (
    <div>
      {parts.map((part, index) => {
        const link = linkMap.get(part);
        if (!link) return <React.Fragment key={index + '-' + part.slice(0, 12)}>{parseMarkdownBold(part)}</React.Fragment>;
        return (
          <a key={link.id + '-' + index} href={link.url} target="_blank" rel="noreferrer" className="ensemble-inline-link">
            {link.label}<ExternalLink size={11} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
`;

content += fixedReplacement;
fs.writeFileSync('frontend/src/pages/landing/pages/page_AskOurChatbot.tsx', content);
