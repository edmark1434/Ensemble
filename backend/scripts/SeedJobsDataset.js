/**
 * Replaces existing seeded jobs (and any non-contracted demo jobs) in the database with
 * 25 realistic video-editing & post-production job posts across all 3 Job Types and all 4
 * Discovery Ranking Archetypes:
 *   - Job Type 1: Individual — Open Bid (rate_credits_min > 0, rate_credits_max = null)
 *   - Job Type 2: Individual — Ranged / Multi-Seat Budget (rate_credits_min > 0, rate_credits_max > 0)
 *   - Job Type 3: Team Job — Milestone Pool (hiring_type = 'team' with structured job_milestones)
 *
 * Archetypes included:
 *   - Archetype A: Rising Job Posts (6 jobs — 0 prior client reviews, 100% type-aware completeness, <= 5d old, < 3 proposals/seat)
 *   - Archetype B: Trusted Repeat Clients (Open Seats) (9 jobs — 4.8★ to 5.0★ client ratings, low congestion)
 *   - Archetype C: High-Demand / Crowded Jobs (5 jobs — high proposal count per seat so availability steps back)
 *   - Archetype D: Newer / Low-Brief-Completeness Jobs (5 jobs — short description, 1 tag, placeholder thumbnail)
 *
 * Usage: node backend/scripts/SeedJobsDataset.js
 */
require('dotenv').config({ quiet: true, path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../lib/Database');

const JOBS_25 = [
  // ============================================================================
  // ARCHETYPE A: RISING JOB POSTS (6 Jobs — 2 Open Bid, 2 Ranged, 2 Team Pool)
  // ============================================================================
  {
    archetype: 'A_RISING_JOB',
    jobType: 'individual_open',
    preferOwnerName: 'Randal Schuppe',
    title: '60s SaaS Product Hunt Launch Film & UI Motion Graphics',
    description:
      'We are launching our AI developer workflow platform next month and need a flagship 60-second launch film inspired by Linear and Raycast. You will receive Figma vector screens, brand sound stems, and a voiceover script. Feel free to pitch your own milestone breakdown and rate based on your motion graphics reel.',
    category: 'Corporate',
    difficulty: 'Expert',
    minBudget: 1800,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 5,
    timelineMax: 10,
    ageDays: 1,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['After Effects', 'Motion Graphics', 'UI Animation', 'Sound Design', 'SaaS Promo'],
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [
      'Share a link to your best SaaS or UI motion graphics piece.',
      'What is your typical turnaround time for a 60-second vector UI animation?',
    ],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'A_RISING_JOB',
    jobType: 'individual_ranged',
    preferOwnerName: 'Randal Schuppe',
    title: 'High-Retention YouTube Documentary Editor (20-Min Deep Dive)',
    description:
      'Looking for a narrative documentary editor for a 20-minute investigative tech history episode. We provide a studio-recorded 4K A-roll track, research folder, and script. We need GeoLayers 3D map flyovers, custom newspaper callouts, tense orchestral pacing, and -14 LUFS audio mixing.',
    category: 'YouTube',
    difficulty: 'Intermediate',
    minBudget: 1200,
    maxBudget: 2000,
    positionsNeeded: 1,
    timelineMin: 6,
    timelineMax: 12,
    ageDays: 1,
    portfolioUseAllowed: true,
    portfolioDuration: 90,
    requireNDA: false,
    skills: ['Premiere Pro', 'After Effects', 'GeoLayers', 'Storytelling', 'Sound Design'],
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [
      'Have you used GeoLayers 3 or 3D camera tracking in After Effects before?',
    ],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'A_RISING_JOB',
    jobType: 'individual_ranged',
    preferOwnerName: 'Randal Schuppe',
    title: 'Cyberpunk Short Film Post-Production Squad (Edit, VFX & Dolby Mix)',
    description:
      'Our indie sci-fi short film (14 minutes, shot on RED V-Raptor 8K RAW) has wrapped principal photography. We are assembling a 4-person post-production team across picture assembly, Nuke/Fusion hologram compositing, ACES color grading, and 5.1 surround sound design.',
    category: 'Music Videos',
    difficulty: 'Expert',
    minBudget: 5500,
    maxBudget: 8000,
    positionsNeeded: 1,
    timelineMin: 14,
    timelineMax: 28,
    ageDays: 2,
    portfolioUseAllowed: true,
    portfolioDuration: 120,
    requireNDA: true,
    skills: ['DaVinci Resolve', 'VFX Compositing', 'Unreal Engine 5', 'Color Grading', 'Sound Design'],
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [
      'What hardware and post-production software pipeline do you run?',
    ],
    milestones: [],
    proposalsToSeed: 2,
  },
  {
    archetype: 'A_RISING_JOB',
    jobType: 'individual_open',
    title: '3D Blender Beverage Commercial & Liquid Simulation Specialist',
    description:
      'We are launching a sparkling botanical drink and need a photorealistic 30-second 3D product commercial. We have the CAD bottle geometry and label UV artwork ready. Looking for a 3D generalist experienced in Flip Fluids / Houdini condensation droplets, dramatic rim lighting, and macro camera sweeps.',
    category: 'Commercials',
    difficulty: 'Expert',
    minBudget: 2400,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 7,
    timelineMax: 14,
    ageDays: 2,
    portfolioUseAllowed: true,
    portfolioDuration: 30,
    requireNDA: false,
    skills: ['Blender 3D', 'CGI', 'Octane Render', 'Product Animation', 'After Effects'],
    thumbnail: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [
      'Which render engine (Octane, Redshift, Cycles) do you use for liquid & glass refraction?',
    ],
    milestones: [],
    proposalsToSeed: 0,
  },
  {
    archetype: 'A_RISING_JOB',
    jobType: 'individual_ranged',
    title: 'Daily TikTok / Reels Short-Form Editors (3 Seats Available)',
    description:
      'Fast-growing business & finance podcast seeking 3 dedicated short-form editors to cut 15 vertical clips per week. Each 45-second clip needs Hormozi/Iman-style dynamic captions, b-roll cutaways every 3 seconds, punchy sound risers, and retention hooks.',
    category: 'Music Videos',
    difficulty: 'Intermediate',
    minBudget: 750,
    maxBudget: 1350,
    positionsNeeded: 1,
    timelineMin: 3,
    timelineMax: 7,
    ageDays: 3,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['Premiere Pro', 'Short-Form', 'TikTok Reels', 'Motion Captions', 'Sound Design'],
    thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [
      'How many 60-second vertical edits can you reliably turn around per week?',
    ],
    milestones: [],
    proposalsToSeed: 2,
  },
  {
    archetype: 'A_RISING_JOB',
    jobType: 'individual_ranged',
    title: 'Global Esports Tournament Broadcast & Hype Reel Production Team',
    description:
      'We are hosting a 3-day international Valorant & CS2 arena tournament and need a 3-person remote post-production team to build our opening ceremony hype trailer, player stat lower-thirds package, and daily highlight recaps.',
    category: 'Gaming',
    difficulty: 'Expert',
    minBudget: 3800,
    maxBudget: 5400,
    positionsNeeded: 1,
    timelineMin: 7,
    timelineMax: 14,
    ageDays: 3,
    portfolioUseAllowed: true,
    portfolioDuration: 90,
    requireNDA: false,
    skills: ['After Effects', 'Gaming Montage', '3D Camera', 'Motion Graphics', 'Sound Design'],
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [
      'Share your favorite esports broadcast package or gaming montage link.',
    ],
    milestones: [],
    proposalsToSeed: 1,
  },

  // ============================================================================
  // ARCHETYPE B: TRUSTED REPEAT CLIENTS WITH OPEN SEATS (9 Jobs)
  // ============================================================================
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_ranged',
    title: 'Luxury Destination Wedding Feature Film & Teaser Cut (Sony FX6)',
    description:
      'Boutique wedding cinema studio looking for a senior narrative colorist and editor for a Lake Como wedding shot on 3x Sony FX6 cameras in S-Log3. Deliverables include a 60-second vertical IG teaser and a 9-minute emotional story film woven around the couple’s vows.',
    category: 'Weddings',
    difficulty: 'Expert',
    minBudget: 1400,
    maxBudget: 2200,
    positionsNeeded: 1,
    timelineMin: 7,
    timelineMax: 14,
    ageDays: 4,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['Wedding Films', 'DaVinci Resolve', 'Color Grading', 'Multi-Cam', 'Audio Mastering'],
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Please share 2 full-length wedding films you have edited and graded.'],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_open',
    title: 'Senior DaVinci Resolve Colorist for Indie A24-Style Drama',
    description:
      'We have locked picture on our 22-minute festival drama shot on ARRI Alexa Mini LF (ARRIRAW). Seeking an experienced DaVinci Resolve colorist to build a custom Kodak 2383 show LUT, balance complex mixed-lighting night interiors, and deliver a DCI-P3 theatrical master.',
    category: 'Commercials',
    difficulty: 'Expert',
    minBudget: 2100,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 5,
    timelineMax: 10,
    ageDays: 3,
    portfolioUseAllowed: true,
    portfolioDuration: 90,
    requireNDA: true,
    skills: ['DaVinci Resolve', 'Color Grading', 'ACES', 'Film Emulation', 'RAW Workflow'],
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Do you have a calibrated 10-bit reference monitor setup?'],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_ranged',
    title: 'Series-B Fintech Brand Documentary & Customer Spotlight Series',
    description:
      'We filmed interviews with 6 enterprise customers across New York and London. We need a 3-person production squad (Lead Story Producer/Editor, Motion Infographics Designer, and Pro Tools Dialogue Mixer) to deliver a flagship 5-minute brand documentary plus 6 social cutdowns.',
    category: 'Corporate',
    difficulty: 'Expert',
    minBudget: 4500,
    maxBudget: 6500,
    positionsNeeded: 1,
    timelineMin: 10,
    timelineMax: 18,
    ageDays: 4,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: true,
    skills: ['Corporate Video', 'Premiere Pro', 'After Effects', 'Audio Restoration', 'Color Grading'],
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Share a corporate documentary or B2B case study you worked on.'],
    milestones: [],
    proposalsToSeed: 2,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_ranged',
    title: 'Multi-Cam Video Podcast Editor + 10 Weekly YouTube Shorts',
    description:
      'Weekly founder & tech interview podcast (recorded on 3x Blackmagic 6K cameras + Shure SM7B stems). We need a reliable editor to switch camera angles dynamically, add topic chapter graphics, balance audio levels, and extract 10 high-performing vertical Shorts per episode.',
    category: 'YouTube',
    difficulty: 'Intermediate',
    minBudget: 900,
    maxBudget: 1500,
    positionsNeeded: 1,
    timelineMin: 4,
    timelineMax: 7,
    ageDays: 5,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['Podcast Editing', 'Multi-Cam', 'Premiere Pro', 'YouTube Shorts', 'Audio Mixing'],
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Do you use auto-pod or manual multi-cam cutting in Premiere/Resolve?'],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_open',
    title: 'FPV Drone Real Estate & Luxury Villa Tour Reel Editor',
    description:
      'Luxury architectural media agency in Miami seeking an FPV & gimbal real estate editor. You will combine single-take indoor FPV fly-throughs with exterior DJI Inspire 3 sunset shots, adding speed-ramps, whoosh sound design, and floating 3D property specs tracked to the lawn and pool deck.',
    category: 'Commercials',
    difficulty: 'Intermediate',
    minBudget: 1100,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 3,
    timelineMax: 6,
    ageDays: 5,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['Real Estate Video', 'Speed Ramping', '3D Tracking', 'DaVinci Resolve', 'Sound Design'],
    thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Share a luxury real estate or FPV speed-ramp edit from your portfolio.'],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_ranged',
    title: 'Anime AMV & Kinetic Typography Lyric Video Animator',
    description:
      'Independent electronic & hyperpop record label commissioning a full 3-minute animated lyric video. We have original character illustrations separated into PSD layers ready for Live2D/After Effects puppet rigging, 3D camera parallax, and beat-synced kinetic typography.',
    category: 'Music Videos',
    difficulty: 'Expert',
    minBudget: 1300,
    maxBudget: 2100,
    positionsNeeded: 1,
    timelineMin: 7,
    timelineMax: 14,
    ageDays: 6,
    portfolioUseAllowed: true,
    portfolioDuration: 90,
    requireNDA: false,
    skills: ['After Effects', 'Kinetic Typography', '2D Animation', 'Music Videos', 'VFX'],
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Have you rigged layered PSD character art in After Effects or Live2D?'],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_ranged',
    title: 'Direct-to-Consumer Skincare Ad Creative Squad (UGC + 3D CGI)',
    description:
      'Performance marketing agency scaling a new vitamin-C serum on Meta and TikTok. We are hiring a 3-person creative team to produce 6 scroll-stopping ad variations combining creator UGC testimonials with a 3D CGI serum dropper animation.',
    category: 'Commercials',
    difficulty: 'Intermediate',
    minBudget: 3200,
    maxBudget: 4800,
    positionsNeeded: 1,
    timelineMin: 6,
    timelineMax: 12,
    ageDays: 6,
    portfolioUseAllowed: true,
    portfolioDuration: 45,
    requireNDA: false,
    skills: ['UGC Ads', 'Blender 3D', 'After Effects', 'Premiere Pro', 'Direct Response'],
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['What tools do you use for video editing and motion/3D graphics?'],
    milestones: [],
    proposalsToSeed: 2,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_open',
    title: 'Pro Tools Sound Designer & Foley Mixer for Indie Horror Game Trailer',
    description:
      'We have a 2-minute Unreal Engine 5 gameplay trailer for our upcoming psychological horror title on Steam. We need custom creature vocalizations, binaural footsteps, eerie atmospheric drones, and a punchy trailer master.',
    category: 'Gaming',
    difficulty: 'Expert',
    minBudget: 1500,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 5,
    timelineMax: 9,
    ageDays: 7,
    portfolioUseAllowed: true,
    portfolioDuration: 120,
    requireNDA: false,
    skills: ['Sound Design', 'Pro Tools', 'Foley', 'Audio Mastering', 'Game Trailer'],
    thumbnail: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Share a game trailer or short film where you designed all SFX from scratch.'],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'B_TRUSTED_CLIENT',
    jobType: 'individual_ranged',
    title: 'Online Cohort Course Video Editor (24 Lesson Modules)',
    description:
      'EdTech creator launching a 24-lesson masterclass on product design. Raw footage is 4K talking-head + screen recordings. Need clean jump-cut removal, picture-in-picture zoom transitions, chapter slide animations, and clear voice leveling.',
    category: 'Corporate',
    difficulty: 'Intermediate',
    minBudget: 1600,
    maxBudget: 2600,
    positionsNeeded: 1,
    timelineMin: 10,
    timelineMax: 16,
    ageDays: 8,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: true,
    skills: ['Course Editing', 'Camtasia', 'Premiere Pro', 'Motion Graphics', 'Audio Cleanup'],
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['What is your workflow for batch-editing 20+ educational modules consistently?'],
    milestones: [],
    proposalsToSeed: 2,
  },

  // ============================================================================
  // ARCHETYPE C: HIGH-DEMAND / CROWDED JOBS (5 Jobs — High proposals per seat)
  // ============================================================================
  {
    archetype: 'C_CROWDED_JOB',
    jobType: 'individual_ranged',
    title: 'MrBeast / Ryan Trahan Style High-Paced Challenge Video Editor',
    description:
      '2.4M subscriber entertainment channel looking for a lead editor for our upcoming 18-minute challenge video. 6 cameras of raw footage, Lav mics, and GoPro POVs. Needs ultra-snappy first-30-second storytelling, custom score risers, and comedic zoom timing.',
    category: 'YouTube',
    difficulty: 'Expert',
    minBudget: 2500,
    maxBudget: 4000,
    positionsNeeded: 1,
    timelineMin: 5,
    timelineMax: 8,
    ageDays: 5,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: true,
    skills: ['YouTube Retention', 'Premiere Pro', 'After Effects', 'Sound Design', 'Storytelling'],
    thumbnail: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Link the highest-retention YouTube video you have edited (include avg view duration if known).'],
    milestones: [],
    proposalsToSeed: 9,
  },
  {
    archetype: 'C_CROWDED_JOB',
    jobType: 'individual_open',
    title: '30-Second Superbowl-Style Sportswear Spec Commercial Cut',
    description:
      'High-intensity athletic footwear commercial shot on RED Komodo-X at 120fps. Looking for a rhythmic trailer editor who excels at whip-pans, impact sound design, speed-ramping, and gritty film grain textures.',
    category: 'Commercials',
    difficulty: 'Expert',
    minBudget: 2200,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 4,
    timelineMax: 7,
    ageDays: 6,
    portfolioUseAllowed: true,
    portfolioDuration: 30,
    requireNDA: false,
    skills: ['Commercials', 'Premiere Pro', 'Speed Ramping', 'Sound Design', 'Color Grading'],
    thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Share your best 30s sports or automotive spec commercial.'],
    milestones: [],
    proposalsToSeed: 8,
  },
  {
    archetype: 'C_CROWDED_JOB',
    jobType: 'individual_ranged',
    title: 'Hip-Hop Music Video VFX Editor (Rotoscoping & 3D Environments)',
    description:
      'Need heavy psychedelic VFX, liquid morph transitions, object replacements, and CRT glitch passes for a 3-minute rap music video shot in Los Angeles. Fast turnaround required before label release date.',
    category: 'Music Videos',
    difficulty: 'Expert',
    minBudget: 1500,
    maxBudget: 2400,
    positionsNeeded: 1,
    timelineMin: 4,
    timelineMax: 7,
    ageDays: 7,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['Music Videos', 'After Effects', 'Rotoscoping', 'Blender 3D', 'VFX'],
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Send 2 music videos showcasing your rotoscoping and 3D transition work.'],
    milestones: [],
    proposalsToSeed: 8,
  },
  {
    archetype: 'C_CROWDED_JOB',
    jobType: 'individual_open',
    title: 'Gaming Channel Highlight Editor (Valorant Radiant Ranked Series)',
    description:
      'Looking for a long-term gaming editor to turn 4-hour Twitch VODs into funny, fast-paced 12-minute highlight episodes with 3D Blender weapon inspects, motion-tracked subtitles, and meme SFX.',
    category: 'Gaming',
    difficulty: 'Intermediate',
    minBudget: 650,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 3,
    timelineMax: 5,
    ageDays: 8,
    portfolioUseAllowed: true,
    portfolioDuration: 60,
    requireNDA: false,
    skills: ['Gaming Montage', 'Premiere Pro', 'After Effects', 'Twitch VODs', 'Subtitles'],
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['What rank are you in Valorant/CS2 so you know which plays to highlight?'],
    milestones: [],
    proposalsToSeed: 10,
  },
  {
    archetype: 'C_CROWDED_JOB',
    jobType: 'individual_ranged',
    title: 'Music Festival Aftermovie Post-Production Team (2 Seats)',
    description:
      'We captured 4TB of RED & FPV drone footage across a 2-day electronic music festival. Hiring 1 Lead Rhythm Editor and 1 Color/Sound Finishing Artist for the official 4-minute 4K aftermovie.',
    category: 'Music Videos',
    difficulty: 'Expert',
    minBudget: 2800,
    maxBudget: 4200,
    positionsNeeded: 1,
    timelineMin: 7,
    timelineMax: 12,
    ageDays: 9,
    portfolioUseAllowed: true,
    portfolioDuration: 90,
    requireNDA: false,
    skills: ['Event Recap', 'Speed Ramping', 'DaVinci Resolve', 'Sound Design', 'Premiere Pro'],
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: ['Share an event aftermovie or concert recap you edited.'],
    milestones: [],
    proposalsToSeed: 14,
  },

  // ============================================================================
  // ARCHETYPE D: NEWER / PARTIAL-BRIEF JOBS (5 Jobs — Lower completeness score)
  // ============================================================================
  {
    archetype: 'D_PARTIAL_BRIEF',
    jobType: 'individual_open',
    title: 'Quick Trim & Captions for 3 TikTok Videos',
    description:
      'Need someone to cut out silences and add basic captions to 3 short vertical talking-head videos recorded on iPhone.',
    category: 'YouTube',
    difficulty: 'Beginner',
    minBudget: 150,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 1,
    timelineMax: 2,
    ageDays: 3,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: false,
    skills: ['CapCut'],
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [],
    milestones: [],
    proposalsToSeed: 1,
  },
  {
    archetype: 'D_PARTIAL_BRIEF',
    jobType: 'individual_ranged',
    title: 'Basic Family Vacation Vlog Assembly',
    description:
      'Have about 45 minutes of GoPro and phone clips from our trip to Japan. Just want a simple 8-minute highlight video with background music.',
    category: 'YouTube',
    difficulty: 'Beginner',
    minBudget: 180,
    maxBudget: 300,
    positionsNeeded: 1,
    timelineMin: 3,
    timelineMax: 5,
    ageDays: 6,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: false,
    skills: ['Video Editing', 'Vlog'],
    thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [],
    milestones: [],
    proposalsToSeed: 2,
  },
  {
    archetype: 'D_PARTIAL_BRIEF',
    jobType: 'individual_open',
    title: 'Remove Background Hum from Zoom Webinar Recording',
    description:
      'Recorded a 40-minute webinar and the guest mic has a slight buzz. Need a quick audio cleanup and export.',
    category: 'Corporate',
    difficulty: 'Beginner',
    minBudget: 120,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 1,
    timelineMax: 2,
    ageDays: 9,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: false,
    skills: ['Audio Cleanup'],
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [],
    milestones: [],
    proposalsToSeed: 2,
  },
  {
    archetype: 'D_PARTIAL_BRIEF',
    jobType: 'individual_ranged',
    title: 'Simple Logo Intro Template Swap',
    description:
      'I bought an After Effects logo reveal template and need someone to drop in my PNG logo and render it in 1080p.',
    category: 'Corporate',
    difficulty: 'Beginner',
    minBudget: 100,
    maxBudget: 180,
    positionsNeeded: 1,
    timelineMin: 1,
    timelineMax: 2,
    ageDays: 11,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: false,
    skills: ['After Effects'],
    thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [],
    milestones: [],
    proposalsToSeed: 3,
  },
  {
    archetype: 'D_PARTIAL_BRIEF',
    jobType: 'individual_open',
    title: 'Sync Separate Mic Audio to Wedding Ceremony Tripod Video',
    description:
      'Single tripod camera from a 30-minute ceremony plus a Zoom H4n recorder file. Just need them synced and exported.',
    category: 'Weddings',
    difficulty: 'Beginner',
    minBudget: 160,
    maxBudget: null,
    positionsNeeded: 1,
    timelineMin: 2,
    timelineMax: 3,
    ageDays: 13,
    portfolioUseAllowed: false,
    portfolioDuration: null,
    requireNDA: false,
    skills: ['Premiere Pro'],
    thumbnail: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    screeningQuestions: [],
    milestones: [],
    proposalsToSeed: 2,
  },
];

async function replaceAndSeed25Jobs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch available user accounts
    const usersRes = await client.query(`
      SELECT a.account_id, a.display_name, a.handle
      FROM accounts a
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at ASC
      LIMIT 15
    `);
    const users = usersRes.rows;
    if (users.length < 3) {
      throw new Error('Need at least 3 user accounts in the database to seed 25 jobs and proposals.');
    }

    const randalUser =
      users.find((u) => String(u.display_name || '').toLowerCase().includes('randal')) || users[1];

    // Partition accounts so Rising/New clients have 0 ratings, while Trusted Repeat Clients have ratings
    const otherUsers = users.filter((u) => u.account_id !== randalUser.account_id);
    const trustedClients = otherUsers.slice(0, Math.min(3, otherUsers.length));
    const freshClients = otherUsers.slice(Math.min(3, otherUsers.length - 1));
    const applicantPool = otherUsers;

    // 2. Safely remove old non-contracted jobs so we have a clean 25-job marketplace
    await client.query(`
      DELETE FROM proposal_milestones
      WHERE proposal_id IN (
        SELECT p.proposal_id FROM proposals p
        WHERE p.proposal_id NOT IN (SELECT proposal_id FROM job_contracts WHERE proposal_id IS NOT NULL)
      )
    `);
    await client.query(`
      DELETE FROM proposals
      WHERE proposal_id NOT IN (SELECT proposal_id FROM job_contracts WHERE proposal_id IS NOT NULL)
    `);
    await client.query(`
      DELETE FROM job_saves
      WHERE job_id NOT IN (
        SELECT DISTINCT p.job_id FROM proposals p JOIN job_contracts jc ON p.proposal_id = jc.proposal_id
      )
    `);
    await client.query(`
      DELETE FROM job_tags
      WHERE job_id NOT IN (
        SELECT DISTINCT p.job_id FROM proposals p JOIN job_contracts jc ON p.proposal_id = jc.proposal_id
      )
    `);
    await client.query(`
      DELETE FROM job_attachments
      WHERE job_id NOT IN (
        SELECT DISTINCT p.job_id FROM proposals p JOIN job_contracts jc ON p.proposal_id = jc.proposal_id
      )
    `);
    await client.query(`
      DELETE FROM job_milestones
      WHERE job_id NOT IN (
        SELECT DISTINCT p.job_id FROM proposals p JOIN job_contracts jc ON p.proposal_id = jc.proposal_id
      )
    `);
    await client.query(`
      DELETE FROM jobs
      WHERE job_id NOT IN (
        SELECT DISTINCT p.job_id FROM proposals p JOIN job_contracts jc ON p.proposal_id = jc.proposal_id
      )
    `);

    // Ensure Randal Schuppe has 0 ratings so his Rising Job Posts qualify for the green Rising badge
    if (randalUser) {
      await client.query(`DELETE FROM ratings WHERE account_id = $1`, [randalUser.account_id]);
    }
    for (const fc of freshClients) {
      await client.query(`DELETE FROM ratings WHERE account_id = $1`, [fc.account_id]);
    }

    // Ensure Trusted Clients have 4.8 - 5.0 ratings
    for (const tc of trustedClients) {
      const ratingCheck = await client.query(
        `SELECT COUNT(*) as cnt FROM ratings WHERE account_id = $1`,
        [tc.account_id]
      );
      if (parseInt(ratingCheck.rows[0].cnt, 10) === 0) {
        const cntRes = await client.query(
          `INSERT INTO contracts (contract_type, payment_type, starts_at, rate_credits, weekly_hrs_max, total_hrs, revision_price_credits, status, is_private)
           VALUES ('job', 'fixed', NOW() - interval '20 days', 1800, 20, 40, 100, 'completed', false)
           RETURNING contract_id`
        );
        await client.query(
          `INSERT INTO ratings (stars_out_of_five, feedback, contract_id, account_id)
           VALUES (5, 'Fantastic client—clear creative brief, fast milestone approvals, and instant escrow release!', $1, $2)`,
          [cntRes.rows[0].contract_id, tc.account_id]
        );
      }
    }

    const typeStats = { individual_open: 0, individual_ranged: 0, team_pool: 0 };
    const archetypeStats = { A_RISING_JOB: 0, B_TRUSTED_CLIENT: 0, C_CROWDED_JOB: 0, D_PARTIAL_BRIEF: 0 };
    let totalProposalsCount = 0;
    let totalMilestonesCount = 0;

    for (let i = 0; i < JOBS_25.length; i++) {
      const item = JOBS_25[i];
      typeStats[item.jobType] = (typeStats[item.jobType] || 0) + 1;
      archetypeStats[item.archetype] = (archetypeStats[item.archetype] || 0) + 1;
      totalProposalsCount += (item.proposalsToSeed || 0);
      totalMilestonesCount += (item.milestones?.length || 0);

      let clientAccount;
      if (item.preferOwnerName && randalUser) {
        clientAccount = randalUser;
      } else if (item.archetype === 'A_RISING_JOB' || item.archetype === 'D_PARTIAL_BRIEF') {
        clientAccount = freshClients[i % freshClients.length] || randalUser;
      } else {
        clientAccount = trustedClients[i % trustedClients.length] || otherUsers[0];
      }

      const hiringType = 'single';
      const postedAs = 'Self';

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (item.timelineMax || 14));

      const jobRes = await client.query(
        `INSERT INTO jobs (
          client_account_id, title, description, category, payment_type,
          experience_level, no_of_hires, rate_credits_min, rate_credits_max,
          timeline_min, timeline_max, posted_as, status, rough_deadline,
          rough_no_of_revisions, portfolio_use_allowed, portfolio_use_duration_seconds,
          is_existing_project, initiator_role, require_nda, hiring_type,
          screening_questions, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'fixed',
          $5, $6, $7, $8,
          $9, $10, $11, 'Open', $12,
          2, $13, $14,
          false, 'Client', $15, $16,
          $17, NOW() - ($18 || ' days')::interval, NOW() - ($18 || ' days')::interval
        ) RETURNING job_id`,
        [
          clientAccount.account_id,
          item.title,
          item.description,
          item.category,
          item.difficulty,
          item.positionsNeeded,
          item.minBudget,
          item.maxBudget,
          item.timelineMin,
          item.timelineMax,
          postedAs,
          deadline,
          item.portfolioUseAllowed,
          item.portfolioDuration,
          item.requireNDA,
          hiringType,
          JSON.stringify(item.screeningQuestions || []),
          String(item.ageDays),
        ]
      );
      const jobId = jobRes.rows[0].job_id;

      // Insert Thumbnail Attachment (index = 0)
      if (item.thumbnail) {
        const fRes = await client.query(
          `INSERT INTO files (name, path, mime_type, size_bytes)
           VALUES ($1, $2, 'image/jpeg', 0)
           RETURNING file_id`,
          [`job_${i + 1}_thumb.jpg`, item.thumbnail]
        );
        await client.query(
          `INSERT INTO job_attachments (job_id, file_id, index)
           VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
          [jobId, fRes.rows[0].file_id]
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
          `INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [jobId, tagId]
        );
      }

      // Insert Milestones (for Team Milestone Pool jobs)
      const insertedMilestoneIds = [];
      if (Array.isArray(item.milestones) && item.milestones.length > 0) {
        for (let mIdx = 0; mIdx < item.milestones.length; mIdx++) {
          const m = item.milestones[mIdx];
          const mRes = await client.query(
            `INSERT INTO job_milestones (
              job_id, title, description, tasks, budget_percentage, budget_credits, slots_count, duration_hours, order_index
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING job_milestone_id`,
            [
              jobId,
              m.title,
              m.description,
              JSON.stringify(m.tasks || []),
              m.budget_percentage,
              m.budget_credits,
              m.slots_count,
              m.duration_hours,
              mIdx,
            ]
          );
          insertedMilestoneIds.push(mRes.rows[0].job_milestone_id);
        }
      }

      // Seed Proposals to simulate low or high congestion
      const proposalsCount = item.proposalsToSeed || 0;
      for (let p = 0; p < proposalsCount; p++) {
        const freelancer =
          applicantPool[(i + p) % applicantPool.length]?.account_id !== clientAccount.account_id
            ? applicantPool[(i + p) % applicantPool.length]
            : randalUser;

        const targetMilestoneId =
          insertedMilestoneIds.length > 0
            ? insertedMilestoneIds[p % insertedMilestoneIds.length]
            : null;

        await client.query(
          `INSERT INTO proposals (
            job_id, freelancer_account_id, letter, rate_credits,
            revision_price_credits, status, job_milestone_id, screening_answers
          ) VALUES ($1, $2, $3, $4, 50, 'Pending', $5, '[]'::jsonb)`,
          [
            jobId,
            freelancer.account_id,
            'I would love to collaborate on this production. My showreel and workflow match your timeline.',
            item.minBudget || 1000,
            targetMilestoneId,
          ]
        );
      }


    }

    await client.query('COMMIT');
    console.log('\n========================================================================');
    console.log('  [3/4] JOB MARKET DATASET SEED');
    console.log('========================================================================');
    console.log(`  ✔ Seeded ${JOBS_25.length} realistic jobs: ${typeStats.individual_open} Open Bid | ${typeStats.individual_ranged} Multi-Seat | ${typeStats.team_pool} Team Milestone Pool`);
    console.log(`  ✔ Discovery Archetypes: ${archetypeStats.A_RISING_JOB} Rising | ${archetypeStats.B_TRUSTED_CLIENT} Trusted | ${archetypeStats.C_CROWDED_JOB} High Demand | ${archetypeStats.D_PARTIAL_BRIEF} Low Brief`);
    console.log(`  ✔ Seeded ${totalMilestonesCount} milestone phases & ${totalProposalsCount} applicant proposals`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed 25 jobs:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

replaceAndSeed25Jobs();
