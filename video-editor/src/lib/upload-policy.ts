import { readUploadPlan } from "./db/upload-policy";

export async function getVideoUploadPolicy(userId: string) {
  const name = (await readUploadPlan(userId)).trim().toLowerCase();
  const plan = name === "business" ? "Business" : name === "premium" ? "Premium" : "Free";
  const maxHeight = plan === "Business" ? 2160 : plan === "Premium" ? 1080 : 720;
  const nextPlan = plan === "Free" ? "Premium" : plan === "Premium" ? "Business" : null;
  const nextMaxHeight = plan === "Free" ? 1080 : 2160;
  return { plan, maxHeight, maxWidth: maxHeight * 16 / 9,
    label: maxHeight === 2160 ? "4K" : `${maxHeight}p`, showNotice: plan !== "Business",
    nextPlan, nextLabel: nextMaxHeight === 2160 ? "4K" : `${nextMaxHeight}p`,
    upgradeUrl: `${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/credits-subscriptions` };
}
