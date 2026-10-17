import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import ShapeGrid from '@/components/ui/ShapeGrid';
import useGlobalState from '@/lib/global_state';

export interface SetupStep {
  number: number;
  title: string;
  description: string;
}

export const SETUP_STEPS: SetupStep[] = [
  {
    number: 1,
    title: 'Profile Picture',
    description: 'Choose presets or upload photo.',
  },
  {
    number: 2,
    title: 'About You',
    description: 'Discovery source & work background.',
  },
  {
    number: 3,
    title: 'Platform Purpose',
    description: "Tell us what you plan to do on Ensemble.",
  },
];

export interface SetupLayoutProps {
  currentStep: 1 | 2 | 3;
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  onStepClick?: (step: 1 | 2 | 3) => void;
}

export const SetupLayout: React.FC<SetupLayoutProps> = ({
  currentStep,
  children,
  theme: propTheme,
  onStepClick,
}) => {
  const storeTheme = useGlobalState((state) => state.theme);
  const searchTheme = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('theme') as 'light' | 'dark' | null;
  }, []);

  const theme = propTheme || searchTheme || storeTheme || 'dark';
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-white' : 'bg-[#f8fafc] text-zinc-900'
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      {/* Background Interactive ShapeGrid Canvas */}
      <div className="absolute inset-0 pointer-events-auto z-0">
        <ShapeGrid
          direction="diagonal"
          speed={0.3}
          borderColor={isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)'}
          squareSize={45}
          hoverFillColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}
          hoverTrailAmount={4}
          shape="square"
        />
      </div>

      {/* Main Split Layout Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row items-stretch gap-6 lg:gap-8 my-auto">
        {/* Left Column: Vertical Stepper Sidebar */}
        <aside
          className={`w-full md:w-72 lg:w-80 shrink-0 flex flex-col justify-between rounded-2xl p-6 sm:p-8 border transition-all duration-200 ${
            isDark
              ? 'bg-[#18181b]/90 border-zinc-800 shadow-[0_24px_70px_rgba(0,0,0,0.65)]'
              : 'bg-white/95 border-zinc-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'
          } backdrop-blur-xl`}
        >
          <div>
            {/* Logo & Header */}
            <div className="flex items-center gap-3 mb-8 sm:mb-10">
              <img
                src="/icons/ensemble_logo.png"
                alt="Ensemble Logo"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div>
                <h1 className={`font-bold text-base tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Ensemble
                </h1>
                <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Account Setup
                </p>
              </div>
            </div>

            {/* Desktop Vertical Stepper Navigation (hidden on mobile) */}
            <div className="hidden md:block space-y-1">
              {SETUP_STEPS.map((step, idx) => {
                const isCompleted = step.number < currentStep;
                const isActive = step.number === currentStep;
                const isUpcoming = step.number > currentStep;
                const isLast = idx === SETUP_STEPS.length - 1;
                const isClickable = isCompleted && Boolean(onStepClick);

                return (
                  <div key={step.number} className="relative">
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && onStepClick?.(step.number as 1 | 2 | 3)}
                      className={`w-full flex items-start gap-3.5 text-left transition-all duration-200 rounded-xl p-2 -ml-2 ${
                        isClickable ? 'cursor-pointer hover:bg-zinc-500/10' : 'cursor-default'
                      }`}
                    >
                      {/* Step Circle & Connecting Rail */}
                      <div className="relative flex flex-col items-center shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                            isActive
                              ? isDark
                                ? 'bg-white text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.25)] ring-4 ring-white/10'
                                : 'bg-zinc-900 text-white shadow-md ring-4 ring-zinc-900/10'
                              : isCompleted
                              ? isDark
                                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                              : isDark
                              ? 'bg-[#18181b] border border-zinc-700/60 text-zinc-500'
                              : 'bg-zinc-50 border border-zinc-300 text-zinc-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[2.5] animate-in zoom-in-75 duration-200" />
                          ) : (
                            step.number
                          )}
                        </div>

                        {/* Connecting Line to next step */}
                        {!isLast && (
                          <div
                            className={`w-[2px] h-10 my-1 transition-colors duration-300 ${
                              isCompleted
                                ? isDark
                                  ? 'bg-zinc-700'
                                  : 'bg-zinc-300'
                                : isDark
                                ? 'bg-zinc-800/80'
                                : 'bg-zinc-200'
                            }`}
                          />
                        )}
                      </div>

                      {/* Step Titles */}
                      <div className="pt-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold transition-colors duration-200 ${
                              isActive
                                ? isDark
                                  ? 'text-white font-bold'
                                  : 'text-zinc-950 font-bold'
                                : isCompleted
                                ? isDark
                                  ? 'text-zinc-300'
                                  : 'text-zinc-700'
                                : isDark
                                ? 'text-zinc-500'
                                : 'text-zinc-400'
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-0.5 leading-relaxed transition-colors duration-200 ${
                            isActive
                              ? isDark
                                ? 'text-zinc-400'
                                : 'text-zinc-500'
                              : isCompleted
                              ? isDark
                                ? 'text-zinc-500'
                                : 'text-zinc-500'
                              : isDark
                              ? 'text-zinc-600'
                              : 'text-zinc-400'
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Mobile Horizontal Stepper Navigation (hidden on desktop) */}
            <div className="flex md:hidden items-center justify-between gap-2">
              {SETUP_STEPS.map((step, idx) => {
                const isCompleted = step.number < currentStep;
                const isActive = step.number === currentStep;
                const isLast = idx === SETUP_STEPS.length - 1;

                const isClickable = isCompleted && Boolean(onStepClick);

                return (
                  <React.Fragment key={step.number}>
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && onStepClick?.(step.number as 1 | 2 | 3)}
                      className={`flex items-center gap-2 min-w-0 text-left transition-opacity duration-200 ${
                        isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                          isActive
                            ? isDark
                              ? 'bg-white text-zinc-950 shadow-sm ring-2 ring-white/20'
                              : 'bg-zinc-900 text-white shadow-sm ring-2 ring-zinc-900/10'
                            : isCompleted
                            ? isDark
                              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                              : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                            : isDark
                            ? 'bg-[#18181b] border border-zinc-700/60 text-zinc-500'
                            : 'bg-zinc-50 border border-zinc-300 text-zinc-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5] animate-in zoom-in-75 duration-200" /> : step.number}
                      </div>
                      <span
                        className={`text-xs truncate hidden min-[360px]:inline-block ${
                          isActive
                            ? isDark
                              ? 'text-white font-bold'
                              : 'text-zinc-950 font-bold'
                            : isCompleted
                            ? isDark
                              ? 'text-zinc-300'
                              : 'text-zinc-600'
                            : 'text-zinc-500'
                        }`}
                      >
                        {step.title.split(' ')[0]}
                      </span>
                    </button>

                    {!isLast && (
                      <div
                        className={`flex-1 h-[2px] mx-1 transition-colors duration-300 ${
                          isCompleted
                            ? isDark
                              ? 'bg-zinc-700'
                              : 'bg-zinc-300'
                            : isDark
                            ? 'bg-zinc-800'
                            : 'bg-zinc-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Bottom Footer Information */}
          <div className="hidden md:block pt-8 border-t border-zinc-200/50 dark:border-zinc-800/80 mt-6 text-[11px] text-zinc-400 dark:text-zinc-500">
            <p>Step {currentStep} of {SETUP_STEPS.length}</p>
          </div>
        </aside>

        {/* Right Column: Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col justify-center">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SetupLayout;
