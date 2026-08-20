const { createEmbedding } = require('./EmbeddingServices');
const { generateSupportAnswer, generateConversationReply } = require('./ClaudeSupportServices');
const { searchDocumentChunks, getDocumentChunkCount } = require('../repositories/DocumentRepositories');

class RagError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'RagError';
    this.statusCode = statusCode;
  }
}

function validateQuestion(value) {
  if (typeof value !== 'string') throw new RagError('Message must be a string', 400);
  const question = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!question) throw new RagError('Message is required', 400);
  if (question.length > 2000) throw new RagError('Message must not exceed 2,000 characters', 400);
  const injectionPatterns = [
    /\b(ignore|disregard|forget|override)\b.{0,50}\b(previous|prior|above|system|developer|assistant)\b.{0,30}\b(instruction|prompt|message|rule)s?\b/i,
    /\b(reveal|show|print|repeat|expose|return)\b.{0,50}\b(system|developer|hidden|internal)\b.{0,20}\b(prompt|instruction|message|rule)s?\b/i,
    /\b(jailbreak|prompt[ -]?injection|developer mode|do anything now|\bDAN\b)\b/i,
    /\b(reveal|show|print|expose|return)\b.{0,40}\b(api[ _-]?key|secret|password|access token|database url|environment variable)s?\b/i,
  ];
  if (injectionPatterns.some((pattern) => pattern.test(question))) {
    throw new RagError('I can only answer questions about Ensemble using public support documentation.', 400);
  }
  return question;
}

function validateConversationHistory(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new RagError('Conversation history must be an array', 400);
  if (value.length > 10) throw new RagError('Conversation history must not exceed 10 messages', 400);
  let totalLength = 0;
  return value.map((entry) => {
    if (!entry || !['user', 'assistant'].includes(entry.role) || typeof entry.content !== 'string') {
      throw new RagError('Conversation history contains an invalid message', 400);
    }
    const content = entry.content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (!content || content.length > 2000) throw new RagError('Conversation history contains an invalid message', 400);
    totalLength += content.length;
    if (totalLength > 8000) throw new RagError('Conversation history is too long', 400);
    return { role: entry.role, content };
  });
}

function contextualRetrievalText(question, history) {
  const previousUserTurns = history
    .filter((entry) => entry.role === 'user')
    .slice(-2)
    .map((entry) => entry.content);
  return [...previousUserTurns, question].join('\n');
}

function retrievalConfig() {
  const topK = Math.min(Math.max(Number(process.env.RAG_TOP_K || 5), 1), 10);
  const configuredSimilarity = Number(process.env.RAG_MIN_SIMILARITY || 0.35);
  const minSimilarity = Math.min(Math.max(Number.isFinite(configuredSimilarity) ? configuredSimilarity : 0.35, 0.3), 1);
  return { topK, minSimilarity };
}

function conversationalResponse(question) {
  const normalized = question.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)( there)?$/.test(normalized)) {
    return 'Hello! I’m the Ensemble Support Assistant. I can help with Ensemble accounts, projects, jobs, marketplace assets, credits, subscriptions, collaboration, forums, moderation, and support processes. What would you like to know?';
  }
  if (/^(thanks|thank you|thank you so much|thanks a lot|got it|okay thanks|ok thanks)$/.test(normalized)) {
    return 'You’re welcome! Let me know if you have another question about Ensemble.';
  }
  if (/^(bye|goodbye|see you|see you later|talk to you later)$/.test(normalized)) {
    return 'Goodbye! You can come back anytime you need help with Ensemble.';
  }
  if (/^(who are you|what are you|are you a bot|are you an ai)$/.test(normalized)) {
    return 'I’m the Ensemble Support Assistant. I answer questions using Ensemble’s approved support documentation and current public platform information.';
  }
  if (/^(help|what can you do|what can you help me with|how can you help|how can you help me)$/.test(normalized)) {
    return 'I can explain Ensemble features and processes, including accounts, projects, jobs, marketplace assets, credits, subscription plans, chat, forums, reports, moderation, and support tickets. Ask me a specific Ensemble question to get started.';
  }
  return null;
}

function isPublicDocument(doc) {
  const blocked = ['/admin', '/moderator', '/staff'];
  let pathname = doc.url;
  try { pathname = new URL(doc.url).pathname; } catch { /* relative route */ }
  return !blocked.some((prefix) => pathname.startsWith(prefix));
}

function publicSources(documents) {
  const seen = new Set();
  return documents.flatMap((doc) => {
    if (!isPublicDocument(doc)) return [];
    const key = doc.url;
    if (seen.has(key)) return [];
    seen.add(key);
    let heading = doc.heading;
    if (String(doc.url).includes('#current-plans')) heading = 'Subscription plans';
    if (String(doc.url).includes('#current-platform-settings')) heading = 'Current platform settings';
    return [{ title: doc.title, heading, url: doc.url }];
  });
}

function rerankDocuments(question, documents) {
  const planIntent = /\b(subscription|subscriptions|plan|plans|membership|premium|business plan|free plan)\b/i.test(question);
  const economyIntent = /\b(credit package|credit packages|top[ -]?up package|marketplace fee|listing fee|escrow|minimum payout|refund window)\b/i.test(question);
  return documents.map((document) => {
    let boost = 0;
    if (planIntent && String(document.url).includes('#current-plans')) boost += 0.2;
    if (economyIntent && String(document.url).includes('#current-platform-settings')) boost += 0.15;
    return { ...document, retrievalScore: Number(document.similarity) + boost };
  }).sort((a, b) => b.retrievalScore - a.retrievalScore);
}

const ROUTE_LABELS = {
  '/verification': 'personal verification page',
  '/account-verification-status': 'verification status page',
  '/landing/SubmitATicket': 'support ticket page',
  '/credits-subscriptions': 'subscription plans page',
  '/credits': 'credits page',
  '/transactions': 'transaction history',
  '/settings': 'account settings',
  '/forgot-password': 'password recovery page',
};

function routeLabel(route) {
  if (ROUTE_LABELS[route]) return ROUTE_LABELS[route];
  const segment = route.split('/').filter(Boolean).pop() || 'Ensemble page';
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function verifiedLinks(documents) {
  const origin = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  const seen = new Set();
  const routes = [];
  const addRoute = (route) => {
    if (!route.startsWith('/') || /[:*]/.test(route) || seen.has(route)) return;
    seen.add(route);
    routes.push(route);
  };
  for (const document of documents) {
    const content = `${document.heading || ''}\n${document.content || ''}`;
    for (const match of content.matchAll(/`(\/[^`\s]+)`/g)) addRoute(match[1]);
    try {
      const sourceUrl = new URL(document.url);
      addRoute(`${sourceUrl.pathname}${sourceUrl.hash}`);
    } catch {
      addRoute(String(document.url || ''));
    }
  }
  return routes.slice(0, 12).map((route, index) => ({
    id: `LINK_${index + 1}`,
    label: routeLabel(route.split('#')[0]),
    url: origin ? `${origin}${route}` : route,
  }));
}

function mostRelevantDocuments(documents) {
  if (!documents.length) return [];
  const bestSimilarity = Number(documents[0].retrievalScore ?? documents[0].similarity);
  const floor = Number.isFinite(bestSimilarity) ? bestSimilarity - 0.05 : -1;
  return documents
    .filter((document) => Number(document.retrievalScore ?? document.similarity) >= floor)
    .slice(0, 3);
}

async function answerDocumentationQuestion(message, historyValue) {
  const question = validateQuestion(message);
  const history = validateConversationHistory(historyValue);
  const conversation = conversationalResponse(question);
  if (conversation) return { answer: conversation, sources: [], links: [] };
  if (await getDocumentChunkCount() === 0) throw new RagError('Documentation has not been ingested yet', 503);
  const embedding = await createEmbedding(contextualRetrievalText(question, history));
  const { topK, minSimilarity } = retrievalConfig();
  const retrieved = await searchDocumentChunks(embedding, Math.min(topK * 2, 20), minSimilarity);
  const documents = rerankDocuments(question, retrieved.filter(isPublicDocument)).slice(0, topK);
  if (!documents.length) {
    return {
      answer: await generateConversationReply(question, history),
      sources: [],
      links: [],
    };
  }
  const links = verifiedLinks(documents);
  return {
    answer: await generateSupportAnswer(question, documents, history, links),
    sources: publicSources(mostRelevantDocuments(documents)),
    links,
  };
}

module.exports = {
  RagError,
  validateQuestion,
  validateConversationHistory,
  contextualRetrievalText,
  retrievalConfig,
  conversationalResponse,
  isPublicDocument,
  mostRelevantDocuments,
  rerankDocuments,
  verifiedLinks,
  answerDocumentationQuestion,
  publicSources,
};
