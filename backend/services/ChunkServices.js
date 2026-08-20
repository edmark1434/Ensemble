function splitOversizedParagraph(paragraph, maxCharacters) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [paragraph];
  const parts = [];
  let current = '';
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (candidate.length > maxCharacters && current) {
      parts.push(current);
      current = sentence.trim();
    } else if (candidate.length > maxCharacters) {
      for (let start = 0; start < candidate.length; start += maxCharacters) {
        parts.push(candidate.slice(start, start + maxCharacters).trim());
      }
      current = '';
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts.filter(Boolean);
}

function chunkSections(sections, { targetCharacters = 2200, maxCharacters = 3000 } = {}) {
  const chunks = [];
  for (const section of sections) {
    const paragraphs = String(section.content || '').split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
      .flatMap((p) => p.length > maxCharacters ? splitOversizedParagraph(p, maxCharacters) : [p]);
    let current = '';
    for (const paragraph of paragraphs) {
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (current && (candidate.length > maxCharacters || (current.length >= targetCharacters && paragraph.length > 300))) {
        chunks.push({ heading: section.heading, content: current });
        current = paragraph;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push({ heading: section.heading, content: current });
  }
  return chunks.map((chunk, chunkIndex) => ({ ...chunk, chunkIndex }));
}

module.exports = { chunkSections };
