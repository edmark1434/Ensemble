import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import useGlobalState from "@/lib/global_state";

export type ThreeWayWorkflowMode = "jobs" | "gigs" | "contracts";

interface ThreeWayWorkflowModalProps {
  isOpen: boolean;
  mode: ThreeWayWorkflowMode;
  onClose: () => void;
  onPrev?: () => void;
}

const Crosshair: React.FC<{
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  color: string;
}> = ({ top, bottom, left, right, color }) => (
  <span
    aria-hidden="true"
    style={{
      position: "absolute",
      top: top ? -6 : undefined,
      bottom: bottom ? -6 : undefined,
      left: left ? -5 : undefined,
      right: right ? -5 : undefined,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 12,
      lineHeight: 1,
      color,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: 5,
    }}
  >
    +
  </span>
);

const WORKFLOW_CONFIG = {
  jobs: {
    eyebrow: "ENSEMBLE // JOBS 3-WAY WORKFLOW",
    title: "How Jobs Turn Into Contracts",
    subtitle: "Every job hire follows a 3-step proposal, escrow offer, and acceptance flow.",
    image: "/info/JOBS-3-WAY.png",
    imageAlt: "Jobs 3-way proposal to contract workflow",
    steps: [
      {
        code: "01",
        title: "Freelancer sends a proposal",
        badge: "Client notified",
        desc: "Freelancer submits a proposal with rate and milestones; the client is notified right away.",
      },
      {
        code: "02",
        title: "Client accepts & sends contract offer",
        badge: "Freelancer notified",
        desc: "Client locks funds into Escrow Hold and sends a Pending Signature offer, notifying the freelancer.",
      },
      {
        code: "03",
        title: "Freelancer accepts the offer",
        badge: "Contract active · Client notified",
        desc: "Contract activates immediately, the first milestone begins, and the client is notified.",
      },
    ],
  },
  gigs: {
    eyebrow: "ENSEMBLE // GIGS 3-WAY WORKFLOW",
    title: "How Service Orders Turn Into Contracts",
    subtitle: "Every service order follows a 3-step request, acceptance, and escrow funding flow.",
    image: "/info/GIGS-3-WAY.png",
    imageAlt: "Gigs 3-way order to contract workflow",
    steps: [
      {
        code: "01",
        title: "Client sends an order",
        badge: "Freelancer notified",
        desc: "Client picks a package tier and submits an order request; the freelancer receives a notification.",
      },
      {
        code: "02",
        title: "Freelancer accepts the order",
        badge: "Client notified",
        desc: "Order moves to Waiting status and the client gets a 24-hour window to confirm and fund escrow.",
      },
      {
        code: "03",
        title: "Client confirms & funds escrow",
        badge: "Contract active · Both notified",
        desc: "Escrow is funded, the contract immediately becomes Active, and both parties are notified.",
      },
    ],
  },
  contracts: {
    eyebrow: "ENSEMBLE // CONTRACT EXECUTION FLOW",
    title: "How Active Contracts Work",
    subtitle: "Once a contract is active, every milestone moves from Workspace delivery to Escrow release.",
    image: "/info/BUSINESS-LOGIC.png",
    imageAlt: "Contract Created to Workspace to Release workflow",
    steps: [
      {
        code: "01",
        title: "Contract Created",
        badge: "Active · First milestone live",
        desc: "The contract activates, the first milestone starts, and the contractual workspace is synced.",
      },
      {
        code: "02",
        title: "Workspace",
        badge: "Deliver & review",
        desc: "Freelancer submits milestone work in the workspace; client approves or requests a revision.",
      },
      {
        code: "03",
        title: "Release & Review",
        badge: "Escrow released · Rate & Review",
        desc: "Client approval releases escrow (freelancer payout + platform fee), completes the contract, and opens Rate & Review for both parties.",
      },
    ],
  },
} as const;

/**
 * Architectural Blueprint modal explaining the 3-way Jobs or Gigs contract workflow,
 * styled to match the Welcome Walkthrough modal.
 */
export const ThreeWayWorkflowModal: React.FC<ThreeWayWorkflowModalProps> = ({
  isOpen,
  mode,
  onClose,
  onPrev,
}) => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const config = WORKFLOW_CONFIG[mode];
  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(15, 23, 42, 0.14)";
  const panelBg = isDark ? "rgba(18, 18, 20, 0.98)" : "#ffffff";
  const subSurfaceBg = isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc";
  const textPrimary = isDark ? "#fafafa" : "#0f172a";
  const textSecondary = isDark ? "#d4d4d8" : "#334155";
  const textMeta = isDark ? "#a1a1aa" : "#475569";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(15, 23, 42, 0.35)";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Architectural Blueprint Modal Window */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] flex flex-col"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 720,
              border: `1px solid ${borderLine}`,
              background: panelBg,
              color: textPrimary,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: isDark
                ? "0 28px 80px rgba(0, 0, 0, 0.75)"
                : "0 28px 80px rgba(0, 0, 0, 0.22)",
            }}
          >
            <Crosshair top left color={crosshairColor} />
            <Crosshair top right color={crosshairColor} />
            <Crosshair bottom left color={crosshairColor} />
            <Crosshair bottom right color={crosshairColor} />

            {/* Top Blueprint Navigation Strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 20px",
                borderBottom: `1px solid ${borderLine}`,
                gap: 12,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: textMeta,
                }}
              >
                {config.eyebrow}
              </span>

              <button
                type="button"
                onClick={onClose}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: `1px solid ${borderLine}`,
                  padding: "4px 8px",
                  color: textSecondary,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <span>CLOSE</span>
                <X size={12} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto thin-scrollbar">
              {/* Edge-to-edge Visual Diagram */}
              <div
                style={{
                  borderBottom: `1px solid ${borderLine}`,
                  overflow: "hidden",
                  background: isDark ? "#0b0c10" : "#f1f5f9",
                }}
              >
                <img
                  src={config.image}
                  alt={config.imageAlt}
                  className="w-full h-[230px] sm:h-[270px] object-cover object-center block"
                />
              </div>

              {/* Title + Subtitle */}
              <div
                style={{
                  padding: "16px 20px 14px",
                  borderBottom: `1px solid ${borderLine}`,
                }}
              >
                <h2
                  style={{
                    fontSize: "clamp(18px, 2.5vw, 22px)",
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.2,
                    margin: "0 0 4px",
                    color: textPrimary,
                  }}
                >
                  {config.title}
                </h2>
                <p
                  style={{
                    color: textSecondary,
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {config.subtitle}
                </p>
              </div>

              {/* 3-Step Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3">
                {config.steps.map((step, idx) => (
                  <div
                    key={step.code}
                    style={{
                      padding: "16px 18px",
                      borderRight: idx < 2 ? `1px solid ${borderLine}` : undefined,
                      borderBottom: `1px solid ${borderLine}`,
                      background: subSurfaceBg,
                    }}
                  >
                    <div className="mb-2">
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          color: textMeta,
                        }}
                      >
                        STEP {step.code}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: textPrimary,
                        margin: "0 0 6px",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: textSecondary,
                        margin: "0 0 12px",
                      }}
                    >
                      {step.desc}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 text-[10.5px] font-semibold border bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-zinc-100 dark:border-white/20">
                      {step.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: textMeta,
                }}
              >
                Escrow-protected from start to milestone release
              </span>
              <div className="flex items-center gap-2">
                {onPrev && (
                  <button
                    type="button"
                    onClick={onPrev}
                    style={{
                      border: `1px solid ${borderLine}`,
                      color: textSecondary,
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-transparent hover:opacity-80 transition cursor-pointer"
                  >
                    Prev
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  {onPrev ? "Next" : "Got it"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
