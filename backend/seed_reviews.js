require('dotenv').config({ path: '.env' });
const { pool } = require('./lib/Database');

async function seedReviews() {
  try {
    const { rows: gigs } = await pool.query(`SELECT gig_id, freelancer_account_id FROM gigs LIMIT 5`);
    if (gigs.length === 0) {
      console.log('No gigs found.');
      return;
    }

    const { rows: users } = await pool.query(`SELECT account_id FROM accounts`);
    if (users.length < 2) {
      console.log('Not enough users.');
      return;
    }

    const feedbacks = [
      "Amazing work! Exceeded all my expectations.",
      "Very professional and delivered on time. Highly recommend.",
      "Good communication and solid delivery. Will use again.",
      "The video edit was incredibly cinematic. Love the color grading!",
      "Super fast turnaround and great quality.",
      "Listened to all my feedback and nailed the final cut.",
      "Incredible attention to detail.",
      "This is exactly what I needed for my YouTube channel.",
      "Top-tier post-production skills.",
      "Very patient with revisions and delivered a flawless product.",
      "Fantastic motion graphics, really elevated our brand video.",
      "The audio mixing was crisp and broadcast-ready.",
      "Best editor on the platform hands down.",
      "Great cuts, pacing is perfect.",
      "Followed the brief perfectly and added great creative flair."
    ];

    for (const gig of gigs) {
      // Pick a random number of reviews between 4 and 12
      const numReviews = Math.floor(Math.random() * (12 - 4 + 1)) + 4;
      
      const { rows: tiers } = await pool.query(`SELECT gig_tier_id FROM gig_tiers WHERE gig_id = $1 LIMIT 1`, [gig.gig_id]);
      if (tiers.length === 0) continue;
      const tierId = tiers[0].gig_tier_id;

      let added = 0;
      for (let i = 0; i < numReviews; i++) {
        // Pick a random client (not the freelancer)
        let client;
        do {
          client = users[Math.floor(Math.random() * users.length)];
        } while (client.account_id === gig.freelancer_account_id);

        const clientId = client.account_id;

        // Create gig_request
        const reqRes = await pool.query(
          `INSERT INTO gig_requests (status, client_account_id, gig_tier_id)
           VALUES ('completed', $1, $2)
           RETURNING gig_request_id`,
          [clientId, tierId]
        );
        const reqId = reqRes.rows[0].gig_request_id;

        // Create contract
        const contractRes = await pool.query(
          `INSERT INTO contracts (contract_type, payment_type, rate_credits, status, starts_at, revision_price_credits)
           VALUES ('gig', 'fixed', 500, 'completed', NOW() - INTERVAL '10 days', 50)
           RETURNING contract_id`
        );
        const contractId = contractRes.rows[0].contract_id;

        // Link gig_contract
        await pool.query(
          `INSERT INTO gig_contracts (contract_id, gig_request_id)
           VALUES ($1, $2)`,
          [contractId, reqId]
        );

        // Add rating
        const ratingScore = Math.random() > 0.2 ? 5 : (Math.random() > 0.5 ? 4 : 3);
        const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];

        await pool.query(
          `INSERT INTO ratings (stars_out_of_five, feedback, contract_id, account_id)
           VALUES ($1, $2, $3, $4)`,
          [ratingScore, feedback, contractId, clientId]
        );
        added++;
      }
      console.log(`✅ Added ${added} reviews to gig ${gig.gig_id}`);
    }

    console.log('Finished seeding reviews.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reviews:', error);
    process.exit(1);
  }
}

seedReviews();
