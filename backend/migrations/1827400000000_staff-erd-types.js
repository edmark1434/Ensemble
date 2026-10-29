/**
 * Align staff with the ER diagram: role is an enum, other labels are unbounded varchar.
 * Values come from backend/lib/StaffEnums.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
const { STAFF_ROLES } = require('../lib/StaffEnums');

function sqlEnumLabels(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ');
}

exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE staff
    SET role = CASE lower(btrim(COALESCE(role, '')))
      WHEN 'admin' THEN 'Admin'
      WHEN 'administrator' THEN 'Admin'
      WHEN 'support moderator' THEN 'Support Moderator'
      WHEN 'support_moderator' THEN 'Support Moderator'
      WHEN 'marketplace moderator' THEN 'Marketplace Moderator'
      WHEN 'marketplace_moderator' THEN 'Marketplace Moderator'
      WHEN 'forum moderator' THEN 'Forum Moderator'
      WHEN 'forum_moderator' THEN 'Forum Moderator'
      WHEN 'jobs n gigs moderator' THEN 'Jobs N Gigs Moderator'
      WHEN 'jobs & gigs moderator' THEN 'Jobs N Gigs Moderator'
      WHEN 'jobs and gigs moderator' THEN 'Jobs N Gigs Moderator'
      WHEN 'jobs moderator' THEN 'Jobs N Gigs Moderator'
      ELSE role
    END
  `);
  await pgm.db.query(
    `UPDATE staff
     SET role = 'Support Moderator'
     WHERE role IS NULL OR role NOT IN (${sqlEnumLabels(STAFF_ROLES)})`
  );

  await pgm.db.query(`DROP TYPE IF EXISTS staff_role`);
  await pgm.db.query(`CREATE TYPE staff_role AS ENUM (${sqlEnumLabels(STAFF_ROLES)})`);

  await pgm.db.query(`
    ALTER TABLE staff
      ALTER COLUMN role TYPE staff_role USING role::staff_role,
      ALTER COLUMN password_hash TYPE varchar USING password_hash::varchar,
      ALTER COLUMN firebase_staff_uuid TYPE varchar USING firebase_staff_uuid::varchar,
      ALTER COLUMN first_name TYPE varchar USING first_name::varchar,
      ALTER COLUMN last_name TYPE varchar USING last_name::varchar,
      ALTER COLUMN email_address TYPE varchar USING email_address::varchar
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE staff
      ALTER COLUMN role TYPE varchar(50) USING role::text,
      ALTER COLUMN password_hash TYPE text USING password_hash::text,
      ALTER COLUMN firebase_staff_uuid TYPE varchar(50) USING firebase_staff_uuid::varchar(50),
      ALTER COLUMN first_name TYPE varchar(50) USING first_name::varchar(50),
      ALTER COLUMN last_name TYPE varchar(50) USING last_name::varchar(50),
      ALTER COLUMN email_address TYPE varchar(50) USING email_address::varchar(50)
  `);
  await pgm.db.query(`DROP TYPE IF EXISTS staff_role`);
};
