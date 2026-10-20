const { pool } = require('./Database');

const SAMPLE_JOBS_DATA = [
  // 10 INDIVIDUAL JOBS (hiring_type = 'single', no_of_hires = 1)
  {
    title: "YouTube Tech Channel Long-Form Video Editor",
    description: "Looking for a dedicated video editor for our weekly tech reviews and unboxing episodes (12-15 min cuts). You will be responsible for tight A-roll pacing, inserting B-roll product close-ups, subtle sound design, dynamic title cards, and lower-third spec overlays.\n\nRequirements:\n• Proven experience editing tech YouTube content\n• Proficiency in Adobe Premiere Pro or DaVinci Resolve\n• Clean audio level leveling and background music ducking\n• Quick turnaround within 48-72 hours of receiving raw a-roll.",
    category: "YouTube",
    difficulty: "Intermediate",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 1800,
    maxBudget: null, // Open Bid 1,800+
    timelineMin: 3,
    timelineMax: 5,
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
    skills: ["YouTube", "Premiere Pro", "B-Roll Pacing", "Tech Reviews", "Sound Design"],
    screening_questions: [
      "Link your top 2 favorite YouTube videos you have edited (preferably tech, reviews, or desk setups).",
      "What is your typical turnaround time for a 12-minute rough cut from 45 minutes of raw footage?"
    ],
    milestones: [
      {
        title: "Rough Cut & A-Roll Pacing",
        description: "Assembly of spoken tracks, trim dead air, and insert primary B-roll cutaways.",
        budget_percentage: 50,
        budget_credits: 900,
        slots_count: 1,
        duration_hours: 24,
        tasks: ["Assemble A-roll dialog", "Trim pauses & flubs", "Place primary B-roll footage"]
      },
      {
        title: "Graphics, Sound FX & Final Master",
        description: "Add spec lower-thirds, sound effects, audio ducking, and deliver 4K 60fps export.",
        budget_percentage: 50,
        budget_credits: 900,
        slots_count: 1,
        duration_hours: 24,
        tasks: ["Lower-third overlays", "Audio compression & leveling", "Final 4K export"]
      }
    ]
  },
  {
    title: "Viral TikTok & IG Reels Short-Form Hook Editor",
    description: "We need a punchy short-form editor to transform podcast highlights and talking-head videos into 60-second viral TikToks, Instagram Reels, and YouTube Shorts. Must understand modern retention mechanics, 3-second hook theory, kinetic typography, zooms, and sound effects.\n\nRequirements:\n• Master of dynamic kinetic subtitles (word-by-word highlight colors)\n• Fast visual cuts, memes, and sound FX accents\n• Experience with CapCut Pro, Premiere Pro, or After Effects\n• Deliver 5 high-converting vertical exports per batch.",
    category: "Social",
    difficulty: "Intermediate",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 800,
    maxBudget: 1400, // Ranged Budget 800 - 1,400
    timelineMin: 2,
    timelineMax: 3,
    thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=800&q=80",
    skills: ["Short-Form", "TikTok", "Reels", "Kinetic Typography", "CapCut"],
    screening_questions: [
      "Please share links to 3 vertical shorts you edited that reached over 100k views or showed high engagement.",
      "Which software do you use for animated captions and tracking?"
    ]
  },
  {
    title: "Cinematic Wedding 4K Highlight Reel Editor",
    description: "Seeking a master storyteller to edit an emotional 8-10 minute cinematic wedding highlight film from 80GB of multi-camera Sony FX3 S-Log3 footage. Must weave ceremony vows, speeches, and ambient audio into a tear-jerking narrative arc with bespoke color grading.\n\nRequirements:\n• Expert multi-cam synchronization and 32-bit float audio mixing\n• Natural, warm filmic color grading (matching Sony S-Log3 to Rec.709 with highlight roll-off)\n• Emotional music pacing and licensed track layering\n• 4K Master export plus a 60-second social teaser cut.",
    category: "Events",
    difficulty: "Expert",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 5500,
    maxBudget: 5500, // Fixed Price 5,500
    timelineMin: 5,
    timelineMax: 7,
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    skills: ["Wedding Video", "DaVinci Resolve", "Color Grading", "Cinematic Storytelling", "Multi-Cam"],
    screening_questions: [
      "Provide a link to a full wedding highlight film you directed or edited.",
      "What is your approach to handling poor audio recordings during ceremony vows?"
    ]
  },
  {
    title: "Multi-Camera Podcast Assembly & Audio Sync",
    description: "Looking for an efficient video editor to assemble weekly 3-camera studio podcast episodes (2 hosts + guest). Raw footage consists of 3 4K Sony angles and 3 separate Shure SM7B WAV tracks recorded over 90 minutes.\n\nDeliverables:\n• Multicam angle switching following conversational flow\n• Clean audio noise removal, compression, and loudness normalization (-16 LUFS)\n• Intro/outro bumper stingers and topic chapter title cards\n• Render 1 full episode + 3 vertical micro-clips for promo.",
    category: "YouTube",
    difficulty: "Intermediate",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 2000,
    maxBudget: 3200, // Ranged Budget 2,000 - 3,200
    timelineMin: 3,
    timelineMax: 5,
    thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
    skills: ["Podcast Editing", "Multi-Cam", "Audio Sync", "Premiere Pro", "Loudness Normalization"],
    screening_questions: [
      "Do you have experience editing 3+ camera multicam setups in Premiere or DaVinci?",
      "How do you ensure speaker switches feel natural rather than jarring?"
    ]
  },
  {
    title: "Fast-Paced Gaming Montage & Velocity Curve Editor",
    description: "Need a creative editor to craft a 3-minute competitive gaming montage (Valorant / Apex Legends). Footage is recorded at 240fps for ultra-smooth velocity curve re-timing synced to bass drops, kill sync sound effects, screen shakes, and subtle glow overlays.\n\nRequirements:\n• Flawless beat-matching and velocity time-remapping\n• Creative transitions (RSMB motion blur, zooms, pan whips)\n• Sound design: enhanced gunshots, hit markers, sub-bass impacts\n• Deliver 1440p / 4K 60fps final video.",
    category: "YouTube",
    difficulty: "Beginner",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 1000,
    maxBudget: null, // Open Bid 1,000+
    timelineMin: 1,
    timelineMax: 3,
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
    skills: ["Gaming Montage", "Velocity Editing", "After Effects", "Beat Sync", "Sound SFX"],
    screening_questions: [
      "Share a portfolio link with your best gaming velocity/sync montage."
    ]
  },
  {
    title: "Archival Documentary Pacing & Historical Assembly",
    description: "Independent production company seeking an experienced documentary editor to assemble a 25-minute historical episode. Project involves mixing 1960s 16mm digitized film scans, archival newspapers, voiceover narration, and modern 4K interview clips.\n\nRequirements:\n• Keen sense of dramatic pacing and historical storytelling\n• Ken Burns style 2.5D parallax photo animation\n• Clean aspect ratio handling (4:3 archival to 16:9 modern letterboxing)\n• Professional archival media asset management.",
    category: "Corporate",
    difficulty: "Expert",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 6000,
    maxBudget: 6000, // Fixed Price 6,000
    timelineMin: 10,
    timelineMax: 14,
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
    skills: ["Documentary", "Archival Footage", "Story Pacing", "Premiere Pro", "Parallax Animation"],
    screening_questions: [
      "Have you previously edited long-form documentary or investigative journalism content?",
      "How do you handle low-resolution historical photographs and archival scans?"
    ]
  },
  {
    title: "E-Commerce 30s High-Conversion Product Ads",
    description: "Direct-to-consumer fitness apparel brand requires 3 variations of a 30-second Facebook/Instagram ad. We have studio product photography, fitness model gym clips, and customer testimonial unboxing videos.\n\nDeliverables:\n• 3 hook variations (problem/solution, aesthetic montage, social proof)\n• Modern 3D/2D callouts highlighting fabric breathability and seams\n• High-energy royalty-free music sync with upbeat transitions\n• 9:16 vertical and 1:1 square aspect ratio exports.",
    category: "Corporate",
    difficulty: "Intermediate",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 1500,
    maxBudget: 2500, // Ranged Budget 1,500 - 2,500
    timelineMin: 3,
    timelineMax: 4,
    thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    skills: ["Product Ads", "E-Commerce", "Motion Graphics", "Social Media Ads", "Color Correction"],
    screening_questions: [
      "Link 2 high-converting paid social ads (FB/IG/TikTok) you created for e-commerce brands."
    ]
  },
  {
    title: "DaVinci Resolve Colorist for Indie Music Video",
    description: "Looking for an exceptional colorist to grade a completed 4-minute indie rock music video shot on ARRI Alexa Mini (ARRIRAW). The creative brief calls for 1970s warm vintage print film emulation (Kodak 2383 look), textured film grain, halation, and rich shadow density.\n\nRequirements:\n• Work strictly inside DaVinci Resolve Studio (color managed workflow / ACES or DWG)\n• Shot-to-shot color matching across day exterior and neon interior scenes\n• Deliver XML roundtrip or graded ProRes 4444 XQ master.",
    category: "Events",
    difficulty: "Expert",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 4000,
    maxBudget: 4000, // Fixed Price 4,000
    timelineMin: 3,
    timelineMax: 5,
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    skills: ["DaVinci Resolve", "Colorist", "Film Emulation", "Color Grading", "Music Video"],
    screening_questions: [
      "Please provide your color grading showreel or before/after breakdown shots.",
      "Do you use ACES or DaVinci YRGB Color Managed as your primary working color space?"
    ]
  },
  {
    title: "SaaS Product Demo & UI Motion Screen Recording Editor",
    description: "We are launching a new collaborative productivity software and need a crisp 90-second product tour video. We will provide 4K screen recordings of the web app and professional AI/studio voiceover.\n\nRequirements:\n• Smooth synthetic cursor movements and mouse click ripples\n• 3D perspective zooms, tilt angles, and UI window mockups in space\n• Sleek kinetic text callouts matching brand guidelines\n• Clean sound design with pleasant tactile UI click sounds.",
    category: "Corporate",
    difficulty: "Intermediate",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 2500,
    maxBudget: 3800, // Ranged Budget 2,500 - 3,800
    timelineMin: 4,
    timelineMax: 6,
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    skills: ["SaaS Explainer", "After Effects", "UI Animation", "Screen Capture", "Motion Design"],
    screening_questions: [
      "Share an example of a software walk-through or UI promo video you animated."
    ]
  },
  {
    title: "Cinematic Travel Vlog Storyline & Soundscape Editor",
    description: "Looking for an editor who loves cinematic travel filmmaking to edit a 15-minute Japan travel documentary vlog. Raw footage is shot on Sony A7SIII and DJI Mavic 3 Pro.\n\nKey Focus Areas:\n• Seamless sound design (foley: footsteps, temple bells, shinkansen trains, rain)\n• Intentional pacing: quiet contemplative pauses transitioning into energetic montage sequences\n• Speed ramping and directional whip pans\n• Cohesive color grading matching natural Japanese daylight.",
    category: "YouTube",
    difficulty: "Intermediate",
    hiring_type: "single",
    no_of_hires: 1,
    minBudget: 1600,
    maxBudget: null, // Open Bid 1,600+
    timelineMin: 4,
    timelineMax: 6,
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    skills: ["Travel Vlog", "Sound Design", "Foley", "Speed Ramping", "Cinematic"],
    screening_questions: [
      "Link your most cinematic vlog or travel video edit."
    ]
  },

  // 5 TEAM JOBS (hiring_type = 'team', with job_milestones roles)
  {
    title: "High-Budget Brand Commercial Post-Production Team",
    description: "Global apparel brand hiring a complete post-production team for our 2026 Winter Campaign commercial (60s broadcast master + 15s cutdowns). We need a cohesive team or specialist creators to fill three defined roles: Offline Story Editor, 3D Motion Graphics Artist, and Lead Colorist / Sound Mixer.",
    category: "Corporate",
    difficulty: "Expert",
    hiring_type: "team",
    no_of_hires: 3,
    minBudget: 15000,
    maxBudget: 15000,
    timelineMin: 10,
    timelineMax: 14,
    thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
    skills: ["Commercial", "Post-Production Team", "3D Motion Graphics", "DaVinci Resolve", "Sound Mix"],
    screening_questions: [
      "Which specific milestone role (Story Editor, Motion Graphics, or Color/Sound) are you pitching for?",
      "Show your strongest work sample relevant to your chosen role."
    ],
    milestones: [
      {
        title: "Offline Story Editor & Narrative Cut",
        description: "Ingest 6K RED footage, multi-cam assembly, rough cut pacing, director review revisions, and locked picture cut.",
        budget_percentage: 40,
        budget_credits: 6000,
        slots_count: 1,
        duration_hours: 96,
        tasks: ["Footage ingest & proxy generation", "Assembly & rough cut", "Director review iterations", "Picture lock final conform"]
      },
      {
        title: "3D Motion Graphics & Typography Artist",
        description: "Create stylized 3D logo animation, kinetic product feature typographic titles, and screen compositing.",
        budget_percentage: 30,
        budget_credits: 4500,
        slots_count: 1,
        duration_hours: 72,
        tasks: ["Brand typography animation", "3D product logo reveal", "Motion track screen replacements", "Alpha channel graphics export"]
      },
      {
        title: "Colorist & Sound Design Engineer",
        description: "DaVinci Resolve HDR color grade, 5.1 surround sound mix, custom foley design, and broadcast master loudness delivery (-24 LKFS).",
        budget_percentage: 30,
        budget_credits: 4500,
        slots_count: 1,
        duration_hours: 72,
        tasks: ["ACES DaVinci Resolve color grade", "Foley soundscape design", "Dialogue EQ & noise cleaning", "Broadcast 5.1 & stereo loudness delivery"]
      }
    ]
  },
  {
    title: "YouTube Channel Scaling Team: Long-Form & Shorts",
    description: "A growing finance & business YouTube channel (450K subscribers) is assembling a two-person video creation squad. We need a primary long-form editor to handle full 20-minute video essays and a creative short-form editor to repurpose each episode into 5 viral shorts.",
    category: "YouTube",
    difficulty: "Intermediate",
    hiring_type: "team",
    no_of_hires: 2,
    minBudget: 9000,
    maxBudget: 9000,
    timelineMin: 7,
    timelineMax: 10,
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80",
    skills: ["YouTube", "Video Essay", "Shorts Repurposing", "Premiere Pro", "Motion Graphics"],
    screening_questions: [
      "Are you applying for the Lead Long-Form role or the Shorts Repurposing role?",
      "Link a channel or video you've worked on in the finance/educational niche."
    ],
    milestones: [
      {
        title: "Lead Long-Form Video Essayist Editor",
        description: "Edit 2 complete 20-minute deep dive video essays with custom charts, B-roll archival research, and motion graphics.",
        budget_percentage: 65,
        budget_credits: 5850,
        slots_count: 1,
        duration_hours: 80,
        tasks: ["Voiceover pacing & narrative cut", "Archival stock research", "Finance charts & visual graphic callouts", "Background soundscape mix"]
      },
      {
        title: "Shorts & Reels Repurposing Specialist",
        description: "Extract 10 engaging hooks from the long-form episodes, design kinetic subtitles, and optimize for 9:16 mobile feeds.",
        budget_percentage: 35,
        budget_credits: 3150,
        slots_count: 1,
        duration_hours: 40,
        tasks: ["Identify high-engagement clips", "Vertical 9:16 crop & reframing", "Kinetic subtitle animation", "Sound effects & music sync"]
      }
    ]
  },
  {
    title: "Feature Documentary Film Post-Production Crew",
    description: "Post-production team needed for a 45-minute environmental documentary film shot across Southeast Asia. Production has wrapped and we are staffing three crucial roles: Senior Assembly Editor, Archival Researcher & Photo Animator, and Audio Post Engineer.",
    category: "Events",
    difficulty: "Expert",
    hiring_type: "team",
    no_of_hires: 3,
    minBudget: 18000,
    maxBudget: 18000,
    timelineMin: 20,
    timelineMax: 30,
    thumbnail: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80",
    skills: ["Documentary", "Feature Film", "Audio Restoration", "After Effects", "Surround Sound"],
    screening_questions: [
      "Which role on the documentary crew are you applying for?",
      "Describe your experience working with documentary directors on extended edits."
    ],
    milestones: [
      {
        title: "Senior Assembly & Narrative Editor",
        description: "Review 120 hours of raw interview and wildlife footage, craft three-act narrative arc, and deliver locked edit.",
        budget_percentage: 45,
        budget_credits: 8100,
        slots_count: 1,
        duration_hours: 120,
        tasks: ["Interview transcript logging", "Three-act story assembly", "Director feedback passes", "Picture lock conform"]
      },
      {
        title: "Archival Media Researcher & 2.5D Animator",
        description: "Source high-resolution historical maps and government documents, reconstruct missing timelines with 2.5D photo camera projection.",
        budget_percentage: 25,
        budget_credits: 4500,
        slots_count: 1,
        duration_hours: 60,
        tasks: ["Archival license clearing", "Photo restoration", "2.5D After Effects camera parallax", "Document callout animations"]
      },
      {
        title: "Audio Post Engineer & Sound Designer",
        description: "Clean noisy field audio, design immersive jungle/ocean ambiances, record custom foley, and produce final 5.1 theatrical surround mix.",
        budget_percentage: 30,
        budget_credits: 5400,
        slots_count: 1,
        duration_hours: 80,
        tasks: ["Field dialogue noise reduction (iZotope)", "Ambience and foley design", "Original score stems mastering", "5.1 surround sound final delivery"]
      }
    ]
  },
  {
    title: "Cyberpunk Indie Music Video VFX & Color Duo",
    description: "We have an eccentric 3-minute electronic synthwave music video filmed against practical neon sets. We need a dynamic two-artist team: Lead VFX Compositor to add sci-fi hologram elements, wire removals, and screen replacements, alongside a Colorist for an otherworldly grading pass.",
    category: "Events",
    difficulty: "Expert",
    hiring_type: "team",
    no_of_hires: 2,
    minBudget: 11000,
    maxBudget: 11000,
    timelineMin: 7,
    timelineMax: 10,
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
    skills: ["VFX Compositing", "Music Video", "After Effects", "DaVinci Resolve", "Color Grading"],
    screening_questions: [
      "Specify whether you are pitching as the VFX Compositor or the Colorist.",
      "Show 2 shots demonstrating your tracking, screen replacement, or neon color grading abilities."
    ],
    milestones: [
      {
        title: "Lead VFX Compositor & Clean Plate Artist",
        description: "30 VFX shots: planar screen replacements, holographic HUD elements, wire removal, and anamorphic lens flare compositing.",
        budget_percentage: 55,
        budget_credits: 6050,
        slots_count: 1,
        duration_hours: 60,
        tasks: ["Planar screen tracking (Mocha)", "Wire removals and cleanup", "Holographic sci-fi HUD assets", "Compositing in Nuke/After Effects"]
      },
      {
        title: "DaVinci Resolve Stylized Colorist",
        description: "Neon teal-and-magenta palette separation, high-contrast film response curve, customized film halation, and final ACES master export.",
        budget_percentage: 45,
        budget_credits: 4950,
        slots_count: 1,
        duration_hours: 40,
        tasks: ["Teal & magenta neon tone separation", "VFX shot matching and integration", "Custom halation pass", "ProRes 4444 delivery"]
      }
    ]
  },
  {
    title: "Interactive Course Video Production Team",
    description: "An online creative academy is producing a 10-module masterclass on digital cinematography. We are hiring a two-person team: A Course Video Editor to cut lecture multi-cams and slide transitions, and an Educational Motion Graphics Designer for animated visual diagrams.",
    category: "Corporate",
    difficulty: "Intermediate",
    hiring_type: "team",
    no_of_hires: 2,
    minBudget: 8500,
    maxBudget: 8500,
    timelineMin: 10,
    timelineMax: 14,
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    skills: ["Masterclass", "Course Editing", "Motion Graphics", "Multi-Cam", "Educational"],
    screening_questions: [
      "Which position (Course Video Editor or Motion Graphics Animator) are you applying for?",
      "Do you have experience working with instructional or educational video content?"
    ],
    milestones: [
      {
        title: "Course Lecture Video Editor",
        description: "Cut 10 modules (approx 15 mins each), sync teleprompter audio, multi-angle camera switching, and chapter markers.",
        budget_percentage: 55,
        budget_credits: 4675,
        slots_count: 1,
        duration_hours: 70,
        tasks: ["Sync A/B camera angles", "Audio EQ and compression", "Cut lecture flubs and pauses", "Render 10 master MP4 modules"]
      },
      {
        title: "Educational Motion Graphics Animator",
        description: "Design 25 animated diagrams explaining camera sensor sizes, lens focal lengths, aperture stops, and lighting ratios.",
        budget_percentage: 45,
        budget_credits: 3825,
        slots_count: 1,
        duration_hours: 50,
        tasks: ["Storyboard visual diagrams", "Vector illustration & asset prep", "2D After Effects animation", "Alpha overlay exports for editor"]
      }
    ]
  }
];

async function seedSampleJobs(userAccountIds) {
  if (userAccountIds.length === 0) return;

  for (let i = 0; i < SAMPLE_JOBS_DATA.length; i++) {
    const job = SAMPLE_JOBS_DATA[i];
    const clientAccountId = userAccountIds[i % userAccountIds.length];

    const minBudget = job.minBudget || 0;
    const maxBudget = job.maxBudget !== undefined ? job.maxBudget : minBudget;
    const timelineMin = job.timelineMin || 1;
    const timelineMax = job.timelineMax || 5;

    // 1. Insert job
    const jobRes = await pool.query(
      `INSERT INTO jobs (
        client_account_id, title, description, category, payment_type, experience_level,
        no_of_hires, rate_credits_min, rate_credits_max, timeline_min, timeline_max,
        status, rough_deadline, rough_no_of_revisions, posted_as, hiring_type, screening_questions
      ) VALUES ($1, $2, $3, $4, 'fixed', $5, $6, $7, $8, $9, $10, 'Open', NOW() + interval '21 days', 0, 'self', $11, $12)
      RETURNING job_id`,
      [
        clientAccountId,
        job.title,
        job.description,
        job.category,
        job.difficulty,
        job.no_of_hires,
        minBudget,
        maxBudget,
        timelineMin,
        timelineMax,
        job.hiring_type,
        JSON.stringify(job.screening_questions || [])
      ]
    );
    const jobId = jobRes.rows[0].job_id;

    // 2. Insert thumbnail file and link
    const fileRes = await pool.query(
      `INSERT INTO files (name, path, mime_type, size_bytes) VALUES ($1, $2, 'image/jpeg', 0) RETURNING file_id`,
      [`thumbnail_${i + 1}.jpg`, job.thumbnail]
    );
    await pool.query(
      `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1, $2, 0)`,
      [jobId, fileRes.rows[0].file_id]
    );

    // 3. Insert tags and link
    if (job.skills) {
      for (const tag of job.skills) {
        let tagId;
        const existingTag = await pool.query(`SELECT tag_id FROM tags WHERE LOWER(name) = LOWER($1)`, [tag]);
        if (existingTag.rows.length > 0) {
          tagId = existingTag.rows[0].tag_id;
        } else {
          const newTag = await pool.query(`INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`, [tag]);
          tagId = newTag.rows[0].tag_id;
        }
        await pool.query(`INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [jobId, tagId]);
      }
    }

    // 4. Insert Milestones
    if (job.milestones && Array.isArray(job.milestones)) {
      for (let mIdx = 0; mIdx < job.milestones.length; mIdx++) {
        const m = job.milestones[mIdx];
        await pool.query(
          `INSERT INTO job_milestones (
            job_id, title, description, tasks, budget_percentage, budget_credits, slots_count, duration_hours, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            jobId,
            m.title,
            m.description || '',
            JSON.stringify(m.tasks || []),
            m.budget_percentage,
            m.budget_credits,
            m.slots_count || 1,
            m.duration_hours || 40,
            mIdx
          ]
        );
      }
    }
  }
}

module.exports = {
  seedSampleJobs,
  SAMPLE_JOBS_DATA
};
