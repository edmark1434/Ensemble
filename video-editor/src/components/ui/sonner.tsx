"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";
import { CircleCheck, CircleAlert, Info, TriangleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./sonner.module.css";

const Toaster = ({ className, style, icons, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      {...props}
      theme={theme as ToasterProps["theme"]}
      richColors={false}
      className={cn("toaster group", styles.toaster, className)}
      icons={{
        ...icons,
        success: <CircleCheck />,
        error: <CircleAlert />,
        info: <Info />,
        warning: <TriangleAlert />,
        loading: <Loader2 className="animate-spin" />,
      }}
      style={
        {
          ...style,
          fontFamily: "var(--font-plus-jakarta-sans), sans-serif",
          "--normal-bg": "var(--primary)",
          "--normal-text": "var(--primary-foreground)",
          "--normal-border": "var(--primary)"
        } as React.CSSProperties
      }
    />
  );
};

export { Toaster };
