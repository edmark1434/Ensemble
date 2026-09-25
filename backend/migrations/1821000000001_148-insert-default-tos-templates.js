exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO terms_of_service (terms_id, terms_title, terms_description, terms_type, is_default, account_id)
    VALUES (
      '00000000-0000-0000-0000-000000000010',
      'Ensemble Standard Job Terms',
      '1. Scope of Work: The freelancer will provide services as outlined in the accepted job proposal.\n2. Revisions: Revisions are limited to those explicitly agreed upon in the milestone or contract.\n3. Confidentiality: Both parties agree to keep any shared materials and intellectual property confidential.\n4. Delivery: Final deliverables will be provided upon milestone completion.',
      'jobs',
      FALSE,
      NULL
    ),
    (
      '00000000-0000-0000-0000-000000000011',
      'Ensemble Standard Gig Terms',
      '1. Scope of Work: The freelancer will deliver the services exactly as described in the gig package.\n2. Revisions: Standard revisions cover minor adjustments. Major changes outside the gig scope require additional addons.\n3. Delivery timeframe: The work will be delivered within the days specified in the purchased gig tier.\n4. Final handover: Source files and final assets will be transferred upon the final milestone approval.',
      'gigs',
      TRUE,
      NULL
    )
    ON CONFLICT (terms_id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM terms_of_service WHERE terms_id IN ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011');
  `);
};
