const { pool } = require('../lib/Database');

async function seedAssets() {
  try {
    console.log('Seeding more assets...');
    
    // Get existing assets
    const { rows: assets } = await pool.query(`
      SELECT ma.*, 
             (SELECT media_asset_id FROM market_media_assets WHERE market_asset_id = ma.market_asset_id LIMIT 1) as media_asset_id
      FROM market_assets ma
      WHERE ma.status = 'published' AND ma.deleted_at IS NULL
      LIMIT 10
    `);

    if (assets.length === 0) {
      console.log('No existing assets to clone. Exiting.');
      return;
    }

    const prefixes = ['Pro', 'Ultimate', 'Basic', 'Premium', 'Cinematic', 'Vintage', 'Modern', 'Clean', 'Essential', 'Advanced'];
    
    for (let i = 0; i < 20; i++) {
      // Pick a random existing asset to clone
      const baseAsset = assets[Math.floor(Math.random() * assets.length)];
      
      const newName = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${baseAsset.name} V${Math.floor(Math.random() * 10) + 1}`;
      const newPrice = Math.floor(Math.random() * 50) * 100; // e.g. 1000, 2500, etc.
      
      // Insert new market_asset
      const { rows: newMarket } = await pool.query(
        `INSERT INTO market_assets (name, description, price_credits, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING market_asset_id`,
        [newName, baseAsset.description, newPrice, 'published']
      );

      const newAssetId = newMarket[0].market_asset_id;

      // Map it to the same media asset
      if (baseAsset.media_asset_id) {
        await pool.query(
          `INSERT INTO market_media_assets (market_asset_id, media_asset_id)
           VALUES ($1, $2)`,
          [newAssetId, baseAsset.media_asset_id]
        );
      }

      // Clone tags
      const { rows: tags } = await pool.query(
        `SELECT tag_id FROM market_asset_tags WHERE market_asset_id = $1 AND deleted_at IS NULL`,
        [baseAsset.market_asset_id]
      );
      
      for (const t of tags) {
        await pool.query(
          `INSERT INTO market_asset_tags (market_asset_id, tag_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [newAssetId, t.tag_id]
        );
      }
    }
    
    console.log('Seeded 20 new assets successfully.');
  } catch (error) {
    console.error('Error seeding assets:', error);
  } finally {
    process.exit(0);
  }
}

seedAssets();
