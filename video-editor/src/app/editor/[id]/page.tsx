// app/editor/[id]/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Editor from "@/features/editor";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { createProject } from "@/lib/db/projects";
import { db } from "@/lib/db";

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

  const membership = await db
    .selectFrom("project_members")
    .innerJoin("projects", "projects.project_id", "project_members.project_id")
    .where("project_members.project_id", "=", id)
    .where("project_members.user_id", "=", decoded.userId)
    .where("project_members.deleted_at", "is", null)
    .select(["project_members.role", "projects.width", "projects.height"])
    .executeTakeFirst();

  if (!membership) {
    redirect("/auth-error");
    return;
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