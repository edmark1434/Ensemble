// app/editor/[id]/page.tsx

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Editor from "@/features/editor";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { createProject } from "@/lib/db/projects";
import { db } from "@/lib/db";
import { verifyProjectShareLink } from "@/lib/auth/project-share-link";
import { redeemProjectShareLink } from "@/lib/db/project-share-links";
import { recheckProject } from "@/lib/collab/access-recheck";

// Random/garbage segments (e.g. someone fat-fingering /editor/asdf) aren't
// valid uuid syntax, and postgres throws on that rather than just returning
// zero rows - so this has to be ruled out before it ever reaches the query.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ width?: string; height?: string; share?: string }>;
}) {
  const { id } = await params;
  const { width, height, share } = await searchParams;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    if (UUID_PATTERN.test(id)) {
      const url = new URL(`/projects/open/${id}`, process.env.MAIN_APP_URL || "http://localhost:5173");
      if (share) url.searchParams.set("share", share);
      redirect(url.toString());
    }
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

  if (share) {
    const link = await verifyProjectShareLink(share, id);
    if (!link || !(await redeemProjectShareLink(id, decoded.userId, link))) {
      return <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">This share link has expired or is no longer available. Ask the project owner for a new link.</div>;
    }
    void recheckProject(id);
    redirect(`/editor/${id}`);
  }

  const membership = await db
    .selectFrom("project_members")
    .innerJoin("projects", "projects.project_id", "project_members.project_id")
    .innerJoin("users", "users.user_id", "project_members.user_id")
    .where("project_members.project_id", "=", id)
    .where("project_members.user_id", "=", decoded.userId)
    .where("project_members.deleted_at", "is", null)
    .where("projects.deleted_at", "is", null)
    .where("projects.trashed_at", "is", null)
    .select([
      "project_members.role",
      "projects.name",
      "projects.width",
      "projects.height",
      "users.first_name",
    ])
    .executeTakeFirst();

  if (!membership) {
    notFound();
  }

  return (
    <Editor
      id={id}
      userId={decoded.userId}
      userName={membership.first_name}
      projectName={membership.name}
      width={membership.width}
      height={membership.height}
      role={membership.role}
    />
  );
}
