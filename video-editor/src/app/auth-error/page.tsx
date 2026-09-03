// app/auth-error/page.tsx

export default function AuthErrorPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">Auth error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session may have expired. Please return to the dashboard and try again.
        </p>
      </div>
    </div>
  );
}