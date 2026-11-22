import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { resolveAvatarPath } from '@/lib/accountAvatars';
import { getSubscriptionIcon } from '@/components/ui/SubscriptionIcon';

/**
 * Pieces that make the staff forum desks look like the member forum: the same avatars, group
 * images, badges, image grid and post formatting members see, in the console's dark theme.
 */

export type ForumPersonLike = {
  name?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  subscriptionPlan?: string | null;
};

/** The member forum's default avatar, used when a member never set one. */
const DEFAULT_AVATAR = '/default-avatar.png';

/** A forum storage path (post image, group image) as a URL, like the member site builds it. */
export function forumMediaUrl(path?: string | null): string | null {
  if (!path || !path.trim()) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  const clean = path.replace(/^\/+/, '');
  return base ? `${base}/${clean}` : `/${clean}`;
}

function initials(label: string) {
  const parts = label.replace(/^@/, '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const AVATAR_SIZE = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const;

export function ForumAvatar({
  person,
  size = 'sm',
  className = '',
}: {
  person?: ForumPersonLike | null;
  size?: keyof typeof AVATAR_SIZE;
  className?: string;
}) {
  const src = resolveAvatarPath(person?.avatarUrl) || DEFAULT_AVATAR;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const label = person?.name || person?.handle || 'Member';
  if (failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={`${AVATAR_SIZE[size]} shrink-0 rounded-full object-cover ring-1 ring-white/15 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${AVATAR_SIZE[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-700 font-semibold text-zinc-200 ring-1 ring-white/10 ${className}`}
    >
      {initials(label)}
    </span>
  );
}

/** Verified tick and plan icon, as shown beside names on the member forum. */
export function PersonBadges({ person }: { person?: ForumPersonLike | null }) {
  if (!person) return null;
  return (
    <>
      {person.isVerified ? (
        <img
          src="/icons/verification/lvl2_verified.png"
          alt="Verified"
          title="Verified"
          className="h-3.5 w-3.5 shrink-0 object-contain"
        />
      ) : null}
      {person.subscriptionPlan ? (
        <img
          src={getSubscriptionIcon(person.subscriptionPlan)}
          alt={person.subscriptionPlan}
          title={`${person.subscriptionPlan} plan`}
          className="h-3.5 w-3.5 shrink-0 object-contain"
        />
      ) : null}
    </>
  );
}

/** Avatar, name, badges and handle in one line. */
export function PersonLine({
  person,
  size = 'sm',
  fallback = 'Unknown member',
  meta,
}: {
  person?: ForumPersonLike | null;
  size?: keyof typeof AVATAR_SIZE;
  fallback?: string;
  meta?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ForumAvatar person={person} size={size} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-medium text-zinc-100">{person?.name || fallback}</span>
          <PersonBadges person={person} />
        </span>
        {person?.handle || meta ? (
          <span className="block truncate text-[11px] text-zinc-500">
            {person?.handle ? `@${person.handle}` : null}
            {person?.handle && meta ? ' · ' : null}
            {meta}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Overlapping member avatars with a "+N" for the rest. */
export function AvatarStack({
  people,
  total,
  max = 5,
}: {
  people: ForumPersonLike[];
  total?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = Math.max(0, (total ?? people.length) - shown.length);
  if (!shown.length) return null;
  return (
    <span className="flex items-center">
      <span className="flex -space-x-1.5">
        {shown.map((person, i) => (
          <span key={`${person.handle || person.name || 'member'}-${i}`} title={person.name || undefined}>
            <ForumAvatar person={person} size="xs" className="ring-2 ring-[#14151c]" />
          </span>
        ))}
      </span>
      {rest > 0 ? <span className="ml-1.5 text-[10px] text-zinc-500">+{rest.toLocaleString()}</span> : null}
    </span>
  );
}

// Solid tints only: the console theme has no gradients.
const GROUP_TINTS = [
  'bg-violet-500/20 text-violet-200',
  'bg-sky-500/20 text-sky-200',
  'bg-emerald-500/20 text-emerald-200',
  'bg-amber-500/20 text-amber-200',
  'bg-rose-500/20 text-rose-200',
  'bg-indigo-500/20 text-indigo-200',
];

function tintFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GROUP_TINTS[hash % GROUP_TINTS.length];
}

/**
 * A group's picture: `banner` is the member group card's cover, `thumb` a square for lists.
 * Groups without a picture get a solid tint with their initials.
 */
export function GroupImage({
  name,
  imageUrl,
  variant = 'thumb',
  size = 'md',
  bannerHeight = 'h-24',
  circle = false,
  className = '',
}: {
  name: string;
  imageUrl?: string | null;
  variant?: 'thumb' | 'banner';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Height class for `banner`. */
  bannerHeight?: string;
  /** Round thumb (group chips) instead of a rounded square. */
  circle?: boolean;
  className?: string;
}) {
  const src = forumMediaUrl(imageUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const thumbSize = { xs: 'h-5 w-5 text-[8px]', sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-sm' }[size];
  const corners = circle ? 'rounded-full' : { xs: 'rounded', sm: 'rounded-lg', md: 'rounded-lg', lg: 'rounded-xl' }[size];
  const shape = variant === 'banner' ? `${bannerHeight} w-full` : `${thumbSize} ${corners} shrink-0`;
  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={`${shape} object-cover ${variant === 'thumb' ? 'ring-1 ring-white/10' : ''} ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${shape} inline-flex items-center justify-center font-semibold ${tintFor(name || 'Group')} ${className}`}
    >
      {variant === 'banner' ? <span className="text-2xl opacity-60">{initials(name || 'Group')}</span> : initials(name || 'Group')}
    </span>
  );
}

/** Full-screen image viewer with arrow-key paging. */
function ImageLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === 'ArrowRight') onIndex((index + 1) % images.length);
      else if (event.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
    };
    // Capture so Escape closes the viewer before the detail dialog underneath.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [images.length, index, onClose, onIndex]);

  const target = document.querySelector('.staff-console') || document.body;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <button type="button" aria-label="Close image" className="absolute inset-0 bg-black/85" onClick={onClose} />
      <img
        src={forumMediaUrl(images[index]) || undefined}
        alt={`Image ${index + 1} of ${images.length}`}
        className="relative max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => onIndex((index - 1 + images.length) % images.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => onIndex((index + 1) % images.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {index + 1} / {images.length}
          </p>
        </>
      ) : null}
    </div>,
    target
  );
}

/**
 * Post or comment images. `compact` is a row of small thumbnails for lists; otherwise a grid
 * like the member post. Clicking opens the viewer; clicks never reach the row underneath.
 */
export function ForumImageGrid({
  images,
  total,
  compact = false,
}: {
  images: string[];
  /** All images on the post, when `images` is only the first few. */
  total?: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const list = images.filter(Boolean);
  if (!list.length) return null;
  const extra = Math.max(0, (total ?? list.length) - list.length);

  const tile = (path: string, i: number, sizeClass: string, overlay = 0) => (
    <button
      key={`${path}-${i}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setOpen(i);
      }}
      className={`relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-white/25 ${sizeClass}`}
    >
      <img src={forumMediaUrl(path) || undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
      {overlay > 0 ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
          +{overlay}
        </span>
      ) : null}
    </button>
  );

  return (
    <>
      {compact ? (
        <div className="flex gap-1.5">
          {list.slice(0, 3).map((path, i) =>
            tile(path, i, 'h-14 w-14 shrink-0', i === 2 ? list.length - 3 + extra : 0)
          )}
        </div>
      ) : list.length === 1 ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(0);
            }}
            className="block w-full"
          >
            <img src={forumMediaUrl(list[0]) || undefined} alt="" className="max-h-[420px] w-full object-contain" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.slice(0, 6).map((path, i) =>
            tile(path, i, 'aspect-square w-full', i === 5 ? list.length - 6 + extra : 0)
          )}
        </div>
      )}
      {open != null ? (
        <ImageLightbox images={list} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}

/** Post formatting as members see it (Markdown + GFM, no raw HTML), in console colors. */
export function ForumMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words text-sm leading-relaxed text-zinc-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="text-lg font-bold text-white">{children}</h3>,
          h2: ({ children }) => <h4 className="text-base font-bold text-white">{children}</h4>,
          h3: ({ children }) => <h5 className="text-sm font-semibold text-white">{children}</h5>,
          p: ({ children }) => <p>{children}</p>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline hover:text-sky-200">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/20 pl-3 italic text-zinc-400">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[12px] text-zinc-200">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[12px]">{children}</pre>
          ),
          img: ({ src, alt }) => (
            <a href={typeof src === 'string' ? src : undefined} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">
              {alt || 'Embedded image'}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-white/10 px-2 py-1 font-semibold text-white">{children}</th>,
          td: ({ children }) => <td className="border border-white/10 px-2 py-1">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** "3h ago" in the member forum's wording. */
export function forumTimeAgo(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return '—';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
