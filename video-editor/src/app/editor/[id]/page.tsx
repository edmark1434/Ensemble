// app/editor/[id]/page.tsx

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Editor from "@/features/editor";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { createProject } from "@/lib/db/projects";
import { db } from "@/lib/db";

// Random/garbage segments (e.g. someone fat-fingering /editor/asdf) aren't
// valid uuid syntax, and postgres throws on that rather than just returning
// zero rows - so this has to be ruled out before it ever reaches the query.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ width?: string; height?: string }>;
}) {
  const { id } = await params;
  const { width, height } = await searchParams;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    redirect("/auth-error");
    return;
  }

  if (id === "new") {
    const projectId = await createProject({
      userId: decoded.userId,
      width: Number(width) || 1920,
      height: Number(height) || 1080,
    });
    redirect(`/editor/${projectId}`);
    return;
  }

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const membership = await db
    .selectFrom("project_members")
    .innerJoin("projects", "projects.project_id", "project_members.project_id")
    .where("project_members.project_id", "=", id)
    .where("project_members.user_id", "=", decoded.userId)
    .where("project_members.deleted_at", "is", null)
    .select(["project_members.role", "projects.width", "projects.height"])
    .executeTakeFirst();

  if (!membership) {
    notFound();
  }

  return (
    <Editor
      id={id}
      userId={decoded.userId}
      width={membership.width}
      height={membership.height}
    />
  );
}