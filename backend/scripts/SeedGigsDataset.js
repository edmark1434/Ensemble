/**
 * Replaces existing services in the database with a fresh, realistic dataset of
 * 25 video-editing & post-production services across all 4 Discovery Ranking Archetypes:
 *   - Archetype A: Rising Creators (6 services — 0 reviews, 100% completeness, <= 6 days old)
 *   - Archetype B: Proven Veterans (Available) (9 services — 4.7★ to 5.0★, open slots)
 *   - Archetype C: Proven Veterans (Busy Queue) (5 services — high ratings, queue nearly/fully booked)
 *   - Archetype D: Newer / Partial-Completeness Services (5 services — 1–2 tiers, fewer images/milestones)
 *
 * Usage: node backend/scripts/SeedGigsDataset.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../lib/Database');

const DEFAULT_TOS =
  '1. Raw footage, brand guidelines, and reference links must be provided via high-speed cloud storage prior to Milestone 1.\n2. Included revisions cover pacing, graphics, and color adjustments within the agreed brief.\n3. Final master files are delivered in 4K H.264/ProRes upon milestone sign-off.';

const FULL_MILESTONES = [
  { name: 'Phase 1: Assembly & Story Structure', description: 'Syncing multi-cam audio, selecting best takes, and locking narrative pacing.' },
  { name: 'Phase 2: Motion Graphics, VFX & B-Roll', description: 'Custom titles, visual callouts, dynamic transitions, and b-roll integration.' },
  { name: 'Phase 3: Color Grade & Broadcast Audio Master', description: 'DaVinci Resolve color grading, SFX sweetening, and -14 LUFS audio mastering.' },
];

const TWO_MILESTONES = [
  { name: 'Phase 1: Rough Cut & Pacing', description: 'Initial timeline cut and hook alignment for client review.' },
  { name: 'Phase 2: Polish, Captions & Final Render', description: 'Motion titles, sound effects, and final export.' },
];

const GIGS_25 = [
  // ============================================================================
  // ARCHETYPE A: RISING CREATORS (6 Services — 0 reviews, 100% complete, <= 6d old)
  // ============================================================================
  {
    archetype: 'A_RISING_CREATOR',
    preferOwnerName: 'Randal Schuppe',
    title: 'Bespoke SaaS Product Launch Trailers & UI Motion',
    description:
      'Turn your software or AI product into a high-converting Apple/Linear-style launch video. I recreate your UI in vector layers inside After Effects for buttery-smooth 60fps cursor animations, 3D glassmorphic cards, and synced kinetic typography.',
    category: 'Corporate',
    slots: 5,
    ageDays: 1,
    skills: ['After Effects', 'Motion Graphics', 'SaaS Promo', 'UI Animation', 'Sound Design'],
    gallery: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Feature Spotlight (30s)', desc: '30-second UI motion teaser for Product Hunt or X/Twitter.', price: 800, days: 3, revs: 2 },
      { title: 'Standard - Launch Trailer (60s)', desc: '60-second flagship SaaS launch trailer with custom sound design.', price: 1800, days: 6, revs: 3 },
      { title: 'Premium - Launch Suite (90s)', desc: '90-second launch film + 3 social cutdowns + After Effects source files.', price: 3200, days: 10, revs: 5 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'A_RISING_CREATOR',
    title: '4K YouTube Documentary & Essay Editing with 3D Maps',
    description:
      'I craft high-retention investigative documentaries and deep-dive video essays inspired by Johnny Harris, Vox, and Lemmino. Every timeline includes custom GeoLayers 3D map animations, newspaper highlight callouts, archival B-roll pacing, and broadcast-level sound design.',
    category: 'YouTube',
    slots: 6,
    ageDays: 1,
    skills: ['Documentary', 'After Effects', 'GeoLayers', 'Premiere Pro', 'Sound Design'],
    gallery: [
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Chapter Hook (3 Min)', desc: 'High-retention 3-minute documentary hook with 2 custom motion graphics.', price: 650, days: 3, revs: 2 },
      { title: 'Standard - Full Essay (12 Min)', desc: 'Complete 12-min documentary edit with 3D maps, B-roll, and sound design.', price: 1650, days: 6, revs: 3 },
      { title: 'Premium - Feature Doc (20+ Min)', desc: '20+ min investigative film + project files + 3 vertical teaser shorts.', price: 3100, days: 10, revs: 5 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'A_RISING_CREATOR',
    title: '3D Blender Product Commercials & CGI Liquid Simulations',
    description:
      'Elevate your cosmetic, beverage, or tech hardware brand with photorealistic 3D product animation. I build custom Cycles/Octane shader materials, fluid splash simulations, studio rim lighting, and macro camera sweeps.',
    category: 'Commercials',
    slots: 4,
    ageDays: 2,
    skills: ['Blender 3D', 'CGI', 'Octane Render', 'Product Animation', 'After Effects'],
    gallery: [
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 15s Hero Loop', desc: '15-second 3D product turntable and studio lighting reveal.', price: 1100, days: 4, revs: 2 },
      { title: 'Standard - 30s Commercial Spot', desc: '30-second CGI commercial with particle/fluid FX and sound design.', price: 2400, days: 7, revs: 3 },
      { title: 'Premium - 60s Campaign + Stills', desc: '60-second 4K commercial + 5 print-ready 8K product renders.', price: 4200, days: 12, revs: 4 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'A_RISING_CREATOR',
    preferOwnerName: 'Randal Schuppe',
    title: 'Unreal Engine 5 Virtual Production & Sci-Fi VFX Compositing',
    description:
      'Bring Hollywood virtual production to your indie film or music video. I key green-screen plates using Nuke/Fusion and composite them into custom Unreal Engine 5 Lumen environments with realistic camera tracking and atmospheric fog.',
    category: 'Music Videos',
    slots: 4,
    ageDays: 2,
    skills: ['Unreal Engine 5', 'Green Screen', 'VFX Compositing', '3D Tracking', 'DaVinci Fusion'],
    gallery: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 3 VFX Shots', desc: 'Chroma key + UE5 background replacement for up to 3 shots.', price: 900, days: 4, revs: 2 },
      { title: 'Standard - 10 VFX Sequence', desc: 'Up to 10 tracked VFX shots with lighting match and color grade.', price: 2200, days: 8, revs: 3 },
      { title: 'Premium - Full Music Video VFX', desc: 'Complete virtual environment supervision + 20+ composited shots.', price: 4500, days: 14, revs: 5 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'A_RISING_CREATOR',
    title: 'High-Retention True Crime & Mystery Storytelling Edits',
    description:
      'Suspenseful pacing, eerie soundscapes, 3D evidence board animations, and police interrogation transcript callouts. Designed specifically for faceless and host-led True Crime YouTube channels aiming for 65%+ average view duration.',
    category: 'YouTube',
    slots: 5,
    ageDays: 3,
    skills: ['True Crime', 'Premiere Pro', 'After Effects', 'Sound Design', 'Storytelling'],
    gallery: [
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 8 Min Case File', desc: '8-minute suspense edit with archival photos and tension audio.', price: 550, days: 3, revs: 2 },
      { title: 'Standard - 18 Min Investigation', desc: '18-minute deep dive with custom evidence board motion graphics.', price: 1250, days: 6, revs: 3 },
      { title: 'Premium - 30+ Min Documentary', desc: 'Full-length feature investigation + thumbnail design + 2 shorts.', price: 2300, days: 10, revs: 4 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'A_RISING_CREATOR',
    title: 'Custom Streamer Intro Pack, Stinger Transitions & Twitch Alerts',
    description:
      'Give your Twitch, Kick, or YouTube Live channel a cohesive esports broadcast identity. Includes an animated starting-soon screen, WebM alpha stinger transitions, reactive webcam frames, and hype train sound alerts.',
    category: 'Gaming',
    slots: 6,
    ageDays: 4,
    skills: ['Twitch Overlay', 'Motion Graphics', 'After Effects', 'Gaming', 'Sound FX'],
    gallery: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Stinger + Webcam Frame', desc: 'Custom alpha WebM stinger transition + animated facecam border.', price: 420, days: 3, revs: 2 },
      { title: 'Standard - 4 Scene Broadcast Pack', desc: 'Starting Soon, BRB, Just Chatting, and Ending screens + stinger.', price: 980, days: 5, revs: 3 },
      { title: 'Premium - Full Esports Rebrand', desc: 'All scenes + 6 animated alerts + logo animation + OBS setup file.', price: 1850, days: 8, revs: 5 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },

  // ============================================================================
  // ARCHETYPE B: PROVEN VETERANS — AVAILABLE (9 Services — 4.7★ to 5.0★, Open Queue)
  // ============================================================================
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'Cinematic 4K Wedding Highlight Film & S-Log3 Grade',
    description:
      'With over 60 luxury weddings edited, I weave multi-camera ceremony vows, speeches, and candid moments into an emotional narrative film. Includes bespoke DaVinci Resolve film emulation grading, 32-bit audio mastering, and licensed music pacing.',
    category: 'Events',
    slots: 6,
    ageDays: 22,
    skills: ['Wedding Video', 'DaVinci Resolve', 'Color Grading', 'Multi-Cam', 'Audio Mastering'],
    gallery: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 60s Teaser Trailer', desc: 'Vertical + horizontal 60-second cinematic wedding trailer.', price: 950, days: 4, revs: 2 },
      { title: 'Standard - 8 Min Highlight', desc: 'Signature narrative wedding film with S-Log3 color grading.', price: 2600, days: 8, revs: 3 },
      { title: 'Premium - Full Documentary', desc: '8-min highlight + 30-min ceremony/speeches edit + raw project.', price: 4800, days: 14, revs: 5 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Incredible storytelling and the S-Log3 skin tones looked like cinema film!' },
      { stars: 5, feedback: 'Delivered ahead of schedule and synced all 4 ceremony angles flawlessly.' },
      { stars: 5, feedback: 'Our couple cried watching the first draft. Worth every credit.' },
      { stars: 5, feedback: 'Best wedding colorist and editor we have partnered with on Ensemble.' },
    ],
    pendingOrdersToSeed: 1,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'Multi-Cam Video Podcast Production & Viral Clips Engine',
    description:
      'Turn your raw 3-camera podcast recording into a studio-grade show like Diary of a CEO or Huberman Lab. I handle dynamic speaker switching, Izotope RX vocal de-noising, lower-third topic chapters, and viral vertical shorts.',
    category: 'Podcasts',
    slots: 5,
    ageDays: 18,
    skills: ['Podcast Editing', 'Multi-Cam', 'Izotope RX', 'Premiere Pro', 'Short-Form'],
    gallery: [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1589903308904-1010c2294adc?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 45 Min Audio+Video Sync', desc: 'Multi-cam cut, audio mastering, and intro/outro branding.', price: 600, days: 3, revs: 2 },
      { title: 'Standard - 60 Min + 3 Viral Shorts', desc: 'Full episode edit + 3 captioned vertical hooks + YouTube chapters.', price: 1350, days: 5, revs: 3 },
      { title: 'Premium - 90 Min + 8 Clips + Thumbnails', desc: 'Complete show production + 8 viral reels + 2 A/B test thumbnails.', price: 2450, days: 7, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Saved our team 15 hours a week. The speaker switching feels like a live TV broadcast.' },
      { stars: 5, feedback: 'Audio cleanup removed our room echo completely.' },
      { stars: 5, feedback: 'The 60s teaser hooks doubled our episode click-through rate!' },
    ],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'High-Energy Gaming Montage & Esports Fragmovie Editing',
    description:
      'Frame-accurate velocity ramping, 3D cinematics, saber/glow weapon masks, and bass-synced impact shakes for Valorant, CS2, Apex Legends, and Call of Duty creators.',
    category: 'Gaming',
    slots: 5,
    ageDays: 25,
    skills: ['Gaming Montage', 'Velocity Edit', 'After Effects', 'VFX', 'Sound Sync'],
    gallery: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 60s Highlight Reel', desc: 'Up to 15 clips synced to your track with velocity & color grade.', price: 450, days: 3, revs: 2 },
      { title: 'Standard - 2.5 Min Pro Fragmovie', desc: 'Heavy VFX, 3D camera transitions, RSMB motion blur, and SFX.', price: 1050, days: 5, revs: 3 },
      { title: 'Premium - Esports Team Roster Reveal', desc: 'Full 3D player intro cinematics + fragmovie + social cutdowns.', price: 2200, days: 9, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Insane beat sync and weapon glow transitions!' },
      { stars: 5, feedback: 'Hit 120k views on our org roster announcement.' },
      { stars: 4, feedback: 'Super clean flow, delivered right on time.' },
    ],
    pendingOrdersToSeed: 1,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'Luxury Real Estate Drone & Architectural Walkthrough Films',
    description:
      'Showcase multimillion-dollar listings and hospitality resorts with speed-ramped FPV/Mavic drone transitions, 3D parcel boundary callouts, sky replacements, and daylight-to-twilight color grading.',
    category: 'Real Estate',
    slots: 6,
    ageDays: 19,
    skills: ['Real Estate', 'Drone Editing', 'Speed Ramping', '3D Callouts', 'Color Grading'],
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 60s Property Reel', desc: 'Vertical + horizontal 60s listing tour with speed ramps and titles.', price: 550, days: 2, revs: 2 },
      { title: 'Standard - 2.5 Min Luxury Tour', desc: 'Full interior/drone walkthrough + 3D lot lines + agent intro.', price: 1300, days: 4, revs: 3 },
      { title: 'Premium - Resort & Development Film', desc: '4K architectural showcase + 3D neighborhood map pins + 3 reels.', price: 2600, days: 7, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'The 3D property boundary tracking made our Malibu listing stand out immediately.' },
      { stars: 5, feedback: 'Turned around in 48 hours with flawless warp stabilization.' },
    ],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'Direct-Response E-Commerce UGC & Meta/TikTok Ad Creatives',
    description:
      'Engineered for ROAS and thumb-stop ratios. I combine creator UGC clips, product b-roll, dynamic benefit callouts, and 3 distinct 3-second visual hooks so your media buyers can A/B test profitably.',
    category: 'Commercials',
    slots: 8,
    ageDays: 28,
    skills: ['UGC Ads', 'TikTok Ads', 'Direct Response', 'Copywriting', 'Motion Graphics'],
    gallery: [
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 1 Ad + 3 Hook Variations', desc: 'One 30s vertical ad with 3 interchangeable 3-second opening hooks.', price: 680, days: 3, revs: 2 },
      { title: 'Standard - 3 Distinct Ad Angles', desc: '3 complete 35s UGC/B-roll ads (9 total hook variants) in 9:16 & 4:5.', price: 1650, days: 5, revs: 3 },
      { title: 'Premium - Full Funnel Scaling Pack', desc: '5 ads + script doctor + custom motion graphics + raw project files.', price: 2900, days: 8, revs: 5 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Hook #2 dropped our CPA by 38% on Meta within 4 days!' },
      { stars: 5, feedback: 'Understands direct-response psychology better than agencies charging 5x more.' },
      { stars: 5, feedback: 'Fast, organized, and great typography.' },
    ],
    pendingOrdersToSeed: 1,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'DaVinci Resolve Studio Color Grading & Film Print Emulation',
    description:
      'Dedicated senior colorist service for narrative short films, commercials, and music videos. Working in ACES / DaVinci Wide Gamut with custom Kodak 2383 / Fujifilm 3513 print curves, halation, and fine grain.',
    category: 'Short Films',
    slots: 4,
    ageDays: 31,
    skills: ['DaVinci Resolve', 'Color Grading', 'ACES', 'Film Emulation', 'Short Films'],
    gallery: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Commercial / Music Video (<4m)', desc: 'Shot matching, hero look creation, and power windows up to 4 mins.', price: 850, days: 3, revs: 2 },
      { title: 'Standard - Narrative Short (<15m)', desc: 'Full scene-by-scene ACES color pipeline + Kodak 2383 emulation.', price: 1950, days: 6, revs: 3 },
      { title: 'Premium - Indie Feature / Doc (<45m)', desc: 'Complete festival master grade + DCP/ProRes 4444 deliverables.', price: 3900, days: 12, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Matched our ARRI Alexa and Sony FX3 B-cam shots so seamlessly you cannot tell them apart.' },
      { stars: 5, feedback: 'Our short was accepted into 3 festivals—everyone complimented the color palette.' },
    ],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'Music Video Beat-Synced Cutting, Speed Ramps & Psychedelic VFX',
    description:
      'From hip-hop and R&B performance visuals to indie rock narratives. I deliver razor-sharp beat cuts, rotoscoped clone transitions, CRT analog overlays, and film-burn textures.',
    category: 'Music Videos',
    slots: 5,
    ageDays: 27,
    skills: ['Music Videos', 'Rotoscoping', 'After Effects', 'Speed Ramping', 'CRT Analog'],
    gallery: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Performance Cut (Up to 3m)', desc: 'Multi-take lip-sync, beat pacing, and clean color grade.', price: 700, days: 4, revs: 2 },
      { title: 'Standard - Heavy VFX & Roto Edit', desc: 'Full music video with rotoscoped masks, liquid distortion, and CRT FX.', price: 1600, days: 7, revs: 3 },
      { title: 'Premium - Label Release Package', desc: '4K Master + Spotify Canvas loop + 3 TikTok promo teasers.', price: 2750, days: 10, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'The rotoscope transitions on the chorus drop were unreal!' },
      { stars: 5, feedback: 'Spotify Canvas loop included in the package looks super clean.' },
      { stars: 4, feedback: 'Great energy and fast revisions.' },
    ],
    pendingOrdersToSeed: 1,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    title: 'Online Course, Masterclass & EdTech Curriculum Video Production',
    description:
      'Transform dry lectures and screen recordings into engaging MasterClass-style lessons. I add animated slide callouts, code/UI zoom-ins, chapter progress bars, and crisp vocal compression.',
    category: 'Educational',
    slots: 6,
    ageDays: 24,
    skills: ['EdTech', 'Course Editing', 'Screen Cam', 'Motion Graphics', 'Audio Cleanup'],
    gallery: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Single Lesson (15 Min)', desc: 'Talking head + slides sync, dead-air removal, and key bullet callouts.', price: 480, days: 3, revs: 2 },
      { title: 'Standard - 5 Module Batch (60 Min)', desc: '5 lessons with custom animated diagrams, lower thirds, and SRT captions.', price: 1750, days: 7, revs: 3 },
      { title: 'Premium - Complete Cohort Course', desc: 'Up to 120 mins of curriculum + course trailer + reusable brand templates.', price: 3400, days: 14, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Our student completion rate jumped from 54% to 82% after upgrading our video modules.' },
      { stars: 5, feedback: 'Crystal clear diagrams and zero mistakes on technical terminology.' },
    ],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'B_VETERAN_AVAILABLE',
    preferOwnerName: 'Randal Schuppe',
    title: 'Corporate Keynote Sizzle Reels & Investor Pitch Films',
    description:
      'Executive-level storytelling for Series A/B fundraising decks, annual town halls, and conference recap sizzle reels. Includes telemetry infographics, executive interview polish, and licensed orchestral stems.',
    category: 'Corporate',
    slots: 5,
    ageDays: 29,
    skills: ['Corporate Video', 'Infographics', 'Sizzle Reel', 'Premiere Pro', 'After Effects'],
    gallery: [
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 60s Event Recap Sizzle', desc: 'High-energy conference or keynote highlight reel.', price: 750, days: 3, revs: 2 },
      { title: 'Standard - 3 Min Investor Pitch Film', desc: 'Founder interviews + animated financial/traction charts + B-roll.', price: 1850, days: 6, revs: 3 },
      { title: 'Premium - Enterprise Brand Anthem', desc: '5-minute flagship corporate film + 4 regional social cutdowns.', price: 3600, days: 10, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Opened our Series B partner meeting with this film and closed the round!' },
      { stars: 5, feedback: 'Polished executive interviews and very clean data visualizations.' },
      { stars: 5, feedback: 'Professional communication from start to finish.' },
    ],
    pendingOrdersToSeed: 1,
  },

  // ============================================================================
  // ARCHETYPE C: PROVEN VETERANS — BUSY QUEUE (5 Services — High ratings, Full/Near-Full Slots)
  // ============================================================================
  {
    archetype: 'C_VETERAN_BUSY_QUEUE',
    title: 'Viral TikTok, IG Reels & YouTube Shorts Retention Pack',
    description:
      'High-velocity short-form editing built around 3-second hook retention, kinetic word-by-word captions, custom sound effects, and B-roll cutaways. Trusted by top creators and podcasters.',
    category: 'Social',
    slots: 3,
    ageDays: 40,
    skills: ['Short-Form', 'TikTok', 'Reels', 'Kinetic Typography', 'Premiere Pro'],
    gallery: [
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: TWO_MILESTONES,
    tiers: [
      { title: 'Basic - 2 Viral Shorts', desc: '2 vertical 60-second edits with animated captions.', price: 400, days: 2, revs: 1 },
      { title: 'Standard - 5 Shorts Batch', desc: '5 vertical shorts with B-roll, memes, and sound design.', price: 950, days: 5, revs: 2 },
      { title: 'Premium - 12 Monthly Shorts', desc: '12 vertical shorts + custom brand caption templates.', price: 2100, days: 12, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Retention jumped from 42% to 78% on our first 3 reels!' },
      { stars: 5, feedback: 'Super punchy captions and sound effects.' },
      { stars: 5, feedback: 'Always nails the pacing.' },
    ],
    pendingOrdersToSeed: 3, // 3/3 slots full
  },
  {
    archetype: 'C_VETERAN_BUSY_QUEUE',
    title: 'MrBeast-Style Fast-Paced Challenge & Vlog Editing',
    description:
      'Hyper-optimized first-30-second intros, 3D scoreboards, comedic zooms, riser/sub-drop SFX every 4 seconds, and zero dead air. Built for creators pushing for 1M+ views per upload.',
    category: 'YouTube',
    slots: 2,
    ageDays: 35,
    skills: ['YouTube Retention', 'Challenge Video', 'After Effects', 'Premiere Pro', 'SFX'],
    gallery: [
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 60s Intro Hook Doctor', desc: 'Re-cutting your first 90 seconds for 80%+ retention.', price: 650, days: 2, revs: 2 },
      { title: 'Standard - 10 Min Multi-Cam Vlog', desc: 'Syncing 4+ cameras/lav mics with custom scoreboard graphics.', price: 1950, days: 6, revs: 3 },
      { title: 'Premium - 20 Min Main Channel Epic', desc: 'Full production edit + custom 3D VFX tracking + audio mix.', price: 3800, days: 11, revs: 5 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Best retention graph our channel has had all year (71% at 1:00)!' },
      { stars: 5, feedback: 'Handled 6 hours of raw multi-cam footage like a machine.' },
      { stars: 5, feedback: 'Worth the wait in his queue!' },
      { stars: 5, feedback: 'Top 1% YouTube editor.' },
    ],
    pendingOrdersToSeed: 2, // 2/2 slots full
  },
  {
    archetype: 'C_VETERAN_BUSY_QUEUE',
    title: '2D Cel-Animated Explainer Videos & Lottie Web Animations',
    description:
      'Bespoke frame-by-frame character animation and vector motion graphics for fintech, healthcare, and Web3 brands. Delivered as 4K video plus lightweight JSON Lottie files for your web engineers.',
    category: 'Animation',
    slots: 3,
    ageDays: 38,
    skills: ['2D Animation', 'Explainer Video', 'Lottie JSON', 'After Effects', 'Illustrator'],
    gallery: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - 30s Vector Explainer', desc: 'Custom storyboard + 30s smooth vector animation.', price: 1150, days: 5, revs: 2 },
      { title: 'Standard - 60s Story + Voiceover Sync', desc: 'Full 60s character/UI explainer with sound design.', price: 2300, days: 9, revs: 3 },
      { title: 'Premium - 90s Explainer + Lottie Pack', desc: '90s film + 6 interactive Lottie web animations.', price: 4100, days: 14, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'The Lottie animations loaded in 40kb on our landing page and look gorgeous.' },
      { stars: 5, feedback: 'Incredible illustration style and smooth easing.' },
    ],
    pendingOrdersToSeed: 3, // 3/3 slots full
  },
  {
    archetype: 'C_VETERAN_BUSY_QUEUE',
    title: 'Dolby Atmos & 5.1 Surround Sound Design + Foley Mixing',
    description:
      'Theatrical post-production sound design in Pro Tools Ultimate. I record custom foley footsteps/cloth, layer cinematic sub-impacts, clean dialogue with Cedar/RX, and deliver Netflix/EBU R128 compliant stems.',
    category: 'Short Films',
    slots: 3,
    ageDays: 44,
    skills: ['Sound Design', 'Pro Tools', 'Foley', 'Audio Mastering', 'Dolby Atmos'],
    gallery: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Commercial / Trailer (<2m)', desc: 'Bespoke SFX design, risers, and stereo master.', price: 600, days: 3, revs: 2 },
      { title: 'Standard - Short Film (<15m)', desc: 'Dialogue editorial, ADR sync, foley, and 5.1 surround mix.', price: 1650, days: 7, revs: 3 },
      { title: 'Premium - Festival Theatrical Package', desc: 'Full 5.1 + Stereo M&E stems for international distribution.', price: 3200, days: 12, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'Brought our horror short to life—the spatial sound design terrified the theater!' },
      { stars: 5, feedback: 'Passed festival QC on the first submission.' },
      { stars: 5, feedback: 'World-class audio engineer.' },
    ],
    pendingOrdersToSeed: 2, // 2/3 slots full
  },
  {
    archetype: 'C_VETERAN_BUSY_QUEUE',
    title: 'Anime AMV, VTuber Debut Lore Trailers & Live2D MV Compositing',
    description:
      'Specialized After Effects compositing for VTubers, rhythm games, and anime music videos. Includes 3D parallax illustration rigging, Japanese/English kinetic lyrics, particle shaders, and camera depth-of-field.',
    category: 'Animation',
    slots: 2,
    ageDays: 33,
    skills: ['After Effects', 'VTuber MV', 'Kinetic Typography', '2.5D Parallax', 'Anime Edit'],
    gallery: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: FULL_MILESTONES,
    tiers: [
      { title: 'Basic - Chorus Teaser (60s)', desc: '60-second lyric MV with 2.5D character camera movement.', price: 720, days: 4, revs: 2 },
      { title: 'Standard - Full Song Original MV', desc: 'Full 4-minute VTuber/vocaloid MV with custom 3D stage & lyrics.', price: 1750, days: 8, revs: 3 },
      { title: 'Premium - Lore Trailer + Puppet Rig', desc: 'Full lore animation + separated PSD puppet pins + shorts.', price: 3300, days: 14, revs: 4 },
    ],
    reviewsToSeed: [
      { stars: 5, feedback: 'My debut MV hit 250k views in the first week! The typography was magical.' },
      { stars: 5, feedback: 'Turned a single static illustration into a living 3D world.' },
    ],
    pendingOrdersToSeed: 2, // 2/2 slots full
  },

  // ============================================================================
  // ARCHETYPE D: INCOMPLETE / LOWER-EFFORT LISTINGS (5 Services — 1-2 tiers, fewer assets)
  // ============================================================================
  {
    archetype: 'D_LOW_EFFORT',
    title: 'Travel & Lifestyle Vlog Pacing with GoPro/Drone Sync',
    description:
      'Clean travel vlog editing with music sync, basic color correction, and smooth transitions for family trips or solo travel creators.',
    category: 'Vlogs',
    slots: 4,
    ageDays: 12,
    skills: ['Travel Vlog', 'Premiere Pro'],
    gallery: [
      'https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: TWO_MILESTONES,
    tiers: [
      { title: 'Basic - 5 Min Travel Cut', desc: '5-minute travel recap with music.', price: 380, days: 3, revs: 1 },
      { title: 'Standard - 12 Min Vlog', desc: '12-minute vlog with basic titles and color.', price: 750, days: 5, revs: 2 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'D_LOW_EFFORT',
    title: 'Quick Animated Subtitles & Hormozi Captions for Reels',
    description:
      'I will add clean pop-up subtitles and emojis to your vertical 60-second talking head clip.',
    category: 'Social',
    slots: 5,
    ageDays: 15,
    skills: ['Subtitles', 'CapCut'],
    gallery: [
      'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: [],
    tiers: [
      { title: 'Basic - 1 Captioned Reel', desc: 'Up to 60 seconds of animated captions.', price: 200, days: 1, revs: 1 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'D_LOW_EFFORT',
    title: 'Simple Logo Intro Reveal & Outro End Screen',
    description:
      'Send me your PNG/SVG logo and I will create a clean 5-second intro animation and YouTube end-card overlay.',
    category: 'Corporate',
    slots: 4,
    ageDays: 19,
    skills: ['Logo Animation'],
    gallery: [
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: [],
    tiers: [
      { title: 'Basic - 1080p Logo Intro', desc: '5-second logo animation in MP4.', price: 280, days: 2, revs: 1 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'D_LOW_EFFORT',
    preferOwnerName: 'Randal Schuppe',
    title: 'Fitness & Gym Workout Reel Cuts with Beat Drops',
    description:
      'Fast gym clip cuts synced to phonk or hip-hop beats with speed ramps and contrast grading for fitness coaches.',
    category: 'Social',
    slots: 4,
    ageDays: 6,
    skills: ['Fitness Reels', 'Speed Ramping'],
    gallery: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: [
      { name: 'Phase 1: Beat Sync & Export', description: 'Syncing workout clips to music and exporting 9:16.' },
    ],
    tiers: [
      { title: 'Basic - 1 Gym Reel', desc: '30-second fitness edit.', price: 320, days: 2, revs: 1 },
      { title: 'Standard - 3 Gym Reels', desc: '3 vertical fitness reels.', price: 800, days: 4, revs: 2 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
  {
    archetype: 'D_LOW_EFFORT',
    title: 'Basic Video Cutting, Merging & Zoom Recording Cleanup',
    description:
      'I will trim dead air, remove mistakes, and combine your raw MP4 or Zoom recordings into a single clean video.',
    category: 'YouTube',
    slots: 3,
    ageDays: 21,
    skills: ['Video Editing'],
    gallery: [
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
    ],
    milestones: [],
    tiers: [
      { title: 'Basic - Simple Cut (Up to 10m)', desc: 'Basic video trimming and export.', price: 250, days: 2, revs: 1 },
    ],
    reviewsToSeed: [],
    pendingOrdersToSeed: 0,
  },
];

async function replaceAndSeed25Gigs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch active User accounts
    const usersRes = await client.query(`
      SELECT account_id, display_name
      FROM accounts
      WHERE type = 'User' AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 15
    `);
    const users = usersRes.rows;
    if (users.length < 2) {
      throw new Error('Need at least 2 user accounts in the database to seed 25 services.');
    }

    const randalUser = users.find((u) =>
      String(u.display_name || '').toLowerCase().includes('randal')
    ) || users[1];

    const otherSellers = users.filter((u) => u.account_id !== users[0].account_id);
    const buyerAccount = users[0];

    // 2. Cleanly remove all existing gigs and their dependent records
    console.log('Cleaning existing services and dependent records...');
    await client.query(`
      DELETE FROM ratings
      WHERE contract_id IN (SELECT contract_id FROM gig_contracts)
    `);
    const oldContractsRes = await client.query(`SELECT contract_id FROM gig_contracts`);
    const oldContractIds = oldContractsRes.rows.map((r) => r.contract_id);
    await client.query(`DELETE FROM gig_contracts`);
    if (oldContractIds.length > 0) {
      await client.query(`DELETE FROM contracts WHERE contract_id = ANY($1::uuid[])`, [oldContractIds]);
    }
    await client.query(`DELETE FROM gig_responses`);
    await client.query(`DELETE FROM gig_requests`);
    await client.query(`DELETE FROM gig_requirement_choices`);
    await client.query(`DELETE FROM gig_requirements`);
    await client.query(`DELETE FROM gig_saves`);
    await client.query(`DELETE FROM gig_tags`);
    await client.query(`DELETE FROM gig_attachments`);
    await client.query(`DELETE FROM gig_milestones`);
    await client.query(`DELETE FROM gig_tiers`);
    await client.query(`DELETE FROM gigs`);

    console.log(`Seeding ${GIGS_25.length} fresh services...`);

    for (let i = 0; i < GIGS_25.length; i++) {
      const item = GIGS_25[i];
      const sellerAccount =
        item.preferOwnerName && randalUser
          ? randalUser
          : otherSellers[i % otherSellers.length];

      // Ensure seller has a gig TOS when high-effort
      if (item.archetype !== 'D_LOW_EFFORT') {
        const tosCheck = await client.query(
          `SELECT terms_id FROM terms_of_service WHERE account_id = $1 AND terms_type = 'gigs' LIMIT 1`,
          [sellerAccount.account_id]
        );
        if (tosCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO terms_of_service (terms_title, terms_description, terms_type, is_default, account_id)
             VALUES ($1, $2, 'gigs', false, $3)`,
            ['Standard Video Production Terms', DEFAULT_TOS, sellerAccount.account_id]
          );
        }
      }

      // Insert Gig
      const gigRes = await client.query(
        `INSERT INTO gigs (
           title, description, category, payment_type, no_of_concurrent_max, status, freelancer_account_id, created_at
         ) VALUES ($1, $2, $3, 'fixed', $4, 'Open', $5, NOW() - ($6 || ' days')::interval)
         RETURNING gig_id`,
        [
          item.title,
          item.description,
          item.category,
          item.slots,
          sellerAccount.account_id,
          String(item.ageDays),
        ]
      );
      const gigId = gigRes.rows[0].gig_id;

      // Insert Tiers
      let firstTierId = null;
      for (const tier of item.tiers) {
        const tRes = await client.query(
          `INSERT INTO gig_tiers (title, description, rate_credits, delivery_days, no_of_revisions_max, gig_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING gig_tier_id`,
          [tier.title, tier.desc, tier.price, tier.days, tier.revs, gigId]
        );
        if (!firstTierId) firstTierId = tRes.rows[0].gig_tier_id;
      }

      // Insert Milestones
      for (let mIdx = 0; mIdx < item.milestones.length; mIdx++) {
        const m = item.milestones[mIdx];
        await client.query(
          `INSERT INTO gig_milestones (index, name, description, gig_id)
           VALUES ($1, $2, $3, $4)`,
          [mIdx + 1, m.name, m.description, gigId]
        );
      }

      // Insert Gallery Images (index 0 = thumbnail, index 1..N = supporting images)
      for (let gIdx = 0; gIdx < item.gallery.length; gIdx++) {
        const fRes = await client.query(
          `INSERT INTO files (name, path, mime_type, size_bytes)
           VALUES ($1, $2, 'image/jpeg', 0)
           RETURNING file_id`,
          [`gig_${i + 1}_img_${gIdx}.jpg`, item.gallery[gIdx]]
        );
        await client.query(
          `INSERT INTO gig_attachments (gig_id, file_id, index)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [gigId, fRes.rows[0].file_id, gIdx]
        );
      }

      // Insert Skills / Tags
      for (const skill of item.skills) {
        let tagId;
        const tCheck = await client.query(
          `SELECT tag_id FROM tags WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [skill]
        );
        if (tCheck.rows.length > 0) {
          tagId = tCheck.rows[0].tag_id;
        } else {
          const newTag = await client.query(
            `INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`,
            [skill]
          );
          tagId = newTag.rows[0].tag_id;
        }
        await client.query(
          `INSERT INTO gig_tags (gig_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [gigId, tagId]
        );
      }

      // Insert Completed Contracts + Ratings
      const reviewerBuyer =
        sellerAccount.account_id === buyerAccount.account_id ? users[users.length - 1] : buyerAccount;

      for (const rev of item.reviewsToSeed) {
        const reqRes = await client.query(
          `INSERT INTO gig_requests (status, gig_tier_id, client_account_id, project_brief)
           VALUES ('Completed', $1, $2, 'Completed production order.')
           RETURNING gig_request_id`,
          [firstTierId, reviewerBuyer.account_id]
        );
        const cntRes = await client.query(
          `INSERT INTO contracts (contract_type, payment_type, starts_at, rate_credits, weekly_hrs_max, total_hrs, revision_price_credits, status, is_private)
           VALUES ('gig', 'fixed', NOW() - interval '15 days', 1500, 20, 40, 100, 'completed', false)
           RETURNING contract_id`
        );
        await client.query(
          `INSERT INTO gig_contracts (contract_id, gig_request_id) VALUES ($1, $2)`,
          [cntRes.rows[0].contract_id, reqRes.rows[0].gig_request_id]
        );
        await client.query(
          `INSERT INTO ratings (stars_out_of_five, feedback, contract_id, account_id)
           VALUES ($1, $2, $3, $4)`,
          [rev.stars, rev.feedback, cntRes.rows[0].contract_id, sellerAccount.account_id]
        );
      }

      // Insert Pending Orders to simulate Queue Load
      for (let p = 0; p < item.pendingOrdersToSeed; p++) {
        await client.query(
          `INSERT INTO gig_requests (status, gig_tier_id, client_account_id, project_brief)
           VALUES ('Pending', $1, $2, 'Active client order in queue.')`,
          [firstTierId, reviewerBuyer.account_id]
        );
      }

      console.log(`  [${String(i + 1).padStart(2, '0')}/25] (${item.archetype}) ${item.title} — Owner: ${sellerAccount.display_name}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Successfully replaced existing gigs with 25 fresh services!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed 25 gigs:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

replaceAndSeed25Gigs();
