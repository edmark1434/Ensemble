const {
  PlanServiceError,
  getAdminPlansService,
  updateAdminPlanService,
} = require('../services/AdminSubscriptionServices');

function sendPlanError(res, error, fallback) {
  if (error instanceof PlanServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      errors: error.errors || undefined,
    });
  }
  console.error(`${fallback}:`, error);
  return res.status(500).json({ success: false, message: fallback });
}

const getAdminPlans = async (req, res) => {
  try {
    const data = await getAdminPlansService();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendPlanError(res, error, 'Server error fetching plans');
  }
};

/** Price, trial, description and (optionally) `features`, saved together. */
const updateAdminPlan = async (req, res) => {
  try {
    const result = await updateAdminPlanService({
      planId: req.params.id,
      body: req.body || {},
      session: req.session,
    });
    return res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      plan: result.plan,
      changeCount: result.changeCount,
    });
  } catch (error) {
    return sendPlanError(res, error, 'Server error updating plan');
  }
};

const updateAdminPlanFeatures = async (req, res) => {
  try {
    const result = await updateAdminPlanService({
      planId: req.params.id,
      body: { features: req.body?.features ?? [] },
      session: req.session,
      featuresOnly: true,
    });
    return res.status(200).json({
      success: true,
      message: 'Plan features updated successfully',
      changeCount: result.changeCount,
    });
  } catch (error) {
    return sendPlanError(res, error, 'Server error updating plan features');
  }
};

module.exports = {
  getAdminPlans,
  updateAdminPlan,
  updateAdminPlanFeatures,
};
