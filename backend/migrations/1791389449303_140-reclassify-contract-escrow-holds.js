/**
 * Reclassify contract escrow-to-escrow transfers as credits placed on hold.
 */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE credit_transactions ct
    SET type = 'Escrow Hold'
    FROM wallets source_wallet, wallets destination_wallet
    WHERE ct.source_wallet_id = source_wallet.wallet_id
      AND ct.destination_wallet_id = destination_wallet.wallet_id
      AND ct.reference_table = 'contracts'
      AND ct.type = 'Fund Transfer'
      AND source_wallet.type = 'escrow wallets'
      AND destination_wallet.type = 'escrow wallets';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE credit_transactions ct
    SET type = 'Fund Transfer'
    FROM wallets source_wallet, wallets destination_wallet
    WHERE ct.source_wallet_id = source_wallet.wallet_id
      AND ct.destination_wallet_id = destination_wallet.wallet_id
      AND ct.reference_table = 'contracts'
      AND ct.type = 'Escrow Hold'
      AND source_wallet.type = 'escrow wallets'
      AND destination_wallet.type = 'escrow wallets';
  `);
};
