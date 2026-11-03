// Run from video-editor: node scripts/check-upload-deletion.cjs
// Real React/Radix DOM lifecycle; network and editor project data are fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const base = path.resolve(__dirname, '../src');
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
let editorStore;
Module._resolveFilename = function (id, ...args) {
  return originalResolve.call(this, id.startsWith('@/') ? path.join(base, id.slice(2)) : id, ...args);
};
Module._load = function (id, parent, ...args) {
  // jsdom's optional canvas binary is not needed for dialog/input tests.
  if (id === 'canvas') return {};
  if (id.endsWith('/store/use-store')) return { __esModule: true, default: editorStore };
  if (id.endsWith('/components/market-asset-browser')) return { MarketPreview: () => null };
  return originalLoad.call(this, id, parent, ...args);
};
for (const ext of ['.ts', '.tsx']) Module._extensions[ext] = (mod, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename,
  });
  mod._compile(outputText, filename);
};
const pnpm = path.resolve(__dirname, '../node_modules/.pnpm');
const jsdomDir = fs.readdirSync(pnpm).find(name => name.startsWith('jsdom@'));
assert.ok(jsdomDir, 'Installed jsdom dependency required');
const { JSDOM } = require(path.join(pnpm, jsdomDir, 'node_modules/jsdom'));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost:3000', pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'CustomEvent', 'Event', 'MouseEvent', 'KeyboardEvent', 'DocumentFragment']) global[name] = dom.window[name];
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
global.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.IS_REACT_ACT_ENVIRONMENT = true;
HTMLElement.prototype.scrollIntoView = function () {};
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = function () {};
HTMLElement.prototype.releasePointerCapture = function () {};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { create } = require('zustand');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { mediaSources, mediaSourceKey } = require('../src/features/editor/utils/media-sources.ts');
const original = 'https://storage.example/uploads/user/clip one.mp4';
const proxy = 'https://cdn.example/uploads/user/clip-proxy.mp4';
const clip = { id: 'clip', type: 'video', details: { src: proxy + '?Signature=rotating' } };
editorStore = create(() => ({ projectId: 'current', projectName: 'Unsaved current project',
  activeSceneBlockId: null, currentBlockName: null, trackItemIds: ['clip'], trackItemsMap: { clip } }));
const { UploadActions } = require('../src/features/editor/components/upload-actions.tsx');
const { UploadDeletionDialog } = require('../src/features/editor/modals/upload-deletion-dialog.tsx');
const { useUploadDeletion } = require('../src/features/editor/store/use-upload-deletion.ts');
const { MediaPlaceholder } = require('../src/features/editor/components/media-placeholder.tsx');
const axios = require('axios');
const { toast } = require('sonner');
let deletionFails = false;
let calls = 0;
let errors = 0;
toast.error = () => errors++;
axios.delete = async url => { assert.equal(url, '/api/media-assets/upload?permanent=true'); calls++; if (deletionFails) throw Error('Fixture failure'); };
global.fetch = async () => ({ ok: true, json: async () => ({ sources: [original, proxy], projects: [] }) });
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
let setRow;
const invalidations = [];
client.invalidateQueries = async ({ queryKey }) => {
  assert.equal(useUploadDeletion.getState().open, false, 'Close before removing the upload row');
  invalidations.push(queryKey[0]);
  if (queryKey[0] === 'media-assets') setRow(false);
};
const upload = { id: 'upload', fileName: 'Clip one', type: 'video', url: original };
function Fixture() {
  const [row, changeRow] = React.useState(true);
  setRow = changeRow;
  return React.createElement(QueryClientProvider, { client },
    row && React.createElement(UploadActions, { item: upload, permanent: true }),
    React.createElement(UploadDeletionDialog),
    React.createElement('button', { id: 'editor-control' }, 'Editor control'));
}
const root = createRoot(document.getElementById('root'));
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
const click = async element => { assert.ok(element); await act(async () => { element.click(); await settle(); }); };
const button = label => [...document.querySelectorAll('button')].find(node => node.textContent === label);
async function openFromMenu() {
  await act(async () => {
    document.querySelector('[aria-label="Options for Clip one"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }));
    await settle();
  });
  await click([...document.querySelectorAll('[role="menuitem"]')].find(node => node.textContent === 'Delete forever'));
  await act(settle);
  assert.ok(document.querySelector('[role="dialog"]'), 'Confirmation is visible');
  assert.match(document.body.textContent, /Unsaved current project/);
  assert.doesNotMatch(document.body.textContent, /not used in any/);
}
function assertReleased() {
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.notEqual(document.body.style.pointerEvents, 'none', 'No stranded Radix pointer lock');
  document.getElementById('editor-control').focus();
  assert.equal(document.activeElement.id, 'editor-control', 'No stranded focus trap');
}
async function main() {
  assert.equal(mediaSourceKey(original), mediaSourceKey('https://cdn.example/uploads/user/clip%20one.mp4?Signature=x'));
  const nested = { trackItemIds: ['scene'], trackItemsMap: { scene: { type: 'scene', details: { content: editorStore.getState() } } } };
  assert.deepEqual(mediaSources(nested), [clip.details.src]);
  await act(async () => { root.render(React.createElement(Fixture)); });
  await openFromMenu();
  await click(button('Cancel'));
  assertReleased();
  await openFromMenu();
  deletionFails = true;
  await click(button('Delete forever'));
  assert.equal(errors, 1);
  assert.ok(document.querySelector('[role="dialog"]'), 'Failure remains retryable');
  assert.equal(button('Delete forever').disabled, false);
  deletionFails = false;
  await click(button('Delete forever'));
  assert.equal(calls, 2);
  assertReleased();
  assert.equal(document.querySelector('[aria-label="Options for Clip one"]'), null);
  assert.deepEqual(invalidations.sort(), ['media-assets', 'media-storage-usage', 'upload-availability']);
  for (const props of [{}, { missing: true }, { failed: true }]) {
    await act(async () => root.render(React.createElement(MediaPlaceholder, props)));
    const output = document.querySelector('output');
    // jsdom cannot paint, but does retain the style supplied to React.
    assert.match(output.textContent, props.missing ? /Missing media/ : props.failed ? /Unable to load media/ : /Loading media/);
    assert.match(output.style.backgroundImage, /data:image\/svg\+xml/);
    assert.equal(output.style.backgroundSize, '12px 12px');
    assert.equal(output.style.pointerEvents, 'none');
  }
  await act(async () => root.unmount());
  client.clear();
  dom.window.close();
  console.log('PASS: signed/proxy and nested sources; unsaved usage; real dropdown/dialog cancel, failure, retry, row removal, pointer/focus cleanup; placeholder states.');
}
main().catch(error => { console.error(error); process.exitCode = 1; dom.window.close(); client.clear(); });
