/**
 * Seed realistic, rich user datasets (Freelancers, Clients, Enthusiasts) for the Discovery page.
 * Populates:
 * - accounts (with avatar_file_id using preset avatars p1..p12, banner_preset, tagline, bio, merit_score)
 * - users (with bcrypt password "user123")
 * - user_platform_purpose (Freelancer, Client, Enthusiast)
 * - user_tags (skills with proficiency and years of experience)
 * - verifications (verified vs unverified mix)
 * - subscriptions (Business, Premium, Free mix)
 * - ratings (realistic 4.2★ to 5.0★ ratings and some unrated "New talent" to demonstrate cold-start fairness)
 * - account_followers (social graph follower counts)
 * - account_badges (claimed display badges)
 *
 * Usage: node scripts/SeedDiscoveryFreelancers.js [count=32]
 */
require('dotenv').config();
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { pool } = require('../lib/Database');

const cap = (v, max) => (v == null ? v : String(v).slice(0, max));
const buildShortEmail = (prefix) => {
  const p = cap(prefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(), 20) || 'user';
  return `${p}${faker.string.alphanumeric(6).toLowerCase()}@mail.com`;
};

const BANNER_PRESETS = [
  null, // Uses deterministic default Ensemble banner (Blue / Purple / Yellow)
  null,
  'Ensemble Blue.png',
  'Ensemble Purple.png',
  'Ensemble Yellow.png',
  'Freemium Sleek.png',
  'Premium Sleek.png',
  'Business Sleek.png',
  'Go Beyond Edit 2026.png',
  'Spreadshot.png',
  'Raster.png',
];

// Curated creator personas (role, subscription, verified, ratingCount, stars, tagline, bio, skills)
const PERSONAS = [
  {
    firstName: 'Mateo',
    lastName: 'Valdez',
    role: 'Freelancer',
    sub: 'Business',
    verified: true,
    ratings: [5, 5, 5, 5],
    tagline: 'Lead Commercial Colorist & DaVinci Finishing',
    bio: 'Senior commercial colorist with 7+ years grading brand campaigns, music videos, and festival shorts. ACES pipeline & HDR deliverables.',
    skills: [
      ['Color Grading', 'Expert', 7],
      ['Color Correction', 'Expert', 7],
      ['Video Editing', 'Advanced', 6],
      ['Scene Framing', 'Advanced', 5],
    ],
  },
  {
    firstName: 'ara',
    lastName: 'Kurosawa',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 5, 4],
    tagline: 'Retention-obsessed YouTube & Documentary Editor',
    bio: 'Crafting high-retention long-form documentaries and creator essays. Specialized in narrative pacing, sound risers, and 3D motion callouts.',
    skills: [
      ['Video Editing', 'Expert', 5],
      ['Pacing & Timing', 'Expert', 5],
      ['Scene Selection', 'Advanced', 4],
      ['Audio Editing', 'Intermediate', 3],
      ['Captioning', 'Advanced', 4],
    ],
  },
  {
    firstName: 'Liam',
    lastName: 'Mercer',
    role: 'Freelancer',
    sub: 'Free',
    verified: true,
    ratings: [], // Brand-new unrated talent with complete profile (great for testing cold-start boost!)
    tagline: 'Short-Form Viral Reels & TikTok Growth Editor',
    bio: 'Helping founders and educators scale on TikTok, Reels, and Shorts with kinetic typography, punchy B-roll, and sub-second hook pacing.',
    skills: [
      ['Video Editing', 'Advanced', 3],
      ['Dynamic Captions', 'Expert', 3],
      ['Captioning', 'Advanced', 3],
      ['Pacing & Timing', 'Advanced', 2],
      ['Scene Transitions', 'Intermediate', 2],
    ],
  },
  {
    firstName: 'Elena',
    lastName: 'Rostova',
    role: 'Freelancer',
    sub: 'Business',
    verified: true,
    ratings: [5, 5, 5, 5, 5],
    tagline: 'VFX Compositor & 3D Motion Director',
    bio: 'Nuke & After Effects compositor delivering clean plate removals, rotoscoping, matchmoving, and stylized HUD motion graphics for trailers.',
    skills: [
      ['Visual Effects (VFX)', 'Expert', 8],
      ['Compositing', 'Expert', 7],
      ['Motion Graphics', 'Expert', 6],
      ['2D Animation', 'Advanced', 4],
    ],
  },
  {
    firstName: 'Noah',
    lastName: 'Takahashi',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 4, 5],
    tagline: 'Podcast Multicam & Dialogue Mastering Specialist',
    bio: 'Full-episode multicam switching, spectral audio denoise, LUFS loudness mastering, and viral vertical clip extraction for video podcasts.',
    skills: [
      ['Multi-camera Scene Editing', 'Expert', 4],
      ['Dialogue Editing', 'Expert', 5],
      ['Audio Editing', 'Expert', 5],
      ['Subtitling & Closed Captions', 'Advanced', 3],
    ],
  },
  {
    firstName: 'Chloe',
    lastName: 'Bennet',
    role: 'Freelancer',
    sub: 'Free',
    verified: false,
    ratings: [5],
    tagline: '2D Anime AMV & Kinetic Typography Artist',
    bio: 'Frame-synced rhythm cuts, custom speed graphs, twixtor flow, and vibrant 2D typography overlays for gaming and music creators.',
    skills: [
      ['2D Animation', 'Advanced', 3],
      ['Motion Graphics', 'Advanced', 3],
      ['Scene Transitions', 'Expert', 4],
      ['Pacing & Timing', 'Advanced', 3],
    ],
  },
  {
    firstName: 'Marcus',
    lastName: 'Vance',
    role: 'Client',
    sub: 'Business',
    verified: true,
    ratings: [5, 5, 5],
    tagline: 'Creative Director @ Vance Media Studio',
    bio: 'Commissioning weekly post-production sprints for SaaS launch films, YouTube channels, and paid social ad creatives.',
    skills: [
      ['Video Editing', 'Advanced', 5],
      ['Scene Assembly', 'Intermediate', 4],
      ['Shot Selection', 'Advanced', 5],
    ],
  },
  {
    firstName: 'Hannah',
    lastName: 'Alvarez',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 5],
    tagline: 'Cinematic Wedding & Event Highlight Filmmaker',
    bio: 'Turning raw multi-cam event footage into emotional, sound-driven narrative films with natural skin-tone color grading.',
    skills: [
      ['Scene Assembly', 'Expert', 6],
      ['Shot Selection', 'Expert', 6],
      ['Continuity Editing', 'Advanced', 5],
      ['Color Grading', 'Advanced', 4],
      ['Audio Editing', 'Intermediate', 3],
    ],
  },
  {
    firstName: 'Devon',
    lastName: 'Brooks',
    role: 'Freelancer',
    sub: 'Free',
    verified: true,
    ratings: [], // Unrated cold-start talent
    tagline: 'Sound Designer & Foley Mixer for Indie Shorts',
    bio: 'Custom foley, cinematic impacts, atmospheric beds, and crisp dialogue cleanup in Pro Tools and Fairlight.',
    skills: [
      ['Sound Design', 'Expert', 4],
      ['Audio Editing', 'Expert', 4],
      ['Dialogue Editing', 'Advanced', 3],
    ],
  },
  {
    firstName: 'Priya',
    lastName: 'Natarajan',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 5, 5, 4],
    tagline: 'SaaS Product Explainers & UI Motion Graphics',
    bio: 'Clean, modern UI animations and product walkthrough videos that turn complex software features into high-converting demos.',
    skills: [
      ['Motion Graphics', 'Expert', 5],
      ['2D Animation', 'Expert', 4],
      ['Video Editing', 'Advanced', 4],
      ['Dynamic Captions', 'Advanced', 3],
    ],
  },
  {
    firstName: 'Julian',
    lastName: 'Cho',
    role: 'Freelancer',
    sub: 'Free',
    verified: true,
    ratings: [5, 4],
    tagline: 'Esports & Gaming Montage Editor',
    bio: 'High-octane FPS and variety gaming edits with 3D camera tracking, cine-cams, SFX layering, and comedic subtitle timing.',
    skills: [
      ['Video Editing', 'Advanced', 4],
      ['Visual Effects (VFX)', 'Intermediate', 3],
      ['Pacing & Timing', 'Expert', 4],
      ['Scene Selection', 'Advanced', 3],
      ['Captioning', 'Advanced', 3],
    ],
  },
  {
    firstName: 'Sofia',
    lastName: 'Lindqvist',
    role: 'Freelancer',
    sub: 'Business',
    verified: true,
    ratings: [5, 5, 5],
    tagline: 'Documentary Assembly & Multi-Cam Story Editor',
    bio: 'Long-form documentary editor experienced in paper edits, stringouts, archival integration, and ensemble interview weaving.',
    skills: [
      ['Ensemble Editing', 'Expert', 7],
      ['Continuity Editing', 'Expert', 7],
      ['Dialogue Editing', 'Advanced', 6],
      ['Scene Selection', 'Expert', 6],
      ['Shot Selection', 'Advanced', 5],
    ],
  },
  {
    firstName: 'Kaelen',
    lastName: 'Cross',
    role: 'Enthusiast',
    sub: 'Free',
    verified: false,
    ratings: [],
    tagline: 'Indie Film Enthusiast & Experimental Colorist',
    bio: 'Exploring 16mm film emulation, halation shaders, and collaborative timeline workflows on Ensemble.',
    skills: [
      ['Color Grading', 'Intermediate', 2],
      ['Scene Framing', 'Intermediate', 2],
      ['Video Editing', 'Intermediate', 2],
    ],
  },
  {
    firstName: 'Tariq',
    lastName: 'Mansoor',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 5, 4, 5],
    tagline: 'Multilingual Subtitling, SRT & Localization Pro',
    bio: 'Broadcast-compliant closed captioning, burned-in stylized subtitles, and timecode-accurate transcription for global releases.',
    skills: [
      ['Subtitling & Closed Captions', 'Expert', 5],
      ['Captioning', 'Expert', 5],
      ['Auto-captioning', 'Expert', 4],
      ['Video Editing', 'Intermediate', 3],
    ],
  },
  {
    firstName: 'Maya',
    lastName: 'Lin',
    role: 'Client',
    sub: 'Premium',
    verified: true,
    ratings: [5, 5],
    tagline: 'Head of Content @ Lumina Creators',
    bio: 'Managing a roster of 12 lifestyle and tech creators. Always scouting reliable editors for weekly retainers and team projects.',
    skills: [
      ['Video Editing', 'Intermediate', 3],
      ['Pacing & Timing', 'Advanced', 4],
      ['Captioning', 'Intermediate', 3],
    ],
  },
  {
    firstName: 'Lucas',
    lastName: 'Moreau',
    role: 'Freelancer',
    sub: 'Free',
    verified: true,
    ratings: [5, 5],
    tagline: 'Direct-Response UGC & Performance Ad Editor',
    bio: 'Modular hook testing, split-screen social proof, and fast-paced DTC video ads built for Meta, TikTok, and YouTube Shorts.',
    skills: [
      ['Video Editing', 'Advanced', 4],
      ['Dynamic Captions', 'Expert', 4],
      ['Scene Transitions', 'Advanced', 3],
      ['Pacing & Timing', 'Expert', 4],
      ['Color Correction', 'Intermediate', 2],
    ],
  },
  {
    firstName: 'Amina',
    lastName: 'Okafor',
    role: 'Freelancer',
    sub: 'Business',
    verified: true,
    ratings: [5, 5, 5, 5],
    tagline: 'Full-Stack Post-Production Lead & Ensemble Editor',
    bio: 'End-to-end post supervisor handling offline assembly, motion graphics packaging, color finishing, and stems delivery.',
    skills: [
      ['Ensemble Editing', 'Expert', 6],
      ['Video Editing', 'Expert', 6],
      ['Color Grading', 'Advanced', 5],
      ['Motion Graphics', 'Advanced', 5],
      ['Audio Editing', 'Advanced', 4],
    ],
  },
  {
    firstName: 'Ethan',
    lastName: 'Gallagher',
    role: 'Freelancer',
    sub: 'Free',
    verified: false,
    ratings: [],
    tagline: 'Fast-Turnaround Vlogs & Travel Creator Cuts',
    bio: 'getic story cuts, beat-matched transitions, and drone speed-ramping for travel and lifestyle YouTubers.',
    skills: [
      ['Video Editing', 'Intermediate', 2],
      ['Scene Transitions', 'Advanced', 3],
      ['Shot Selection', 'Intermediate', 2],
      ['Color Correction', 'Intermediate', 2],
    ],
  },
  {
    firstName: 'Nadia',
    lastName: 'Petrova',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 4, 5],
    tagline: 'Music Video Editor & Visual Rhythm Specialist',
    bio: 'Cutting narrative and performance music videos with seamless match cuts, optical glow comps, and film grain textures.',
    skills: [
      ['Video Editing', 'Expert', 5],
      ['Pacing & Timing', 'Expert', 5],
      ['Compositing', 'Advanced', 4],
      ['Color Grading', 'Advanced', 4],
    ],
  },
  {
    firstName: 'Rafael',
    lastName: 'Silva',
    role: 'Enthusiast',
    sub: 'Free',
    verified: true,
    ratings: [5],
    tagline: 'Motion Typography & Title Sequence Designer',
    bio: 'Passionate about kinetic type systems, brutalist title cards, and lower-third broadcast packages.',
    skills: [
      ['Motion Graphics', 'Advanced', 3],
      ['2D Animation', 'Intermediate', 2],
      ['Dynamic Captions', 'Advanced', 3],
      ['Scene Framing', 'Intermediate', 2],
    ],
  },
  {
    firstName: 'Zoe',
    lastName: 'Callahan',
    role: 'Freelancer',
    sub: 'Free',
    verified: true,
    ratings: [5, 5, 5],
    tagline: 'Narrative Short Film & Continuity Editor',
    bio: 'Focused on invisible cuts, dramatic eye-trace, performance selection, and L/J-cut dialogue flow for narrative fiction.',
    skills: [
      ['Continuity Editing', 'Expert', 5],
      ['Scene Assembly', 'Expert', 5],
      ['Shot Selection', 'Expert', 5],
      ['Dialogue Editing', 'Advanced', 4],
    ],
  },
  {
    firstName: 'Kenji',
    lastName: 'Watanabe',
    role: 'Freelancer',
    sub: 'Premium',
    verified: true,
    ratings: [5, 5],
    tagline: 'Real Estate, Luxury Architecture & Aerial Editor',
    bio: 'Stabilized FPV/drone speed ramps, sky replacement, day-to-dusk color grading, and luxury property tour sequences.',
    skills: [
      ['Color Grading', 'Expert', 5],
      ['Scene Framing', 'Expert', 5],
      ['Video Editing', 'Advanced', 4],
      ['Visual Effects (VFX)', 'Intermediate', 3],
    ],
  },
  {
    firstName: 'Victor',
    lastName: 'Holloway',
    role: 'Client',
    sub: 'Business',
    verified: true,
    ratings: [5, 4, 5],
    tagline: 'Executive Producer @ Apex Documentary Labs',
    bio: 'Hiring specialized editors, colorists, and sound mixers for investigative mini-docs and branded series.',
    skills: [
      ['Ensemble Editing', 'Advanced', 6],
      ['Scene Selection', 'Advanced', 5],
    ],
  },
  {
    firstName: 'Camila',
    lastName: 'Delgado',
    role: 'Freelancer',
    sub: 'Free',
    verified: true,
    ratings: [],
    tagline: 'Course & EdTech Video Production Specialist',
    bio: 'Transforming raw webinar and lecture recordings into polished, chaptered online courses with clean callout graphics.',
    skills: [
      ['Video Editing', 'Advanced', 4],
      ['Subtitling & Closed Captions', 'Advanced', 4],
      ['Multi-camera Scene Editing', 'Intermediate', 3],
      ['Audio Editing', 'Advanced', 3],
    ],
  },
];

async function main() {
  const count = Math.max(1, parseInt(process.argv[2], 10) || PERSONAS.length);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Load purposes
    const purposeRows = (await client.query('SELECT plpu_id, purpose_name FROM platform_purpose')).rows;
    const purposeMap = new Map(purposeRows.map((r) => [r.purpose_name, r.plpu_id]));

    // Load plans
    const planRows = (await client.query('SELECT plan_id, name FROM plans')).rows;
    const planMap = new Map(planRows.map((r) => [r.name, r.plan_id]));

    // Load tags
    const tagByName = new Map(
      (await client.query('SELECT tag_id, name FROM tags WHERE deleted_at IS NULL')).rows.map((t) => [
        t.name.toLowerCase(),
        t.tag_id,
      ])
    );

    // Load existing contracts (needed if we attach ratings)
    const contractRows = (await client.query('SELECT contract_id FROM contracts LIMIT 10')).rows;
    const sampleContractId = contractRows[0]?.contract_id || null;

    // Load badges for display
    const badgeRows = (
      await client.query(
        `SELECT badge_id, registry_id FROM badges WHERE deleted_at IS NULL AND registry_id IN ('setup-profile', 'acc-freelance-1', 'acc-freelance-2', 'acc-client-1', 'acc-beta')`
      )
    ).rows;

    // Ensure 12 preset avatar file rows exist in `files` table (`p1.png` .. `p12.png`)
    const avatarFileIds = [];
    for (let p = 1; p <= 12; p++) {
      const presetPath = `p${p}.png`;
      let existing = (await client.query('SELECT file_id FROM files WHERE path = $1 LIMIT 1', [presetPath])).rows[0];
      if (!existing) {
        existing = (
          await client.query(
            `INSERT INTO files (name, path, mime_type, size_bytes, created_at)
             VALUES ($1, $2, 'image/png', 24576, NOW()) RETURNING file_id`,
            [presetPath, presetPath]
          )
        ).rows[0];
      }
      avatarFileIds.push(existing.file_id);
    }

    const passwordHash = await bcrypt.hash('user123', 10);
    const createdAccountIds = [];

    for (let i = 0; i < count; i++) {
      const persona = PERSONAS[i % PERSONAS.length];
      const firstName = i < PERSONAS.length ? (persona.firstName === 'ara' ? 'Sora' : persona.firstName) : cap(faker.person.firstName(), 50);
      const lastName = i < PERSONAS.length ? persona.lastName : cap(faker.person.lastName(), 50);
      const displayName = cap(`${firstName} ${lastName}`, 50);

      let baseHandle = `${firstName}_${lastName}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
      let handle = cap(baseHandle, 50);
      let suffix = 1;
      while ((await client.query('SELECT 1 FROM accounts WHERE LOWER(handle) = $1', [handle])).rowCount) {
        handle = cap(`${baseHandle}_${suffix++}`, 50);
      }

      const avatarFileId = avatarFileIds[i % avatarFileIds.length];
      const bannerPreset = BANNER_PRESETS[i % BANNER_PRESETS.length];
      const meritScore = persona.ratings.length
        ? Math.round((persona.ratings.reduce((a, b) => a + b, 0) / persona.ratings.length) * 20)
        : 50;

      const accountId = (
        await client.query(
          `INSERT INTO accounts (display_name, handle, type, tagline, description, merit_score, avatar_file_id, banner_preset, status, created_at)
           VALUES ($1, $2, 'User', $3, $4, $5, $6, $7, 'Active', NOW() - ($8 || ' days')::interval)
           RETURNING account_id`,
          [
            displayName,
            handle,
            persona.tagline,
            persona.bio,
            meritScore,
            avatarFileId,
            bannerPreset,
            String((i % 25) + 1),
          ]
        )
      ).rows[0].account_id;

      createdAccountIds.push(accountId);

      const userId = (
        await client.query(
          `INSERT INTO users (firebase_user_uuid, first_name, last_name, email_address, password_hash, account_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id`,
          [
            cap(faker.string.alphanumeric(28), 50),
            firstName,
            lastName,
            cap(buildShortEmail(`${firstName}${lastName}`), 50),
            passwordHash,
            accountId,
          ]
        )
      ).rows[0].user_id;

      // 1. Role (Platform Purpose)
      const roleId = purposeMap.get(persona.role) || purposeMap.get('Freelancer');
      if (roleId) {
        await client.query('INSERT INTO user_platform_purpose (plpu_id, user_id) VALUES ($1, $2)', [roleId, userId]);
      }

      // 2. Subscription Plan
      const planId = planMap.get(persona.sub) || planMap.get('Free');
      if (planId) {
        await client.query(
          `INSERT INTO subscriptions (status, plan_id, user_id, cancel_at_period_end, created_at, updated_at)
           VALUES ('active', $1, $2, FALSE, NOW(), NOW())`,
          [planId, userId]
        );
      }

      // 3. Verification
      if (persona.verified) {
        await client.query(
          `INSERT INTO verifications (account_id, is_verified, verified_at, created_at, updated_at)
           VALUES ($1, TRUE, NOW(), NOW(), NOW())
           ON CONFLICT (account_id) DO UPDATE SET is_verified = TRUE, verified_at = NOW(), updated_at = NOW()`,
          [accountId]
        );
      }

      // 4. Skills (user_tags)
      for (const [skillName, prof, years] of persona.skills) {
        const tagId = tagByName.get(skillName.toLowerCase());
        if (!tagId) continue;
        await client.query(
          `INSERT INTO user_tags (user_id, tag_id, proficiency, years)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [userId, tagId, prof, years]
        );
      }

      // 5. Ratings (if sampleContractId exists and persona has ratings)
      if (sampleContractId && persona.ratings.length > 0) {
        for (const stars of persona.ratings) {
          await client.query(
            `INSERT INTO ratings (stars_out_of_five, feedback, created_at, updated_at, contract_id, account_id)
             VALUES ($1, $2, NOW(), NOW(), $3, $4)`,
            [stars, 'Excellent communication, fast delivery, and clean timeline organization.', sampleContractId, accountId]
          );
        }
      }

      // 6. Badges (1 to 3 claimed badges)
      if (badgeRows.length > 0) {
        const numBadges = (i % 3) + 1;
        for (let b = 0; b < Math.min(numBadges, badgeRows.length); b++) {
          const badge = badgeRows[(i + b) % badgeRows.length];
          await client.query(
            `INSERT INTO account_badges (badge_id, account_id, created_at, display_order, status, claimed_at)
             VALUES ($1, $2, NOW(), $3, 'claimed', NOW())
             ON CONFLICT DO NOTHING`,
            [badge.badge_id, accountId, b + 1]
          );
        }
      }

      console.log(
        `+ ${displayName} (@${handle}) [${persona.role} | ${persona.sub} | ${persona.verified ? 'Verified' : 'Unverified'} | ${persona.ratings.length} reviews]`
      );
    }

    // 7. Seed realistic follower relationships among accounts
    const allAccountIds = (
      await client.query(`SELECT account_id FROM accounts WHERE type = 'User' AND deleted_at IS NULL LIMIT 60`)
    ).rows.map((r) => r.account_id);

    for (let i = 0; i < createdAccountIds.length; i++) {
      const targetId = createdAccountIds[i];
      const followerCount = 3 + ((i * 7) % 18); // 3 to 20 followers each
      for (let f = 0; f < Math.min(followerCount, allAccountIds.length); f++) {
        const followerId = allAccountIds[(i + f * 3) % allAccountIds.length];
        if (followerId !== targetId) {
          await client.query(
            `INSERT INTO account_followers (follower_id, followed_id, created_at)
             VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
            [followerId, targetId]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\nSuccessfully seeded ${count} rich Discovery profiles! Password for all: user123`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
