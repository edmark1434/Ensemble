import { readExportPlanFeatures, readPlanFeatures } from "./db/upload-policy";
import { parseExportFrameRate, parseExportResolution, PlanConfigurationError } from "./plan-feature-values";

type PlanName = "Free" | "Premium" | "Business";
const planNames: Record<string, PlanName> = { free: "Free", premium: "Premium", business: "Business" };
const resolutionLabel = (value: number) => value === 2160 ? "4K" : value === 1440 ? "2K" : value === 4320 ? "8K" : `${value}p`;

export async function getVideoUploadPolicy(userId: string) {
  const [{ plan: currentPlan, features }, rows] = await Promise.all([
    readPlanFeatures(userId, ['export_resolution', 'export_frame_rate']),
    readExportPlanFeatures(),
  ]);
  const plan = planNames[currentPlan.name.trim().toLowerCase()];
  if (!plan) throw new PlanConfigurationError();
  const maxHeight = parseExportResolution(features.get('export_resolution'));
  const maxFps = parseExportFrameRate(features.get('export_frame_rate'));
  const planOptions: { plan: PlanName; maxHeight: number; maxFps: number }[] = [];
  for (const planId of new Set(rows.map(row => row.plan_id))) {
    const planRows = rows.filter(row => row.plan_id === planId);
    const optionPlan = planNames[planRows[0].name.trim().toLowerCase()];
    if (!optionPlan) continue;
    if (planId === currentPlan.plan_id) {
      planOptions.push({ plan, maxHeight, maxFps });
      continue;
    }
    // Invalid limits on another tier must not advertise an unsupported upgrade.
    try {
      if (planRows.length !== 2 || new Set(planRows.map(row => row.feature_key)).size !== 2) continue;
      planOptions.push({ plan: optionPlan,
        maxHeight: parseExportResolution(planRows.find(row => row.feature_key === 'export_resolution')?.value),
        maxFps: parseExportFrameRate(planRows.find(row => row.feature_key === 'export_frame_rate')?.value) });
    } catch (error) {
      if (!(error instanceof PlanConfigurationError)) throw error;
    }
  }
  const nextOption = planOptions.slice(planOptions.findIndex(option => option.plan === plan) + 1)
    .find(option => option.maxHeight > maxHeight);
  return { plan, maxHeight, maxWidth: maxHeight * 16 / 9,
    maxFps, planOptions,
    label: resolutionLabel(maxHeight), showNotice: Boolean(nextOption),
    nextPlan: nextOption?.plan ?? null, nextLabel: nextOption ? resolutionLabel(nextOption.maxHeight) : "",
    upgradeUrl: `${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/credits-subscriptions` };
}
