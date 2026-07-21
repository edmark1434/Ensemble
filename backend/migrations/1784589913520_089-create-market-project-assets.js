/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('market_project_assets', {
    market_asset_id: { type: 'uuid', notNull: true },
    project_id: { type: 'uuid', notNull: true },
  });

  pgm.addConstraint('market_project_assets', 'market_project_assets_pkey', 'PRIMARY KEY (market_asset_id, project_id)');
  pgm.addConstraint('market_project_assets', 'market_project_assets_market_asset_id_fkey', 'FOREIGN KEY (market_asset_id) REFERENCES market_assets(market_asset_id)');
  pgm.addConstraint('market_project_assets', 'market_project_assets_project_id_fkey', 'FOREIGN KEY (project_id) REFERENCES projects(project_id)');
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('market_project_assets', { ifExists: true });
};
