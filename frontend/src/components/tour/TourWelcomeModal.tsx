import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Coins, UserCheck, Layers, Sparkles, X, ArrowRight } from 'lucide-react';
import { useTourStore, getActiveTourSteps, type UserPlatformRole } from '@/lib/tour_state';
import useGlobalState from '@/lib/global_state';

interface TourWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (role: UserPlatformRole) => void;
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "'Plus Jakarta Sans', sans-serif",
} as const;

const WALKTHROUGH_VIDEOS = [
  '/gallery_images/new/vids/vid_asset.mp4',
  '/gallery_images/new/vids/vid_captioning.mp4',
  '/gallery_images/new/vids/vid_collab.mp4',
  '/gallery_images/new/vids/vid_deadair.mp4',
  '/gallery_images/new/vids/vid_track.mp4',
  '/gallery_images/new/vids/vid_videochat.mp4',
];

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
      position: 'absolute',
      top: top ? -6 : undefined,
      bottom: bottom ? -6 : undefined,
      left: left ? -5 : undefined,
      right: right ? -5 : undefined,
      fontFamily: T.fontMono,
      fontSize: 12,
      lineHeight: 1,
      color,
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 5,
    }}
  >
    +
  </span>
);

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({ isOpen, onClose, onStart }) => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === 'dark';
  const user = useGlobalState((state) => state.user);
  const userRole = useTourStore((state) => state.userRole);
  const setRole = useTourStore((state) => state.setRole);

  const [currentVideo, setCurrentVideo] = useState(() => {
    const idx = Math.floor(Math.random() * WALKTHROUGH_VIDEOS.length);
    return WALKTHROUGH_VIDEOS[idx];
  });

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio('/sounds/minimalhover.mp3');
      hoverAudioRef.current.volume = 0.15;
    }
    if (!softClickAudioRef.current) {
      softClickAudioRef.current = new Audio('/sounds/softclick.mp3');
      softClickAudioRef.current.volume = 0.35;
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playClick = useCallback(() => {
    initAudio();
    if (softClickAudioRef.current) {
      softClickAudioRef.current.currentTime = 0;
      softClickAudioRef.current.play().catch(() => {});
    }
  }, []);

  const handleVideoEnded = () => {
    setCurrentVideo((prev) => {
      const candidates = WALKTHROUGH_VIDEOS.filter((v) => v !== prev);
      const nextIdx = Math.floor(Math.random() * candidates.length);
      return candidates[nextIdx] || WALKTHROUGH_VIDEOS[0];
    });
  };

  if (!isOpen) return null;

  const displayName = user?.display_name || user?.name || user?.username || 'Creator';

  // Normalize legacy 'explorer' to 'all'
  const activeRole: UserPlatformRole = userRole === 'explorer' ? 'all' : (userRole || 'all');

  const roleConfigs: Record<
    'all' | 'freelancer' | 'client' | 'creator',
    { code: string; label: string; icon: typeof Globe; desc: string; time: string }
  > = {
    all: {
      code: '01',
      label: 'Explore All',
      icon: Globe,
      desc: 'Experience the complete ecosystem: cloud video editor, job market, gigs, and creator asset library.',
      time: '~3 mins',
    },
    freelancer: {
      code: '02',
      label: 'Freelancer',
      icon: Coins,
      desc: 'Focus on finding editing jobs, submitting milestone proposals, and earning with platform escrow protection.',
      time: '~2 mins',
    },
    client: {
      code: '03',
      label: 'Client',
      icon: UserCheck,
      desc: 'Focus on posting video editing jobs, ordering vetted gig packages, and managing project milestones.',
      time: '~2 mins',
    },
    creator: {
      code: '04',
      label: 'Asset Creator',
      icon: Layers,
      desc: 'Upload video assets & templates to the marketplace, get moderator approval, and earn credits from downloads.',
      time: '~1 min',
    },
  };

  const currentConfig = roleConfigs[activeRole as keyof typeof roleConfigs] || roleConfigs.all;
  const currentStepCount = getActiveTourSteps(activeRole).length;
  const PERSPECTIVES: Array<'all' | 'freelancer' | 'client' | 'creator'> = ['all', 'freelancer', 'client', 'creator'];

  const panelBg = isDark ? 'rgba(18, 18, 20, 0.94)' : 'rgba(255, 255, 255, 0.96)';
  const subSurfaceBg = isDark ? 'rgba(24, 24, 28, 0.78)' : 'rgba(248, 250, 252, 0.88)';
  const borderLine = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.14)';
  const textPrimary = isDark ? '#ffffff' : '#09090b';
  const textSecondary = isDark ? '#d4d4d8' : '#27272a';
  const textMeta = isDark ? '#a1a1aa' : '#52525b';
  const crosshairColor = isDark ? 'rgba(255, 255, 255, 0.48)' : 'rgba(0, 0, 0, 0.45)';
  const accentColor = '#3b82f6';

  const HIGHLIGHTS = [
    'Profile & Verification',
    'Job Market & Proposals',
    'Gigs & Video Services',
    'Projects & Cloud Editor',
    'Deliveries & Escrow',
    'Credits, Inbox & Ask AI',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5"
          style={{ fontFamily: T.fontDisplay }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              playClick();
              onClose();
            }}
          />

        {/* Architectural Blueprint Modal Window */}
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 680,
            border: `1px solid ${borderLine}`,
            background: panelBg,
            color: textPrimary,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: isDark
              ? '0 28px 80px rgba(0, 0, 0, 0.75)'
              : '0 28px 80px rgba(0, 0, 0, 0.22)',
          }}
        >
          <Crosshair top left color={crosshairColor} />
          <Crosshair top right color={crosshairColor} />
          <Crosshair bottom left color={crosshairColor} />
          <Crosshair bottom right color={crosshairColor} />

          {/* Top Blueprint Navigation Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              borderBottom: `1px solid ${borderLine}`,
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: textMeta,
              }}
            >
              ENSEMBLE // ONBOARDING WALKTHROUGH
            </span>

            <button
              type="button"
              onClick={() => {
                playClick();
                onClose();
              }}
              onMouseEnter={playHover}
              title="Skip for now"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: `1px solid ${borderLine}`,
                padding: '4px 8px',
                color: textSecondary,
                fontFamily: T.fontMono,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <span>CLOSE</span>
              <X size={12} />
            </button>
          </div>

          {/* Architectural Hero Header Banner with Looping Feature Video */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: 'clamp(22px, 3.8vw, 34px) clamp(20px, 3.5vw, 32px)',
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <video
              key={currentVideo}
              src={currentVideo}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              onError={handleVideoEnded}
              poster="/gallery_images/new/gallery/collab.png"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isDark ? 0.85 : 0.82,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: isDark
                  ? 'linear-gradient(90deg, rgba(18, 18, 20, 0.90) 0%, rgba(18, 18, 20, 0.62) 52%, rgba(18, 18, 20, 0.16) 100%)'
                  : 'linear-gradient(90deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.65) 52%, rgba(255, 255, 255, 0.14) 100%)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <h2
                style={{
                  fontSize: 'clamp(22px, 3.2vw, 30px)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.12,
                  margin: '0 0 8px',
                  color: textPrimary,
                }}
              >
                Welcome to Ensemble, {displayName}!
              </h2>
              <p
                style={{
                  color: textSecondary,
                  fontSize: 13.5,
                  fontWeight: 500,
                  lineHeight: 1.55,
                  maxWidth: 520,
                  margin: 0,
                }}
              >
                Interactive guide to your workspace, tools, and escrow features.
              </p>
            </div>
          </div>

          {/* Perspective Track Selector Header Strip */}
          <div
            style={{
              padding: '12px clamp(18px, 3vw, 28px)',
              background: subSurfaceBg,
              borderBottom: `1px solid ${borderLine}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: textPrimary,
              }}
            >
              YOUR PLATFORM PERSPECTIVE
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: textMeta,
              }}
            >
              SWITCH ANYTIME
            </span>
          </div>

          {/* 4 Perspective Track Cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              borderBottom: `1px solid ${borderLine}`,
            }}
            className="max-sm:!grid-cols-2"
          >
            {PERSPECTIVES.map((r, idx) => {
              const cfg = roleConfigs[r];
              const Icon = cfg.icon;
              const isSelected = activeRole === r;
              const count = getActiveTourSteps(r).length;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    playClick();
                    setRole(r);
                  }}
                  onMouseEnter={playHover}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    borderRight: idx < PERSPECTIVES.length - 1 ? `1px solid ${borderLine}` : 'none',
                    borderBottom: isSelected ? `2px solid ${accentColor}` : 'none',
                    background: isSelected
                      ? isDark
                        ? 'rgba(59, 130, 246, 0.10)'
                        : 'rgba(59, 130, 246, 0.06)'
                      : 'transparent',
                    padding: '16px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                    transition: 'background 0.18s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: isSelected ? accentColor : textMeta,
                      }}
                    >
                      TRACK {cfg.code}
                    </span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        background: isSelected ? accentColor : 'transparent',
                        border: `1px solid ${isSelected ? accentColor : borderLine}`,
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: isSelected ? textPrimary : textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      <Icon size={14} color={isSelected ? accentColor : textMeta} />
                      <span>{cfg.label}</span>
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: textMeta,
                      }}
                    >
                      {count} STEPS
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Track Description & Duration Strip */}
          <div
            style={{
              padding: '16px clamp(18px, 3vw, 28px)',
              borderBottom: `1px solid ${borderLine}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: textSecondary,
                lineHeight: 1.55,
                margin: 0,
                flex: '1 1 320px',
              }}
            >
              {currentConfig.desc}
            </p>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                border: `1px solid ${borderLine}`,
                background: subSurfaceBg,
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: textPrimary,
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={12} color={accentColor} />
              <span>
                {currentConfig.time} • {currentStepCount} KEY STEPS
              </span>
            </span>
          </div>

          {/* Walkthrough Highlights Section */}
          <div
            style={{
              padding: '16px clamp(18px, 3vw, 28px)',
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <div
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: textMeta,
                marginBottom: 10,
              }}
            >
              WALKTHROUGH HIGHLIGHTS:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px 16px',
              }}
              className="max-sm:!grid-cols-1"
            >
              {HIGHLIGHTS.map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: textSecondary,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: accentColor,
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div
            style={{
              padding: '16px clamp(18px, 3vw, 28px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: subSurfaceBg,
            }}
          >
            <button
              type="button"
              onClick={() => {
                playClick();
                onClose();
              }}
              onMouseEnter={playHover}
              style={{
                background: 'transparent',
                border: `1px solid ${borderLine}`,
                padding: '12px 18px',
                fontFamily: T.fontMono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: textSecondary,
                cursor: 'pointer',
              }}
            >
              Skip (I know Ensemble)
            </button>

            <button
              type="button"
              onClick={() => {
                playClick();
                onClose();
                onStart(activeRole);
              }}
              onMouseEnter={playHover}
              style={{
                background: isDark ? '#ffffff' : '#09090b',
                color: isDark ? '#09090b' : '#ffffff',
                border: 'none',
                padding: '12px 22px',
                fontFamily: T.fontMono,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                transition: 'background 0.18s ease, color 0.18s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = accentColor;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = isDark ? '#ffffff' : '#09090b';
                e.currentTarget.style.color = isDark ? '#09090b' : '#ffffff';
              }}
            >
              <span>Start Walkthrough</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
