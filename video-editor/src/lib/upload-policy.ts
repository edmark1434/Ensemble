import { readExportPlanFeatures, readPlanFeatures } from "./db/upload-policy";
import { parseExportFrameRate, parseExportResolution, parseWatermarkRequired, PlanConfigurationError } from "./plan-feature-values";

type PlanName = "Free" | "Premium" | "Business";
const planNames: Record<string, PlanName> = { free: "Free", premium: "Premium", business: "Business" };
const resolutionLabel = (value: number) => value === 2160 ? "4K" : value === 1440 ? "2K" : value === 4320 ? "8K" : `${value}p`;

export async function getVideoUploadResolutionLimit(userId: string) {
  const { features } = await readPlanFeatures(userId, ['video_upload_resolution']);
  return parseExportResolution(features.get('video_upload_resolution'));
}

export async function getVideoUploadPolicy(userId: string) {
  const [{ plan: currentPlan, features }, rows] = await Promise.all([
    readPlanFeatures(userId, ['export_resolution', 'export_frame_rate', 'watermark', 'video_upload_resolution']),
    readExportPlanFeatures(),
  ]);
  const plan = planNames[currentPlan.name.trim().toLowerCase()];
  if (!plan) throw new PlanConfigurationError();
  const maxHeight = parseExportResolution(features.get('export_resolution'));
  const maxUploadHeight = parseExportResolution(features.get('video_upload_resolution'));
  const maxFps = parseExportFrameRate(features.get('export_frame_rate'));
  const canRemoveEnsembleWatermark = !parseWatermarkRequired(features.get('watermark'));
  const planOptions: { plan: PlanName; maxHeight: number; maxFps: number }[] = [];
  for (const planId of new Set(rows.map(row => row.plan_id))) {
    const planRows = rows.filter(row => row.plan_id === planId && ['export_resolution', 'export_frame_rate'].includes(row.feature_key));
    if (!planRows.length) continue;
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
  const planOrder: PlanName[] = ["Free", "Premium", "Business"];
  let nextUploadOption: { plan: PlanName; maxHeight: number } | null = null;
  for (const candidate of planOrder.slice(planOrder.indexOf(plan) + 1)) {
    const uploadRows = rows.filter(row => row.name.trim().toLowerCase() === candidate.toLowerCase() && row.feature_key === 'video_upload_resolution');
    if (uploadRows.length !== 1) continue;
    try {
      const height = parseExportResolution(uploadRows[0].value);
      if (height > maxUploadHeight) { nextUploadOption = { plan: candidate, maxHeight: height }; break; }
    } catch (error) {
      if (!(error instanceof PlanConfigurationError)) throw error;
    }
  }
  const watermarkRemovalPlan = canRemoveEnsembleWatermark ? null : (["Premium", "Business"] as const).find(option => {
    if (planOrder.indexOf(option) <= planOrder.indexOf(plan)) return false;
    const watermarkRows = rows.filter(row => row.name.trim().toLowerCase() === option.toLowerCase() && row.feature_key === 'watermark');
    if (watermarkRows.length !== 1) return false;
    try {
      return !parseWatermarkRequired(watermarkRows[0].value);
    } catch (error) {
      if (!(error instanceof PlanConfigurationError)) throw error;
      return false;
    }
  }) ?? null;
  return { plan, maxHeight, maxWidth: maxHeight * 16 / 9,
    maxUploadHeight, maxUploadWidth: maxUploadHeight * 16 / 9,
    maxFps, planOptions, canRemoveEnsembleWatermark, watermarkRemovalPlan,
    label: resolutionLabel(maxUploadHeight), showNotice: Boolean(nextUploadOption),
    nextPlan: nextUploadOption?.plan ?? null, nextLabel: nextUploadOption ? resolutionLabel(nextUploadOption.maxHeight) : "",
    upgradeUrl: `${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/credits-subscriptions` };
}
