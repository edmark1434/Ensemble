# Current Task — Build Simple HTML Documentation RAG Backend

## Active Frontend Chatbot Redesign

Refactor the public support chatbot so it matches Ensemble's landing-page theme while preserving the existing anonymous RAG API integration.

Acceptance criteria:

* [x] Use the existing dark surfaces, blue accent, typography, borders, and spacing conventions without gradients.
* [x] Provide a responsive chat workspace with quick questions, assistant status, reset, and guest-access guidance.
* [x] Preserve conversation history, rate-limit/error feedback, loading state, and backend-verified inline links.
* [x] Support an accessible multi-line composer with Enter to send and Shift+Enter for a new line.
* [x] Pass focused frontend linting and the production build.
* [x] Brand the assistant as Joeds AI using the Ensemble logo, including a reduced-motion-safe thinking animation.

## Active Public Chatbot Integration and Hardening

Connect the landing-page chatbot to the documentation API and enforce public RAG safety controls on the backend.

Acceptance criteria:

* [x] Connect `page_AskOurChatbot.tsx` to `POST /api/chat` through the shared Axios client.
* [x] Display loading, safe errors, answers, and backend-verified source links.
* [x] Prevent duplicate/empty/overlength submissions in the UI and backend.
* [x] Rate-limit the public chat endpoint with consistent JSON errors.
* [x] Reject common prompt-injection and secret-exfiltration instructions before embedding or Claude calls.
* [x] Exclude staff/admin/moderator documents before sending retrieval context to Claude.
* [x] Refuse unrelated questions when public-document similarity is insufficient.
* [x] Strengthen Claude instructions so retrieved content is treated as untrusted reference data.
* [x] Pass focused backend checks and the frontend production build.
* [x] Handle common conversational intents before documentation retrieval.
* [x] Accept and validate a bounded recent conversation history without requiring a session.
* [x] Use recent user turns to resolve contextual Ensemble follow-up questions during retrieval.
* [x] Use RAG only when public Ensemble documentation meets the relevance threshold.
* [x] Generate a scoped conversational reply when documentation retrieval is unnecessary.
* [x] Present only the closest verified source links as a sentence inside the assistant response.
* [x] Render verified page citations inline at the exact sentence where the assistant mentions a route.

## Active Database-Backed Documentation Sources

Generate current Markdown documentation from approved PostgreSQL data before each RAG ingestion.

Acceptance criteria:

* [x] Read plan definitions from the existing `plans` table, never user-specific `subscriptions`.
* [x] Read only whitelisted public fields from `platform_settings` sections `platform` and `economy`.
* [x] Generate deterministic Markdown under `backend/data/generated` before source loading.
* [x] Register generated platform settings and plan documents in the existing source catalog.
* [x] Preserve existing Markdown chunks by using distinct source URLs.
* [x] Verify generated content and re-ingest all enabled sources successfully.

## Active Embedding Refactor — Local Hugging Face

The RAG embedding provider is being changed from an OpenAI-compatible HTTP API to a locally cached Hugging Face Transformers.js feature-extraction pipeline.

Acceptance criteria:

* [x] Use `sentence-transformers/all-MiniLM-L6-v2` for both document and question embeddings.
* [x] Produce normalized 384-dimensional vectors and enforce the matching configuration.
* [x] Add an append-only migration from `VECTOR(1536)` to `VECTOR(384)`.
* [x] Remove the embedding API URL/key requirement while preserving Claude for final answer generation.
* [x] Load and reuse one local model pipeline per backend process.
* [x] Re-ingest all derived document chunks after switching models.

## Active Data-Source Decision — Frontend Route Knowledge

The RAG source of truth is the repository's React route source rather than runtime scraping of the Vite SPA. Curated Markdown is stored under `backend/data/` by category, with `backend/data/sources.json` mapping each knowledge document to its application-relative frontend URL. This avoids ingesting the empty shared `index.html` returned when Axios requests a client-rendered route.

### Data preparation acceptance criteria

* [x] FAQ and public hiring/working information is extracted from landing-page route source.
* [x] Account, collaboration, marketplace, work, payments, support, and legal processes are categorized.
* [x] Every knowledge source records a real route from `frontend/src/App.tsx` and its relevant source file(s).
* [x] Dynamic URLs remain route patterns and are not presented as literal customer links.
* [x] UI-only or incomplete behavior is labeled instead of represented as a durable backend capability.
* [x] A machine-readable source catalog controls which Markdown documents are enabled for ingestion.
* [x] Platform overview and advertised Ensemble features are covered.
* [x] Credits cover top-ups, wallets, transfers, escrow, purchases, fees, cashouts, refunds, and ledger history.
* [x] Chat, calls, Google meetings, forums, and collaboration routes are covered.
* [x] Tickets, purchases, reports, disputes, violations, and moderation flows are covered.
* [x] Admin and specialist moderator portals are documented as role-protected operational references.

## Objective

Build a simple, maintainable **RAG documentation support backend** using the project's existing architecture and conventions.

Technology:

* Node.js
* Express.js
* PostgreSQL
* pgvector
* Anthropic Claude
* Axios
* Cheerio

Use Claude for the **final RAG/support response generation**.

Configured Claude model:

```env
ANTHROPIC_MODEL=claude-sonnet-5
```

Do not hardcode API keys, database credentials, or model values directly inside the source code.

---

# Critical Codebase Rules

## Do Not Modify Unrelated Files

Only modify files directly required for this RAG implementation.

Do NOT:

* refactor unrelated features
* rename unrelated files
* move unrelated files
* modify unrelated controllers
* modify unrelated services
* modify unrelated repositories
* modify unrelated routes
* modify unrelated frontend files
* change unrelated database tables
* change authentication logic
* change middleware unrelated to RAG
* perform unrelated cleanup
* make opportunistic improvements outside the task

If an unrelated issue is discovered, leave it unchanged.

The scope is strictly:

```text
HTML documentation
→ scrape
→ clean
→ chunk
→ embed
→ pgvector
→ retrieve
→ Claude
→ answer + sources
```

---

# Preserve Existing Architecture

Before creating or editing files:

1. Inspect the existing repository.
2. Identify current file naming conventions.
3. Identify controller/service/repository conventions.
4. Identify database configuration.
5. Identify Express configuration.
6. Identify environment variable conventions.
7. Identify existing AI configuration.
8. Identify existing error handling conventions.
9. Identify existing logging conventions.

Follow the existing project.

If existing files already provide functionality such as:

```text
database connection
Express app
server
environment configuration
AI client
logger
error handler
```

reuse them.

Do not create duplicate infrastructure.

---

# Follow Existing Naming Format

The existing project's naming convention takes priority over examples in this task.

For example, if the project uses:

```text
UserControllers.js
UserServices.js
UserRepositories.js
```

continue following that format.

Do not suddenly introduce:

```text
user.controller.js
user.service.js
user.repository.js
```

The same applies to:

* folders
* functions
* classes
* variables
* route naming
* repository methods
* service methods

---

# RAG Architecture

```text
DOCUMENT INGESTION

Configured HTML URLs
        ↓
Axios
        ↓
HTML
        ↓
Cheerio
        ↓
Clean documentation
        ↓
Extract sections
        ↓
Chunk sections
        ↓
Create embedding
        ↓
PostgreSQL + pgvector
```

Chat:

```text
USER QUESTION
      ↓
Create question embedding
      ↓
pgvector similarity search
      ↓
Top relevant documentation chunks
      ↓
Question + retrieved documentation
      ↓
Claude Sonnet
      ↓
Grounded answer
      ↓
Answer + real documentation URLs
```

---

# Environment Variables

Do not place real credentials in any generated file.

Only use placeholders.

Create or extend:

```text
.env.example
```

with:

```env
PORT=

DATABASE_URL=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5

EMBEDDING_API_KEY=
EMBEDDING_MODEL=
```

If the existing project already has equivalent variables, reuse its naming style.

Do not overwrite existing `.env` values.

Do not place actual secrets in:

* source files
* README
* migrations
* test scripts
* logs
* committed files

---

# Claude Configuration

Use Anthropic Claude for the final AI support response.

Install the Anthropic SDK only if it does not already exist:

```bash
npm install @anthropic-ai/sdk
```

Create or reuse the project's AI configuration.

Conceptually:

```js
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export default anthropic;
```

Do not hardcode:

```js
"claude-sonnet-5"
```

throughout the application.

Always use:

```js
process.env.ANTHROPIC_MODEL
```

Example:

```js
const response = await anthropic.messages.create({
  model: process.env.ANTHROPIC_MODEL,
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: prompt
    }
  ]
});
```

---

# Important Embedding Separation

Claude is being used for the **answer generation model**.

The embedding system should remain a separate service.

Architecture:

```text
Claude
=
understand retrieved context
+
generate support answer
```

while:

```text
Embedding model
=
convert documentation into vectors
+
convert questions into vectors
```

Do not attempt to store Claude chat output as the document embedding.

Keep:

```text
EmbeddingService
```

separate from:

```text
ClaudeSupportService
```

---

# HTML Source Configuration

Documentation URLs must live in **one configurable array**.

Do not hardcode documentation URLs inside:

* scraper logic
* controller
* RAG retrieval
* Claude service
* embedding service

Create or reuse an appropriate configuration file.

Example:

```js
export const RAG_SOURCES = [
  {
    name: "Documentation Source 1",
    url: "https://example.com/docs/page-1",
    enabled: true
  },

  {
    name: "Documentation Source 2",
    url: "https://example.com/docs/page-2",
    enabled: true
  }
];
```

This must be easy to extend later.

Adding another source should require only:

```js
{
  name: "New Documentation",
  url: "https://example.com/docs/new",
  enabled: true
}
```

No scraper or retrieval logic should need modification.

---

# Source Object Format

For V1 use:

```js
{
  name: String,
  url: String,
  enabled: Boolean
}
```

Do not add unnecessary configuration fields yet.

Only ingest:

```js
source.enabled === true
```

Conceptually:

```js
for (const source of RAG_SOURCES) {
  if (!source.enabled) continue;

  await ingestSource(source);
}
```

---

# PostgreSQL + pgvector

Use the existing local PostgreSQL installation.

Do not add Docker.

Enable:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Create only the table required for this RAG feature.

Example:

```sql
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGSERIAL PRIMARY KEY,

    title TEXT,

    heading TEXT,

    url TEXT NOT NULL,

    content TEXT NOT NULL,

    chunk_index INTEGER NOT NULL,

    embedding VECTOR(EMBEDDING_DIMENSION),

    created_at TIMESTAMP DEFAULT NOW()
);
```

Replace:

```text
EMBEDDING_DIMENSION
```

with the actual dimension required by the configured embedding model.

Do not change unrelated database tables.

---

# HTML Scraper

Use:

```text
Axios
+
Cheerio
```

Flow:

```text
URL
↓
Axios
↓
HTML
↓
Cheerio
↓
clean documentation
```

Conceptual function:

```js
scrapeDocumentation(url)
```

Return:

```js
{
  title: "...",
  url: "...",

  sections: [
    {
      heading: "...",
      content: "..."
    }
  ]
}
```

---

# HTML Cleaning

Remove irrelevant elements such as:

```text
script
style
nav
footer
header
aside
noscript
```

Prefer content from:

```text
main
```

then:

```text
article
```

then:

```text
body
```

Do not save the full unprocessed page HTML into the vector database.

---

# Preserve Documentation Structure

Preserve useful elements such as:

```text
h1
h2
h3
p
ul
ol
li
pre
code
```

Group content under its corresponding heading.

Example HTML:

```html
<h2>Reset Password</h2>

<p>Open account settings.</p>

<p>Select Security.</p>
```

should become conceptually:

```js
{
  heading: "Reset Password",
  content: "Open account settings.\n\nSelect Security."
}
```

---

# Chunking

Create a reusable chunking service.

Conceptual function:

```js
chunkSections(sections)
```

Requirements:

* preserve section headings
* split large sections
* prefer paragraph boundaries
* avoid empty chunks
* maintain original order
* avoid cutting sentences unnecessarily

For V1, target roughly:

```text
1500–3000 characters
```

per chunk.

Do not add a complicated chunking framework yet.

---

# Chunk Result

Conceptual result:

```js
{
  heading: "Pending Payments",
  content: "Payments may remain pending while verification is completed...",
  chunkIndex: 0
}
```

If one section is too large:

```text
Pending Payments

→ Chunk 0
→ Chunk 1
→ Chunk 2
```

Every chunk should still retain:

```text
heading = "Pending Payments"
```

---

# Embedding Service

Create or reuse one shared embedding service.

Conceptual function:

```js
createEmbedding(text)
```

It must be reused for:

```text
1. documentation chunks during ingestion
2. user questions during retrieval
```

Do not duplicate embedding API logic.

---

# Documentation Embedding Input

Include context when creating document vectors.

Use conceptually:

```js
const embeddingText = `
Title: ${page.title}
Section: ${chunk.heading}

${chunk.content}
`.trim();
```

Then:

```js
const embedding =
  await createEmbedding(embeddingText);
```

---

# Ingestion Pipeline

The ingestion process must read the configurable:

```text
RAG_SOURCES
```

array.

Pipeline:

```text
RAG_SOURCES
      ↓
enabled sources
      ↓
scrape URL
      ↓
Cheerio parsing
      ↓
sections
      ↓
chunks
      ↓
embedding
      ↓
PostgreSQL
```

Conceptually:

```js
for (const source of RAG_SOURCES) {
  if (!source.enabled) {
    continue;
  }

  const page =
    await scrapeDocumentation(source.url);

  const chunks =
    chunkSections(page.sections);

  for (const chunk of chunks) {
    const embeddingText = `
Title: ${page.title}
Section: ${chunk.heading}

${chunk.content}
`.trim();

    const embedding =
      await createEmbedding(embeddingText);

    await saveChunk({
      title: page.title,
      heading: chunk.heading,
      url: page.url,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      embedding
    });
  }
}
```

---

# Do Not Duplicate Data

Running ingestion repeatedly must not endlessly create duplicate chunks.

For V1:

```text
source URL
   ↓
delete existing chunks for THAT URL
   ↓
scrape current page
   ↓
chunk
   ↓
embed
   ↓
insert fresh chunks
```

Do not delete chunks belonging to unrelated sources.

---

# RAG Retrieval

When the user asks:

```text
How do I reset my password?
```

perform:

```text
question
↓
createEmbedding(question)
↓
pgvector similarity search
↓
top relevant chunks
```

Conceptual SQL:

```sql
SELECT
    id,
    title,
    heading,
    url,
    content,
    1 - (embedding <=> $1::vector) AS similarity

FROM document_chunks

ORDER BY embedding <=> $1::vector

LIMIT 5;
```

Do not scrape websites during a chat request.

The chatbot must retrieve already-ingested data.

---

# Test Retrieval Before Claude

Before sending results to Claude, verify:

```text
question
→ embedding
→ vector search
→ relevant documentation
```

independently.

If retrieval results are poor, fix retrieval/chunking instead of relying on Claude to compensate.

---

# Claude Support Service

After retrieving the relevant chunks:

```text
user question
+
retrieved documentation
+
support instructions
```

are sent to:

```env
ANTHROPIC_MODEL=claude-sonnet-5
```

Conceptually:

```js
const response = await anthropic.messages.create({
  model: process.env.ANTHROPIC_MODEL,
  max_tokens: 1000,

  system: SUPPORT_SYSTEM_PROMPT,

  messages: [
    {
      role: "user",
      content: contextPrompt
    }
  ]
});
```

Follow the project's existing Anthropic wrapper if one already exists.

Do not create a second Anthropic client if the repository already has one.

---

# Claude Instructions

Use instructions equivalent to:

```text
You are a customer support documentation assistant.

Use the retrieved documentation as the source of truth.

Rules:

1. Answer the customer's concern using the supplied documentation.

2. Do not invent company policies.

3. Do not invent company procedures.

4. Do not invent product features.

5. Do not invent documentation links.

6. Only use source links provided with the retrieved documentation.

7. If the retrieved documentation is insufficient, clearly say so.

8. Prefer concise and useful answers.

9. Give step-by-step instructions where appropriate.

10. Never claim to have checked or modified the customer's account.

11. Never claim an action occurred unless an authorized backend tool actually performed it.

12. Recommend human support when account-specific investigation is required.
```

---

# Claude Context Format

Send retrieved documents clearly.

Example:

```text
CUSTOMER QUESTION:

Why is my payment still pending?


RETRIEVED DOCUMENTATION:


SOURCE 1

Title:
Payment Troubleshooting

Section:
Pending Payments

URL:
https://example.com/docs/payments

Content:
Payments may remain pending while...


SOURCE 2

Title:
Payment Verification

Section:
Processing

URL:
https://example.com/docs/payment-verification

Content:
...
```

---

# Source URLs

The response source URLs must come directly from retrieved PostgreSQL rows.

Do not ask Claude to construct URLs.

Correct:

```text
PostgreSQL result
→ source URL
→ frontend response
```

Incorrect:

```text
Claude
→ guesses source URL
```

---

# Chat Endpoint

Integrate into the existing Express architecture.

Target concept:

```http
POST /api/chat
```

Input:

```json
{
  "message": "How do I reset my password?"
}
```

Flow:

```text
request
↓
validation
↓
controller
↓
RAG retrieval
↓
question embedding
↓
pgvector
↓
relevant chunks
↓
Claude
↓
answer
↓
sources
```

---

# Response

Return conceptually:

```json
{
  "answer": "To reset your password, follow the documented password recovery process...",

  "sources": [
    {
      "title": "Account Documentation",
      "heading": "Reset Password",
      "url": "https://example.com/docs/account"
    }
  ]
}
```

Deduplicate repeated sources where appropriate.

Prefer:

```text
URL + heading
```

as the deduplication key.

---

# Environment Rules

Only placeholders must be added to `.env.example`.

Example:

```env
PORT=

DATABASE_URL=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5

EMBEDDING_API_KEY=
EMBEDDING_MODEL=
```

Do not populate real values.

Do not modify the user's real `.env` unless absolutely necessary.

If `.env` already exists, leave existing values untouched.

---

# Error Handling

Follow the project's existing error handling system.

Handle:

* malformed URL
* source disabled
* HTTP timeout
* HTML fetch failure
* empty page content
* chunking failure
* embedding failure
* PostgreSQL failure
* vector retrieval failure
* zero retrieved documents
* Claude API failure
* malformed chat request

Never return sensitive internal errors to the frontend.

---

# Security

Never expose:

```text
ANTHROPIC_API_KEY
EMBEDDING_API_KEY
DATABASE_URL
database passwords
stack traces
raw SQL errors
authorization headers
```

All Claude and embedding API calls must happen server-side.

---

# Do Not Build Yet

Do not add:

```text
Docker
Redis
LangChain
LlamaIndex
Pinecone
Qdrant
Playwright
recursive crawling
sitemap crawling
scheduled ingestion
conversation memory
hybrid search
reranking
agents
tool calling
admin UI
streaming
```

unless those features already exist and are directly necessary.

---

# Development Order

Implement in this order:

```text
1. Inspect existing repository

2. Identify naming conventions

3. Identify current architecture

4. Reuse existing PostgreSQL configuration

5. Reuse existing Anthropic/AI configuration if available

6. Add environment placeholders only

7. Add pgvector table/migration

8. Add configurable RAG_SOURCES array

9. Build HTML scraper

10. Build section extraction

11. Build chunker

12. Build reusable embedding service

13. Build ingestion script

14. Verify chunks and vectors in PostgreSQL

15. Build vector retrieval

16. Test retrieval independently

17. Build Claude support response service

18. Add chat endpoint

19. Return answer + real sources

20. Test end-to-end
```

---

# Definition of Done

The feature is complete when:

```text
CONFIGURATION

RAG_SOURCES = [
  HTML URL,
  HTML URL,
  HTML URL
]

        ↓

INGESTION

HTML URL
↓
Axios
↓
Cheerio
↓
clean content
↓
sections
↓
chunks
↓
embedding
↓
PostgreSQL + pgvector


        ↓

CHAT

User question
↓
question embedding
↓
pgvector similarity search
↓
top relevant chunks
↓
Claude Sonnet
↓
grounded support answer
↓
real source URLs
```

---

# Final Critical Requirements

1. Do not change unrelated files.
2. Do not change unrelated functionality.
3. Preserve existing code behavior.
4. Inspect the repository first.
5. Follow existing naming conventions.
6. Follow existing backend architecture.
7. Reuse existing infrastructure wherever possible.
8. Do not create duplicate database or AI configurations.
9. Do not rename or move existing files unnecessarily.
10. Do not refactor unrelated code.
11. Put all HTML documentation sources in one configurable array.
12. New documentation sources must be addable by adding another array object.
13. Do not hardcode documentation URLs throughout the codebase.
14. Use only sources where `enabled === true`.
15. Scrape HTML during ingestion, not during every chat request.
16. Chunk documentation before embedding.
17. Generate document embeddings during ingestion.
18. Store embeddings in PostgreSQL + pgvector.
19. Generate a question embedding for every search.
20. Use pgvector to retrieve relevant chunks.
21. Send only relevant chunks to Claude.
22. Use `process.env.ANTHROPIC_MODEL`.
23. Use `ANTHROPIC_MODEL=claude-sonnet-5`.
24. Keep API keys as environment placeholders only.
25. Do not hardcode real credentials.
26. Preserve each document chunk's original URL.
27. Return source URLs from PostgreSQL retrieval results.
28. Never allow Claude to invent documentation URLs.
29. Do not regenerate document embeddings for each chat.
30. Keep V1 simple.

# Main Goal

Implement this foundation:

```text
CONFIGURE
RAG_SOURCES array

        ↓

INGEST ONCE
HTML
→ scrape
→ clean
→ chunk
→ embed
→ store

        ↓

RETRIEVE MANY TIMES
question
→ embed
→ pgvector
→ relevant chunks
→ Claude
→ answer + sources
```

Do not expand the scope until this pipeline works correctly end-to-end.

---

# Implementation Status — August 19, 2026

Implemented:

* [x] Curated 17-source Markdown knowledge catalog under `backend/data`.
* [x] CommonJS embedding service using a locally cached Hugging Face Transformers.js model.
* [x] Reusable heading-preserving Markdown chunking.
* [x] Transactional per-URL document replacement repository.
* [x] pgvector cosine-similarity retrieval with configurable top-K and threshold.
* [x] Claude Messages API support generation using `ANTHROPIC_MODEL`.
* [x] Verified source deduplication and staff-route filtering.
* [x] `POST /api/chat` controller/service/repository route for Postman and frontend use.
* [x] `npm run rag:ingest` ingestion command.
* [x] Backend `.env.example` placeholders without real credentials.
* [x] Syntax, validation, chunking, source loading, and route-graph checks.

Verified locally:

* [x] pgvector migrations 138 and 139 are applied.
* [x] The local MiniLM model returns normalized 384-dimensional vectors.
* [x] Ingested 97 chunks from all 17 enabled documentation sources.
* [x] Retrieval returns the credit-system documentation for a credit-system question.

Remaining environment verification:

* [ ] Update the real backend `.env` to use the 384-dimensional local model configuration.
* [ ] Run Claude answer generation end to end with a valid `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
