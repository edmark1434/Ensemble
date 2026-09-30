"use client";

import { useEffect, useState } from "react";
import {Button} from "@/components/ui/button";

export function RedirectCountdown({
  url,
  seconds = 5
}: {
  url?: string;
  seconds?: number;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!url) return;

    if (remaining <= 0) {
      window.location.replace(url);
      return;
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, url]);

  if (!url) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">
        Redirecting you to main page in {Math.max(remaining, 0)}...
      </p>
      <Button
        size="sm"
        variant="default"
        onClick={() => window.location.replace(url)}
      >
        Go now
      </Button>
    </div>
  );
}