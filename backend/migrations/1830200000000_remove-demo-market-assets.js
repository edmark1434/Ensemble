exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE removed_demo_market_assets (
      market_asset_id uuid PRIMARY KEY,
      trashed_at timestamp without time zone NOT NULL
    );

    WITH removed AS (
      UPDATE market_assets
      SET trashed_at = LOCALTIMESTAMP
      WHERE (name, description) IN (
        ('Urban LUT Pack', 'Cinematic LUT pack for city footage.'),
        ('Lower Third Kit', 'Clean lower thirds for interviews.')
      )
        AND trashed_at IS NULL
        AND deleted_at IS NULL
      RETURNING market_asset_id, trashed_at
    )
    INSERT INTO removed_demo_market_assets (market_asset_id, trashed_at)
    SELECT market_asset_id, trashed_at FROM removed;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE market_assets AS asset
    SET trashed_at = NULL
    FROM removed_demo_market_assets AS removed
    WHERE asset.market_asset_id = removed.market_asset_id
      AND asset.trashed_at = removed.trashed_at
      AND asset.deleted_at IS NULL;

    DROP TABLE removed_demo_market_assets;
  `);
};
