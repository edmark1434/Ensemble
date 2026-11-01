// app/api/media-assets/route.ts

import { connection, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { uploadTrashCutoff } from "@/lib/upload-trash";
import { buildPublicUrl } from "@/lib/s3";

type UploadScope = "mine" | "project" | "mine-in-project" | "deleted";
const VALID_SCOPES: UploadScope[] = ["mine", "project", "mine-in-project", "deleted"];

export async function GET(request: NextRequest) {
  await connection();

  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get("projectId");
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const userId = session.userId;
  const scopeParam = searchParams.get("scope") as UploadScope | null;
  const scope: UploadScope =
    scopeParam && VALID_SCOPES.includes(scopeParam) ? scopeParam : "project";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  if ((scope === "mine" || scope === "mine-in-project") && !userId) {
    return NextResponse.json(
      { error: "userId is required for this scope" },
      { status: 400 }
    );
  }

  try {
    if (scope === "project" || scope === "mine-in-project") {
      const member = await db.selectFrom("project_members").select("user_id")
        .where("project_id", "=", projectId).where("user_id", "=", userId)
        .where("deleted_at", "is", null).executeTakeFirst();
      if (!member) return NextResponse.json({ error: "Project access required." }, { status: 403 });
    }
    const ownerUserId = scope !== "project" ? userId : null;

    let query = db
      .selectFrom("media_assets")
      .innerJoin("files", "files.file_id", "media_assets.original_file_id")
      .leftJoin("files as thumbnail", join => join.onRef("thumbnail.file_id", "=", "media_assets.thumbnail_file_id").on("thumbnail.deleted_at", "is", null))
      .select([
        "media_assets.media_asset_id",
        "media_assets.owner_user_id",
        "media_assets.is_marketed",
        "media_assets.trashed_at",
        "media_assets.name",
        "media_assets.type",
        "media_assets.width",
        "media_assets.height",
        "media_assets.duration_seconds",
        "files.path",
        "files.mime_type",
        "thumbnail.path as thumbnail_path",
        "thumbnail.mime_type as thumbnail_mime_type"
      ])
      .select(eb => eb.cast<number>(eb.fn("greatest", [
        eb.val(0),
        eb.fn("ceil", [eb(
          eb.fn<number>("date_part", [eb.val("epoch"), eb("media_assets.trashed_at", "-", uploadTrashCutoff())]),
          "/", eb.val(86400),
        )]),
      ]), "integer").as("days_remaining"))
      .where("media_assets.deleted_at", "is", null)
      .where("media_assets.trashed_at", scope === "deleted" ? "is not" : "is", null);

    if (scope === "deleted") query = query.where("media_assets.trashed_at", ">", uploadTrashCutoff());

    // "mine" is deliberately not scoped to the current project - it's every
    // asset this user has ever uploaded, so they can pull assets in from
    // other projects.
    if (scope !== "mine" && scope !== "deleted") {
      query = query.where("media_assets.project_id", "=", projectId);
    }

    if (ownerUserId !== null) {
      query = query.where("media_assets.owner_user_id", "=", ownerUserId);
    }

    const rows = await query.orderBy(scope === "deleted" ? "media_assets.trashed_at" : "media_assets.created_at", "desc").orderBy("media_assets.media_asset_id", "desc").execute();

    const uploads = rows.map((row) => ({
      id: row.media_asset_id,
      canDelete: row.owner_user_id === session.userId,
      isMarketed: row.is_marketed,
      daysRemaining: row.trashed_at ? row.days_remaining : undefined,
      fileName: row.name,
      type: row.type,
      url: buildPublicUrl(row.path),
      thumbnailUrl: row.type === "image" && row.thumbnail_mime_type?.startsWith("image/")
        && /^assets\/thumbnails\/(?:320|640)\//.test(row.thumbnail_path || "")
        ? buildPublicUrl(row.thumbnail_path!) : undefined,
      audioPreviewUrl: row.type === "audio" && row.thumbnail_mime_type?.startsWith("audio/")
        && row.thumbnail_path?.startsWith("assets/thumbnails/audio-30s/")
        ? buildPublicUrl(row.thumbnail_path) : undefined,
      videoPreviewUrl: row.type === "video" && row.thumbnail_mime_type === "video/mp4"
        && /^assets\/thumbnails\/video-5s-(?:320|480)\//.test(row.thumbnail_path || "")
        ? buildPublicUrl(row.thumbnail_path!) : undefined,
      details: {
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        duration: row.duration_seconds ?? undefined
      }
    }));

    return NextResponse.json({ uploads });
  } catch (error) {
    console.error("Error listing media assets:", error);
    return NextResponse.json(
      {
        error: "Failed to list media assets"
      },
      { status: 500 }
    );
  }
}
