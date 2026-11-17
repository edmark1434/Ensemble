import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateTimePickerPopoverProps {
  value?: string | null;
  minDateTime?: string; // YYYY-MM-DDTHH:mm
  maxDateTime?: string; // YYYY-MM-DDTHH:mm
  onChange: (nextLocalDateTime: string) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
  disabled?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toLocalParts(val?: string | null): { date: string; hour24: number; minute: number } | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val) && !val.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(val)) {
    const [d, t] = val.slice(0, 16).split('T');
    const [hh, mm] = t.split(':').map(Number);
    return { date: d, hour24: hh, minute: mm };
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour24: d.getHours(),
    minute: d.getMinutes(),
  };
}

function makeDateTimeStr(date: string, hour24: number, minute: number): string {
  return `${date}T${pad(hour24)}:${pad(minute)}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DateTimePickerPopover: React.FC<DateTimePickerPopoverProps> = ({
  value,
  minDateTime,
  maxDateTime,
  onChange,
  children,
  align = 'right',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const initial = useMemo(() => {
    const parsed = toLocalParts(value);
    if (parsed) return parsed;
    const minParsed = toLocalParts(minDateTime);
    if (minParsed) return minParsed;
    const now = new Date(Date.now() + 5 * 60 * 1000);
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hour24: now.getHours(),
      minute: now.getMinutes(),
    };
  }, [value, minDateTime]);

  const [draftDate, setDraftDate] = useState(initial.date);
  const [draftHour24, setDraftHour24] = useState(initial.hour24);
  const [draftMinute, setDraftMinute] = useState(initial.minute);

  const [viewYear, setViewYear] = useState(() => Number(initial.date.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(initial.date.slice(5, 7)) - 1);

  useEffect(() => {
    if (!isOpen) return;
    setDraftDate(initial.date);
    setDraftHour24(initial.hour24);
    setDraftMinute(initial.minute);
    setViewYear(Number(initial.date.slice(0, 4)));
    setViewMonth(Number(initial.date.slice(5, 7)) - 1);
  }, [isOpen, initial]);

  const updatePosition = () => {
    const triggerEl = containerRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const popWidth = Math.min(372, window.innerWidth - 16);
    const popHeight = 315;

    let left = align === 'right' ? rect.right - popWidth : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - popWidth - 8));

    let top = rect.bottom + 8;
    if (top + popHeight > window.innerHeight - 8 && rect.top - popHeight - 8 >= 8) {
      top = rect.top - popHeight - 8;
    } else {
      top = Math.max(8, Math.min(top, window.innerHeight - popHeight - 8));
    }

    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onResizeOrScroll = () => updatePosition();
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [isOpen, align]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const minDatePart = minDateTime ? minDateTime.slice(0, 10) : undefined;
  const maxDatePart = maxDateTime ? maxDateTime.slice(0, 10) : undefined;

  const isDateDisabled = (dateStr: string) => {
    if (minDatePart && dateStr < minDatePart) return true;
    if (maxDatePart && dateStr > maxDatePart) return true;
    return false;
  };

  const isSlotAllowed = (dateStr: string, h24: number, min: number) => {
    const dt = makeDateTimeStr(dateStr, h24, min);
    if (minDateTime && dt < minDateTime) return false;
    if (maxDateTime && dt > maxDateTime) return false;
    return true;
  };

  const isHour12PeriodAllowed = (period: 'AM' | 'PM') => {
    const startH = period === 'AM' ? 0 : 12;
    const endH = period === 'AM' ? 11 : 23;
    for (let h = startH; h <= endH; h++) {
      const minStart = `${draftDate}T${pad(h)}:00`;
      const minEnd = `${draftDate}T${pad(h)}:59`;
      if (minDateTime && minEnd < minDateTime) continue;
      if (maxDateTime && minStart > maxDateTime) continue;
      return true;
    }
    return false;
  };

  const isHour12Allowed = (h12: number, period: 'AM' | 'PM') => {
    const h24 = period === 'AM' ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
    const minStart = `${draftDate}T${pad(h24)}:00`;
    const minEnd = `${draftDate}T${pad(h24)}:59`;
    if (minDateTime && minEnd < minDateTime) return false;
    if (maxDateTime && minStart > maxDateTime) return false;
    return true;
  };

  const currentPeriod: 'AM' | 'PM' = draftHour24 >= 12 ? 'PM' : 'AM';
  const currentHour12 = draftHour24 % 12 === 0 ? 12 : draftHour24 % 12;

  const clampDraftTime = (dateStr: string, h24: number, min: number) => {
    const dt = makeDateTimeStr(dateStr, h24, min);
    if (minDateTime && dt < minDateTime) {
      const p = toLocalParts(minDateTime);
      if (p) return { h24: p.hour24, min: p.minute };
    }
    if (maxDateTime && dt > maxDateTime) {
      const p = toLocalParts(maxDateTime);
      if (p) return { h24: p.hour24, min: p.minute };
    }
    return { h24, min };
  };

  const handleSelectDate = (dateStr: string) => {
    if (isDateDisabled(dateStr)) return;
    setDraftDate(dateStr);
    const clamped = clampDraftTime(dateStr, draftHour24, draftMinute);
    setDraftHour24(clamped.h24);
    setDraftMinute(clamped.min);
  };

  const handleSelectHour12 = (h12: number) => {
    if (!isHour12Allowed(h12, currentPeriod)) return;
    const nextH24 =
      currentPeriod === 'AM' ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
    const clamped = clampDraftTime(draftDate, nextH24, draftMinute);
    setDraftHour24(clamped.h24);
    setDraftMinute(clamped.min);
  };

  const handleSelectPeriod = (period: 'AM' | 'PM') => {
    if (!isHour12PeriodAllowed(period)) return;
    const nextH24 =
      period === 'AM'
        ? draftHour24 >= 12
          ? draftHour24 - 12
          : draftHour24
        : draftHour24 < 12
        ? draftHour24 + 12
        : draftHour24;
    const clamped = clampDraftTime(draftDate, nextH24, draftMinute);
    setDraftHour24(clamped.h24);
    setDraftMinute(clamped.min);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells: Array<number | null> = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const hours12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const canConfirm = isSlotAllowed(draftDate, draftHour24, draftMinute);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen((prev) => !prev);
        }}
      >
        {children}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] w-[340px] sm:w-[372px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-3 text-xs text-zinc-900 dark:text-zinc-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Select Date &amp; Time
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-3">
              {/* Calendar Grid */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs">
                    {MONTHS[viewMonth]} {viewYear}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMonth === 0) {
                          setViewMonth(11);
                          setViewYear((y) => y - 1);
                        } else {
                          setViewMonth((m) => m - 1);
                        }
                      }}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMonth === 11) {
                          setViewMonth(0);
                          setViewYear((y) => y + 1);
                        } else {
                          setViewMonth((m) => m + 1);
                        }
                      }}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-zinc-400 mb-1">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {calendarCells.map((day, idx) => {
                    if (!day) return <span key={`empty-${idx}`} />;
                    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                    const isDayDisabled = isDateDisabled(dateStr);
                    const isSelected = dateStr === draftDate;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isDayDisabled}
                        onClick={() => handleSelectDate(dateStr)}
                        className={`h-7 w-7 mx-auto rounded-md text-[11px] font-semibold transition flex items-center justify-center ${
                          isDayDisabled
                            ? 'opacity-25 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                            : isSelected
                            ? 'bg-blue-600 text-white cursor-pointer'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Picker Columns */}
              <div className="w-[132px] shrink-0 border-l border-zinc-100 dark:border-zinc-800 pl-2.5 flex gap-1">
                {/* Hours */}
                <div className="gs-listbox-scroll flex-1 max-h-[196px] overflow-y-auto space-y-0.5 pr-0.5">
                  {hours12.map((h12) => {
                    const allowed = isHour12Allowed(h12, currentPeriod);
                    const selected = currentHour12 === h12;
                    return (
                      <button
                        key={h12}
                        type="button"
                        disabled={!allowed}
                        onClick={() => handleSelectHour12(h12)}
                        className={`w-full py-1 rounded text-[11px] font-semibold transition ${
                          !allowed
                            ? 'opacity-25 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                            : selected
                            ? 'bg-blue-600 text-white cursor-pointer'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                        }`}
                      >
                        {pad(h12)}
                      </button>
                    );
                  })}
                </div>

                {/* Minutes */}
                <div className="gs-listbox-scroll flex-1 max-h-[196px] overflow-y-auto space-y-0.5 pr-0.5">
                  {minutes.map((m) => {
                    const allowed = isSlotAllowed(draftDate, draftHour24, m);
                    const selected = draftMinute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={!allowed}
                        onClick={() => allowed && setDraftMinute(m)}
                        className={`w-full py-1 rounded text-[11px] font-semibold transition ${
                          !allowed
                            ? 'opacity-25 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                            : selected
                            ? 'bg-blue-600 text-white cursor-pointer'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                        }`}
                      >
                        {pad(m)}
                      </button>
                    );
                  })}
                </div>

                {/* AM / PM */}
                <div className="w-9 shrink-0 space-y-1">
                  {(['AM', 'PM'] as const).map((period) => {
                    const allowed = isHour12PeriodAllowed(period);
                    const selected = currentPeriod === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        disabled={!allowed}
                        onClick={() => handleSelectPeriod(period)}
                        className={`w-full py-1.5 rounded text-[10px] font-bold transition ${
                          !allowed
                            ? 'opacity-25 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                            : selected
                            ? 'bg-blue-600 text-white cursor-pointer'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                        }`}
                      >
                        {period}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => {
                  onChange(makeDateTimeStr(draftDate, draftHour24, draftMinute));
                  setIsOpen(false);
                }}
                className="px-3 py-1 rounded-md text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Set Date &amp; Time
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
