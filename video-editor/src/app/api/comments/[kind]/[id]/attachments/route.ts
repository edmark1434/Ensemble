// app/api/comments/[kind]/[id]/attachments/route.ts
// POST multipart (file=<image>): uploads to S3, inserts a `files` row, returns
// { id, url, name, mimeType }. The client then sends that id in `fileIds` when it
// POSTs the comment/reply to app/api/comments/[kind]/[id]/route.ts.
// [kind] is "projects" or "blocks".

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { buildPublicUrl, buildS3Key, uploadBufferToS3 } from "@/lib/s3";
import { getCommentRole } from "@/lib/db/comments";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { COMMENT_MAX_IMAGE_BYTES } from "@/features/editor/constants/comment-limits";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = COMMENT_MAX_IMAGE_BYTES;

type Ctx = { params: Promise<{ kind: string; id: string }> };

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

// Trust the bytes, not the client-declared type.
function sniffImage(b: Buffer): { mime: string; ext: string } | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", ext: "png" };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (b.length >= 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii"))) {
    return { mime: "image/gif", ext: "gif" };
  }
  if (
    b.length >= 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

async function authorize(ctx: Ctx) {
  const { kind, id } = await ctx.params;
  if ((kind !== "projects" && kind !== "blocks") || !UUID.test(id)) {
    return { error: fail("bad request", 400) };
  }

  const sessionCookie = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return { error: fail("unauthorized", 401) };

  const target: CollabTarget = { kind: kind === "projects" ? "project" : "block", id };
  const role = await getCommentRole(target, decoded.userId);
  if (!role) return { error: fail("forbidden", 403) };

  return { target, role, userId: decoded.userId as string };
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;
  if (a.role === "Viewer") return fail("forbidden", 403);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("bad request", 400);
  if (file.size > MAX_BYTES) return fail("file too large", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sniffImage(buffer);
  if (!image) return fail("unsupported file type", 415);

  // same key layout as the media uploads, but no media_assets row, so these
  // never show up in the user's uploads library
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_").slice(0, 80) || "image";
  const path = buildS3Key(a.userId, nanoid(), `${base}.${image.ext}`);
  await uploadBufferToS3(path, buffer, image.mime);

  const row = await db
    .insertInto("files")
    .values({
      name: file.name.slice(0, 200) || `image.${image.ext}`,
      path,
      mime_type: image.mime,
      size_bytes: buffer.byteLength,
    })
    .returning("file_id")
    .executeTakeFirstOrThrow();

  return NextResponse.json({
    id: row.file_id,
    url: buildPublicUrl(path),
    name: file.name,
    mimeType: image.mime,
  });
}