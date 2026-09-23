const { pool: db } = require('../lib/Database');

const getAdminPlans = async (req, res) => {
  try {
    // 1. Fetch all plans
    const plansRes = await db.query('SELECT * FROM plans ORDER BY amount_php_cents ASC');
    const plans = plansRes.rows;

    // 2. Fetch all globally available features
    const featuresRes = await db.query('SELECT * FROM features ORDER BY name');
    const allFeatures = featuresRes.rows.map(f => ({ ...f, title: f.name }));

    // 3. Fetch plan_features to map which plan has what
    const planFeaturesRes = await db.query(`
      SELECT pf.plan_id, f.feature_id, f.name as title, pf.value
      FROM plan_features pf
      JOIN features f ON pf.feature_id = f.feature_id
    `);
    
    // 4. Attach features to plans
    const mappedPlans = plans.map((plan) => {
      const planFeats = planFeaturesRes.rows.filter(pf => pf.plan_id === plan.plan_id);
      return {
        ...plan,
        price: plan.amount_php_cents / 100, // convert cents to PHP for frontend
        features: planFeats,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        plans: mappedPlans,
        allFeatures: allFeatures, // To show checkboxes in the Edit Modal
      }
    });
  } catch (error) {
    console.error('Error fetching admin plans:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching plans' });
  }
};

const updateAdminPlan = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, days_of_trials } = req.body;

  try {
    const amount_php_cents = price * 100;
    
    const query = `
      UPDATE plans 
      SET 
        name = $1, 
        description = $2, 
        amount_php_cents = $3, 
        days_of_trials = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE plan_id = $5
      RETURNING *
    `;
    const { rows } = await db.query(query, [name, description, amount_php_cents, days_of_trials, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.status(200).json({ success: true, message: 'Plan updated successfully', plan: rows[0] });
  } catch (error) {
    console.error('Error updating plan:', error);
    return res.status(500).json({ success: false, message: 'Server error updating plan' });
  }
};

const updateAdminPlanFeatures = async (req, res) => {
  const { id } = req.params;
  const { features } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM plan_features WHERE plan_id = $1', [id]);
    
    if (features && features.length > 0) {
      const values = [];
      const placeholders = [];
      let i = 1;
      for (const f of features) {
        placeholders.push(`($${i++}, $${i++}, $${i++})`);
        values.push(id, f.feature_id, f.value || '');
      }
      const insertQuery = "INSERT INTO plan_features (plan_id, feature_id, value) VALUES " + placeholders.join(', ');
      await client.query(insertQuery, values);
    }
    
    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Plan features updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating plan features:', error);
    return res.status(500).json({ success: false, message: 'Server error updating plan features' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAdminPlans,
  updateAdminPlan,
  updateAdminPlanFeatures
};
