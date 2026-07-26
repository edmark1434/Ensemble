/**
 * Expand Ensemble ticket type catalog — full platform coverage per moderator queue.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO ticket_type_catalog (type_label, queue_role, sort_order, description) VALUES
      -- Support Moderator
      ('Account Access', 'Support Moderator', 10, 'Login, password reset, locked accounts'),
      ('Account Verification', 'Support Moderator', 20, 'Identity / KYC verification'),
      ('Profile and Settings', 'Support Moderator', 25, 'Profile, privacy, and account settings'),
      ('Subscriptions and Plans', 'Support Moderator', 30, 'Plan changes, renewals, cancellations'),
      ('Credit Top-ups', 'Support Moderator', 40, 'Purchasing or missing credits'),
      ('Withdrawing Earnings', 'Support Moderator', 50, 'Payouts and withdrawal issues'),
      ('Billing and Payments', 'Support Moderator', 55, 'Payment methods, invoices, charges'),
      ('Video Editor', 'Support Moderator', 60, 'Editor tool bugs and access'),
      ('Notifications and Email', 'Support Moderator', 65, 'Email, push, and in-app alerts'),
      ('Technical Issue', 'Support Moderator', 68, 'Site bugs and performance issues'),
      ('Other', 'Support Moderator', 70, 'General support not covered elsewhere'),
      -- Forum Moderator
      ('Forums', 'Forum Moderator', 80, 'General forum help'),
      ('Forum Posts', 'Forum Moderator', 81, 'Discussion posts and threads'),
      ('Forum Groups', 'Forum Moderator', 82, 'Groups, membership, ownership'),
      ('Forum Comments', 'Forum Moderator', 83, 'Comments and replies'),
      ('Forum Reports', 'Forum Moderator', 84, 'User reports in forums'),
      -- Marketplace Moderator
      ('Asset Marketplace', 'Marketplace Moderator', 90, 'General marketplace issues'),
      ('Listing Issues', 'Marketplace Moderator', 91, 'Listing create, edit, rejection'),
      ('Purchase and Delivery', 'Marketplace Moderator', 92, 'Purchases, downloads, delivery'),
      ('Seller Verification', 'Marketplace Moderator', 93, 'Seller onboarding and verification'),
      ('Marketplace Refunds', 'Marketplace Moderator', 94, 'Refunds and chargebacks'),
      ('Asset Quality', 'Marketplace Moderator', 95, 'Broken or misrepresented assets'),
      -- Jobs N Gigs Moderator
      ('Jobs and Gigs', 'Jobs N Gigs Moderator', 100, 'General jobs and gigs help'),
      ('Job Posts', 'Jobs N Gigs Moderator', 101, 'Job listings and hiring posts'),
      ('Gig Posts', 'Jobs N Gigs Moderator', 102, 'Gig packages and offers'),
      ('Applications and Hiring', 'Jobs N Gigs Moderator', 103, 'Applications, proposals, hiring'),
      ('Contracts and Milestones', 'Jobs N Gigs Moderator', 104, 'Contracts, milestones, delivery')
    ON CONFLICT (type_label) DO UPDATE SET
      queue_role = EXCLUDED.queue_role,
      sort_order = EXCLUDED.sort_order,
      description = EXCLUDED.description,
      is_active = TRUE
  `);

  // Ensure statuses / priorities stay Title Case
  pgm.sql(`
    INSERT INTO ticket_status_catalog (status_label, sort_order, is_closed) VALUES
      ('Open', 10, FALSE),
      ('In Progress', 20, FALSE),
      ('Resolved', 30, TRUE),
      ('Closed', 40, TRUE)
    ON CONFLICT (status_label) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      is_closed = EXCLUDED.is_closed,
      is_active = TRUE
  `);

  pgm.sql(`
    INSERT INTO ticket_priority_catalog (priority_label, sort_order) VALUES
      ('Low', 10),
      ('Medium', 20),
      ('High', 30)
    ON CONFLICT (priority_label) DO UPDATE SET
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE
  `);

  pgm.sql(`
    UPDATE tickets SET
      type = CASE lower(btrim(COALESCE(type, '')))
        WHEN 'billing' THEN 'Billing and Payments'
        WHEN 'profile' THEN 'Profile and Settings'
        WHEN 'settings' THEN 'Profile and Settings'
        WHEN 'technical' THEN 'Technical Issue'
        WHEN 'bug' THEN 'Technical Issue'
        WHEN 'notifications' THEN 'Notifications and Email'
        ELSE type
      END,
      status = CASE lower(replace(btrim(COALESCE(status, '')), '_', ' '))
        WHEN 'open' THEN 'Open'
        WHEN 'in progress' THEN 'In Progress'
        WHEN 'resolved' THEN 'Resolved'
        WHEN 'closed' THEN 'Closed'
        ELSE status
      END,
      priority = CASE lower(btrim(COALESCE(priority, '')))
        WHEN 'low' THEN 'Low'
        WHEN 'medium' THEN 'Medium'
        WHEN 'high' THEN 'High'
        ELSE priority
      END
    WHERE deleted_at IS NULL
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM ticket_type_catalog
    WHERE type_label IN (
      'Profile and Settings',
      'Billing and Payments',
      'Notifications and Email',
      'Technical Issue',
      'Forum Posts',
      'Forum Groups',
      'Forum Comments',
      'Forum Reports',
      'Listing Issues',
      'Purchase and Delivery',
      'Seller Verification',
      'Marketplace Refunds',
      'Asset Quality',
      'Job Posts',
      'Gig Posts',
      'Applications and Hiring',
      'Contracts and Milestones'
    )
  `);
};
