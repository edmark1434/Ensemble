// app/editor/[id]/not-found.tsx

export default function ProjectNotFoundPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">Project not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This project doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
      </div>
    </div>
  );
}