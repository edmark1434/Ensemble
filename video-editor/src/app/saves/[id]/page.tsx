import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getProjectSavePreview, ProjectSaveError, SAVE_UUID, savesUpgradeUrl } from "@/lib/project-saves";
import SnapshotPreview from "@/features/editor/snapshot-preview";

// Recheck access and plan on every visit.
export const dynamic = "force-dynamic";

const mainAppUrl = () => (process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "");

function SaveUnavailable({ message, action }: { message: string; action?: { href: string; label: string } }) {
  const link = action ?? { href: `${mainAppUrl()}/projects`, label: "Return to projects" };
  return <main className="flex min-h-screen items-center justify-center p-6">
    <div className="max-w-md rounded-xl border border-border bg-background p-6">
      <h1 className="text-lg font-semibold">Preview unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <a href={link.href} className="mt-4 inline-block text-sm underline">{link.label}</a>
    </div>
  </main>;
}

export default async function SavePreviewPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const { id } = await params;
  const { preview } = await searchParams;
  if (!SAVE_UUID.test(id) || typeof preview !== "string" || !preview) return <SaveUnavailable message="Open this save from the project's Saves panel." />;
  const token = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return <SaveUnavailable message="Your editor session has ended. Open the project again, then preview the save from the Saves panel." />;
  let result;
  try {
    result = await getProjectSavePreview(id, session.userId, preview);
  } catch (error) {
    if (error instanceof ProjectSaveError && error.code === "PLAN_REQUIRED") {
      return <SaveUnavailable message="Saves are available on the Premium and Business plans." action={{ href: savesUpgradeUrl(), label: "Upgrade plan" }} />;
    }
    if (error instanceof ProjectSaveError) return <SaveUnavailable message={error.message} />;
    throw error;
  }
  if (!result) return <SaveUnavailable message="This save is no longer available." />;
  return <SnapshotPreview {...result} />;
}
