// app/api/collab/projects/[id]/updates/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { db } from "@/lib/db";

const COMPACT_AFTER_UPDATE_COUNT = 200;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = Number(request.nextUrl.searchParams.get("sessionId"));
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
  }

  const { id: projectId } = await params;

  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "empty update body" }, { status: 400 });
  }

  try {
    await db.transaction().execute(async (trx) => {
      const activity = await trx
        .insertInto("session_activities")
        .values({ session_id: sessionId, type: "edit" })
        .returning(["session_activity_id"])
        .executeTakeFirstOrThrow();

      const update = await trx
        .insertInto("yjs_updates")
        .values({ session_activity_id: activity.session_activity_id, update: buf })
        .returning(["yjs_update_id"])
        .executeTakeFirstOrThrow();

      await trx
        .insertInto("project_yjs_updates")
        .values({ yjs_update_id: update.yjs_update_id, project_id: projectId })
        .execute();
    });
  } catch (error) {
    console.error("[updates POST] failed", error);
    const isMissingRef = (error as { code?: string })?.code === "23503";
    return NextResponse.json(
      { error: isMissingRef ? "project or session not found" : "internal error" },
      { status: isMissingRef ? 404 : 500 }
    );
  }

  const { count } = await db
    .selectFrom("project_yjs_updates")
    .where("project_id", "=", projectId)
    .select(db.fn.countAll().as("count"))
    .executeTakeFirstOrThrow();

  if (Number(count) >= COMPACT_AFTER_UPDATE_COUNT) {
    await compactProject(projectId);
  }

  return NextResponse.json({ ok: true });
}

async function compactProject(projectId: string) {
  const snapshotRow = await db
    .selectFrom("project_yjs_snapshots")
    .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "project_yjs_snapshots.yjs_snapshot_id")
    .where("project_yjs_snapshots.project_id", "=", projectId)
    .orderBy("yjs_snapshots.created_at", "desc")
    .select(["yjs_snapshots.document"])
    .executeTakeFirst();

  const updateRows = await db
    .selectFrom("project_yjs_updates")
    .innerJoin("yjs_updates", "yjs_updates.yjs_update_id", "project_yjs_updates.yjs_update_id")
    .where("project_yjs_updates.project_id", "=", projectId)
    .orderBy("yjs_updates.created_at", "asc")
    .select(["yjs_updates.update", "project_yjs_updates.yjs_update_id"])
    .execute();

  const doc = new Y.Doc({ gc: false });
  if (snapshotRow) Y.applyUpdate(doc, snapshotRow.document);
  for (const row of updateRows) Y.applyUpdate(doc, row.update);

  const compacted = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();

  await db.transaction().execute(async (trx) => {
    const newSnapshot = await trx
      .insertInto("yjs_snapshots")
      .values({ document: compacted })
      .returning(["yjs_snapshot_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("project_yjs_snapshots")
      .values({ yjs_snapshot_id: newSnapshot.yjs_snapshot_id, project_id: projectId })
      .execute();

    const idsToTrim = updateRows.map((r) => r.yjs_update_id);
    if (idsToTrim.length) {
      await trx.deleteFrom("project_yjs_updates").where("yjs_update_id", "in", idsToTrim).execute();
      await trx.deleteFrom("yjs_updates").where("yjs_update_id", "in", idsToTrim).execute();
    }
  });
}