# Current Task: AskOurChatbot Page Redesign & Contrast / Prism Refinement

## Objective
1. **Collapsible Sidebar**:
   - Provide toggle controls (`PanelLeftClose` in the sidebar, `PanelLeftOpen` in the conversation header) allowing the user to collapse and expand the sidebar.
   - Smoothly animate the workspace grid layout (`grid-template-columns: 290px minmax(0, 1fr)` ↔ `0px minmax(0, 1fr)`).
2. **Neutral Dark Mode Palette**:
   - Replace navy/blue-tinted dark backgrounds with clean neutral dark gray/zinc tones (`#0f0f11`, `#111113`, `#141416`, `#18181b`, `#202024`, `#27272a`).
3. **AI Models & RAG Routing**:
   - Update model selector to:
     - `Joed AI - General` (`joed-ai`)
     - `Joed Mini - Fast` (`joed-mini`)
     - `Joed Pro - Deep Think` (`joed-pro`)
   - Confirm and preserve RAG routing to `${API_BASE_URL}/api/chat`, ensuring every model grounds its responses in Ensemble's indexed documentation.
   - Tailor `ThoughtLine` reasoning steps based on the selected model.
4. **WebGL2 Prism Background Fixes & Refinements**:
   - Confirmed only the WebGL2 3D Prism is applied on the background of `/AskOurChatbot` (no extra background animations or conflicting overlays).
   - Removed `loseContext()` call in `Prism.tsx` unmount cleanup that was permanently killing the WebGL context under React 18 StrictMode double-mounting.
   - Curated a colorful optical prism spectrum (Indigo `#6366f1`, Cobalt `#3b82f6`, Cyan `#06b6d4`, Emerald `#10b981`, Amber `#f59e0b`, Rose `#ec4899`, Violet `#8b5cf6`).
   - Calibrated light mode alpha using `clamp(pow(mapped.a, 1.45) * 0.72, 0.0, 0.52)` so rich prismatic refractions live vibrantly on crystal facets while keeping background airy, clean, and never overpowering.
   - Fixed initial `scrollIntoView` jump that pushed the top of the page off-screen on initial render.
5. **High-Contrast Text & Readability (WCAG AAA)**:
   - "Back to Ensemble": Converted to a frosted pill badge (`padding: 7px 16px; border-radius: 9999px; backdrop-filter: blur(12px)`) with crisp high-contrast text (`#f4f4f5` dark / `#0f172a` light).
   - Title & Subtitle: High contrast `#ffffff` (dark) and `#0f172a` (light) with appropriate text shadows over 3D refractions.
   - Sidebar Popular Questions: Polished cards with `#f4f4f5` (dark) and `#0f172a` (light, on `#ffffff`/`#f1f5f9`), with clear hover transitions.
   - Conversation Log & Message Bubbles: Crisp `#f4f4f5` on `#18181b` (dark) and `#0f172a` on pure `#ffffff` (light), eliminating washed-out text.
   - PromptBar: Light mode uses `#ffffff` background and `#0f172a` input ink, dark mode uses `#18181b` and `#f4f4f5`.
6. **Bespoke "Ask AI" Command Pill on Landing Page**:
   - Replaced generic AI-slop floating widget (cliché star outline + green ping dot) with a bespoke, precision-engineered studio command pill.
   - Embeds native Ensemble mark icon (`/ensemble_lg.svg`), crisp 13px Plus Jakarta Sans typography, and an OS-aware keyboard shortcut badge (`⌘K` / `Ctrl K`).
   - Added global `Cmd+K` / `Ctrl+K` keyboard shortcut that launches `/landing/AskOurChatbot` directly from the landing page.
   - Coordinated `ScrollToTop` offset (`bottom="76px"`) for clean vertical stacking without overlap.

7. **Micro-Prism Loader & Seamless Organic Bloom Expansion**:
   - Transformed the placeholder loading spinner into a jewel-like circular micro-prism core matching the exact rainbow spectrum of the WebGL2 background Prism (`#6366f1`, `#3b82f6`, `#06b6d4`, `#10b981`, `#f59e0b`, `#ec4899`, `#8b5cf6`).
   - Removed sharp polygon expansion and sudden explosive pop curves (`cubic-bezier(0.12, 0.8, 0.2, 1)`).
   - Designed a 100% round, gaussian-feathered circular chromatic radial bloom with `filter: blur(72px)` and smooth 1.6-second quintic ease-out curve (`cubic-bezier(0.22, 1, 0.36, 1)`).
   - Implemented a 3-phase staggered orchestration:
     - Phase 1 (0–1300ms): Micro-prism gently pulses, refracts, and spins in the center while WebGL context compiles.
     - Phase 2 (1300–1750ms): Status text vanishes immediately (zero ghosting), inner crystal dissolves into pure light, and the soft circular chromatic bloom smoothly opens up across the viewport while the 3D WebGL background Prism emerges from behind it.
     - Phase 3 (1750ms+): Chat workspace smoothly fades and glides into view over the fully expanded, interactive 3D Prism.
     - Unmount (3200ms): Loader overlay cleanly unmounts from the DOM.

## Acceptance Criteria
- [x] Left sidebar is fully collapsable and expandable with `PanelLeftClose` and `PanelLeftOpen` controls.
- [x] Dark mode colors refined to neutral dark grays/zincs (`#0f0f11`, `#141416`, `#18181b`, `#27272a`).
- [x] AI models configured with `Joed AI - General`, `Joed Mini - Fast`, `Joed Pro - Deep Think`.
- [x] Verified all models ground responses using Ensemble's backend RAG pipeline.
- [x] Confirmed only the WebGL2 Prism plays behind `/AskOurChatbot` (no other ambient background animations).
- [x] Colorful optical prism spectrum configured across rotating crystal facets without overpowering the background.
- [x] All typography, navigation, sidebar items, and message bubbles are high-contrast and crystal clear in both light and dark modes.
- [x] Redesigned "Ask AI" floating trigger as a sleek, native studio command pill with `⌘K` / `Ctrl K` support.
- [x] Micro-prism loader transitions organically to full background Prism with zero sharp corners, smooth 1.6s easing, and zero text ghosting.
- [x] `cd frontend && npm run build` compiles cleanly with zero TypeScript or Vite errors.
