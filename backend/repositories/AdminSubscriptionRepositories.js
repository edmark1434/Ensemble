const { pool } = require('../lib/Database');

async function listPlansWithFeatures() {
  const [plans, features, planFeatures] = await Promise.all([
    pool.query(`
      SELECT plan_id, name, description, billing_period, amount_php_cents, days_of_trials, updated_at
      FROM plans
      ORDER BY amount_php_cents ASC, name ASC
    `),
    pool.query(`SELECT feature_id, feature_key, name, description FROM features ORDER BY name`),
    pool.query(`
      SELECT pf.plan_id, f.feature_id, f.feature_key, f.name AS title, pf.value
      FROM plan_features pf
      JOIN features f ON pf.feature_id = f.feature_id
      ORDER BY f.name
    `),
  ]);
  return { plans: plans.rows, features: features.rows, planFeatures: planFeatures.rows };
}

async function lockPlan(client, planId) {
  const result = await client.query(
    `SELECT plan_id, name, description, billing_period, amount_php_cents, days_of_trials
     FROM plans WHERE plan_id = $1 FOR UPDATE`,
    [planId]
  );
  return result.rows[0] || null;
}

async function listPlanFeatureValues(client, planId) {
  const result = await client.query(
    `SELECT pf.feature_id, f.name AS title, pf.value
     FROM plan_features pf
     JOIN features f ON f.feature_id = pf.feature_id
     WHERE pf.plan_id = $1`,
    [planId]
  );
  return result.rows;
}

async function listExistingFeatures(client, featureIds) {
  if (!featureIds.length) return [];
  const result = await client.query(
    `SELECT feature_id, name FROM features WHERE feature_id = ANY($1::uuid[])`,
    [featureIds]
  );
  return result.rows;
}

async function updatePlanRow(client, planId, { description, amountPhpCents, daysOfTrials }) {
  const result = await client.query(
    `UPDATE plans
     SET description = $2,
         amount_php_cents = $3,
         days_of_trials = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE plan_id = $1
     RETURNING plan_id, name, description, billing_period, amount_php_cents, days_of_trials, updated_at`,
    [planId, description, amountPhpCents, daysOfTrials]
  );
  return result.rows[0] || null;
}

async function replacePlanFeatures(client, planId, features) {
  await client.query('DELETE FROM plan_features WHERE plan_id = $1', [planId]);
  if (!features.length) return;
  const values = [];
  const placeholders = features.map((feature, index) => {
    values.push(planId, feature.featureId, feature.value);
    const base = index * 3;
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });
  await client.query(
    `INSERT INTO plan_features (plan_id, feature_id, value) VALUES ${placeholders.join(', ')}`,
    values
  );
}

/** Run `work(client)` in one transaction and fail loudly if COMMIT turned into ROLLBACK. */
async function withPlanTransaction(work) {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    const commit = await client.query('COMMIT');
    if (String(commit?.command || '').toUpperCase() === 'ROLLBACK') {
      const error = new Error('The plan could not be saved. Nothing was changed.');
      error.statusCode = 500;
      error.code = 'COMMIT_ROLLED_BACK';
      throw error;
    }
    committed = true;
    return result;
  } catch (err) {
    if (!committed) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listPlansWithFeatures,
  lockPlan,
  listPlanFeatureValues,
  listExistingFeatures,
  updatePlanRow,
  replacePlanFeatures,
  withPlanTransaction,
};
