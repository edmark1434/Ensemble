const fs = require('fs/promises');
const path = require('path');
const { chunkSections } = require('./ChunkServices');
const { createEmbedding } = require('./EmbeddingServices');
const { replaceDocumentChunks } = require('../repositories/DocumentRepositories');
const { generateDatabaseDocumentation } = require('./DatabaseDocumentationServices');

const DATA_ROOT = path.resolve(__dirname, '../data');
const SOURCE_CATALOG_PATH = path.join(DATA_ROOT, 'sources.json');

function parseMarkdown(markdown, fallbackTitle) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  let title = fallbackTitle;
  let heading = fallbackTitle;
  let body = [];
  const sections = [];
  const pushSection = () => {
    const content = body.join('\n').trim();
    if (content) sections.push({ heading, content });
    body = [];
  };
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (match) {
      pushSection();
      heading = match[2].trim();
      if (match[1] === '#' && title === fallbackTitle) title = heading;
    } else {
      body.push(line);
    }
  }
  pushSection();
  if (!sections.length) throw new Error(`No documentation content found for ${fallbackTitle}`);
  return { title, sections };
}

function resolveFrontendUrl(route) {
  const origin = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  return origin ? `${origin}${route.startsWith('/') ? route : `/${route}`}` : route;
}

async function loadEnabledSources() {
  const catalog = JSON.parse(await fs.readFile(SOURCE_CATALOG_PATH, 'utf8'));
  if (!Array.isArray(catalog)) throw new Error('RAG source catalog must be an array');
  return catalog.filter((source) => source?.enabled === true);
}

async function ingestSource(source) {
  const filePath = path.resolve(DATA_ROOT, source.file);
  if (!filePath.startsWith(`${DATA_ROOT}${path.sep}`)) throw new Error(`Invalid RAG source path: ${source.file}`);
  const markdown = await fs.readFile(filePath, 'utf8');
  const page = parseMarkdown(markdown, source.name);
  const chunks = chunkSections(page.sections);
  if (!chunks.length) throw new Error(`No chunks generated for ${source.name}`);
  const embeddedChunks = [];
  for (const chunk of chunks) {
    const embeddingText = `Title: ${page.title}\nSection: ${chunk.heading}\n\n${chunk.content}`;
    embeddedChunks.push({
      ...chunk,
      title: page.title,
      embedding: await createEmbedding(embeddingText),
    });
  }
  const url = resolveFrontendUrl(source.url);
  const count = await replaceDocumentChunks({ url, chunks: embeddedChunks });
  return { name: source.name, url, chunks: count };
}

async function ingestDocumentation() {
  await generateDatabaseDocumentation();
  const sources = await loadEnabledSources();
  const results = [];
  for (const source of sources) results.push(await ingestSource(source));
  return results;
}

module.exports = { parseMarkdown, loadEnabledSources, ingestSource, ingestDocumentation };
