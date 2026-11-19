import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { loadPortfolioComposition, portfolioPlayback } from "@/lib/collab/snapshot-preview";
import { PortfolioError, portfolioTerms } from "@/lib/portfolio-clips";
import { collectMarketExportAssetSpans } from "@/features/editor/utils/market-export-assets";
import SnapshotPreview from "@/features/editor/snapshot-preview";
import { PortfolioPicker } from "@/features/editor/portfolio/portfolio-picker";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  const profileUrl = new URL("/profile?tab=portfolio", process.env.MAIN_APP_URL || "http://localhost:5173").href;
  try {
    if (!session) throw new PortfolioError("Open this clip picker from your profile to sign in.", 401);
    const terms = await portfolioTerms(id, session.account_id);
    const composition = await loadPortfolioComposition(id);
    if (!composition?.duration || !composition.snapshot.trackItemIds.length) throw new PortfolioError("This project has no timeline content to export.", 422);
    const marketSpans = collectMarketExportAssetSpans(composition.snapshot);
    const preview = await portfolioPlayback(composition, id, session.userId, terms.name);
    preview.snapshot.size ??= { width: terms.width, height: terms.height };
    return <PortfolioPicker projectId={id} version={composition.version} profileUrl={profileUrl}
      name={terms.name} duration={Math.floor(composition.duration)} maxSeconds={terms.maxSeconds} marketSpans={marketSpans}>
      <SnapshotPreview {...preview} scenes={{}} />
    </PortfolioPicker>;
  } catch (error) {
    return <main className="grid min-h-dvh place-content-center gap-3 p-6">
      <h1 className="font-semibold">Portfolio clip unavailable</h1>
      <p>{error instanceof PortfolioError ? error.message : "Unable to load this project. Please try again."}</p>
      <a className="text-primary underline" href={profileUrl}>Return to portfolio</a>
    </main>;
  }
}
