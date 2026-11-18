import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Film, Paperclip, X } from 'lucide-react';
import { uploadFileWithIntent } from '@/lib/uploadFile';
import { chatAttachmentUrl } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import { showErrorToast } from '@/components/utility/toast';

/** Both ticket and dispute messages keep at most four attachments (backend normalizers). */
export const ATTACHMENT_LIMIT = 4;

const MB = 1024 * 1024;

/** Matches the `ticket-attachments` upload policy in `backend/services/FileServices.js`. */
const KIND_RULES = {
  image: { types: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], maxBytes: 8 * MB, label: 'Images' },
  pdf: { types: ['application/pdf'], maxBytes: 15 * MB, label: 'PDFs' },
  video: { types: ['video/mp4', 'video/webm', 'video/quicktime'], maxBytes: 50 * MB, label: 'Videos' },
} as const;

type AttachmentKind = keyof typeof KIND_RULES;

export const ATTACHMENT_ACCEPT = Object.values(KIND_RULES)
  .flatMap((rule) => rule.types)
  .join(',');

export const ATTACHMENT_HINT = 'Images up to 8 MB, PDFs up to 15 MB, videos up to 50 MB. Up to 4 files.';

export type ThreadAttachment = {
  attachment_id?: string;
  attachment_type?: string;
  attachment_key?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
};

export type PendingFile = {
  id: string;
  file: File;
  kind: AttachmentKind;
  previewUrl: string | null;
};

/** Accepted by both `normalizeTicketScreenshots` and `normalizeDisputeAttachments`. */
export type AttachmentPayload = {
  attachment_key: string;
  attachment_name: string;
  attachment_type: 'image' | 'video' | 'file';
  attachment_size: number;
};

function kindOf(file: File): AttachmentKind | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if ((KIND_RULES.image.types as readonly string[]).includes(type) || /\.(png|jpe?g|gif|webp)$/.test(name)) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if ((KIND_RULES.video.types as readonly string[]).includes(type) || /\.(mp4|webm|mov)$/.test(name)) return 'video';
  return null;
}

function formatBytes(bytes: number) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function uploadErrorMessage(err: unknown) {
  const response = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  const plain = err instanceof Error ? err.message : '';
  return response || plain || 'Could not upload that file.';
}

/** Files picked for a message, validated against the upload policy before they are sent. */
export function usePendingFiles() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const filesRef = useRef<PendingFile[]>([]);
  filesRef.current = files;

  const add = useCallback((list: FileList | File[] | null) => {
    const picked = Array.from(list || []);
    if (!picked.length) return;
    const next = [...filesRef.current];
    for (const file of picked) {
      if (next.length >= ATTACHMENT_LIMIT) {
        showErrorToast(`You can attach up to ${ATTACHMENT_LIMIT} files.`);
        break;
      }
      const kind = kindOf(file);
      if (!kind) {
        showErrorToast(`${file.name}: only images, PDFs and videos can be attached.`);
        continue;
      }
      if (file.size > KIND_RULES[kind].maxBytes) {
        showErrorToast(`${file.name} is larger than ${formatBytes(KIND_RULES[kind].maxBytes)}.`);
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind,
        previewUrl: kind === 'image' ? URL.createObjectURL(file) : null,
      });
    }
    setFiles(next);
  }, []);

  const remove = useCallback((id: string) => {
    setFiles((current) => {
      const gone = current.find((item) => item.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    filesRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
  }, []);

  /**
   * Empty the list and hand the files over without revoking their previews: a message that is
   * still sending shows them. The caller revokes them with `releasePendingFiles` when done.
   */
  const take = useCallback(() => {
    const taken = filesRef.current;
    filesRef.current = [];
    setFiles([]);
    return taken;
  }, []);

  useEffect(
    () => () => {
      filesRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    },
    []
  );

  return { files, add, remove, clear, take };
}

/** Free the previews of files taken with `take()`. */
export function releasePendingFiles(files: PendingFile[]) {
  files.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
}

/** Files of a message that is still sending: image previews from memory, names for the rest. */
export function SendingAttachments({ files }: { files: PendingFile[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap justify-end gap-2">
      {files.map((item) =>
        item.previewUrl ? (
          <img
            key={item.id}
            src={item.previewUrl}
            alt={item.file.name}
            className="max-h-48 max-w-[16rem] rounded-xl border border-gray-200 object-cover dark:border-white/10"
          />
        ) : (
          <span
            key={item.id}
            className="flex max-w-[16rem] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 dark:border-white/10 dark:bg-dark-elevated dark:text-zinc-200"
          >
            {item.kind === 'video' ? <Film className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
            <span className="truncate">{item.file.name}</span>
          </span>
        )
      )}
    </div>
  );
}

/** Uploads every pending file; throws with a readable message when one fails. */
export async function uploadPendingFiles(files: PendingFile[], folder: 'ticket-attachments' | 'chat-attachments') {
  const out: AttachmentPayload[] = [];
  for (const item of files) {
    try {
      const { key } = await uploadFileWithIntent(item.file, folder);
      out.push({
        attachment_key: key,
        attachment_name: item.file.name,
        attachment_type: item.kind === 'pdf' ? 'file' : item.kind,
        attachment_size: item.file.size,
      });
    } catch (err) {
      throw new Error(`${item.file.name}: ${uploadErrorMessage(err)}`);
    }
  }
  return out;
}

export function AttachButton({
  onPick,
  disabled,
  count,
  className = '',
}: {
  onPick: (files: FileList | null) => void;
  disabled?: boolean;
  count: number;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = count >= ATTACHMENT_LIMIT;
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || full}
        aria-label="Attach images or files"
        title={full ? `Up to ${ATTACHMENT_LIMIT} files` : 'Attach images or files'}
        className={`rounded-xl p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files);
          event.target.value = '';
        }}
      />
    </>
  );
}

export function PendingFileList({
  files,
  onRemove,
  disabled,
}: {
  files: PendingFile[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  if (!files.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((item) => (
        <li
          key={item.id}
          className="flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-white py-1.5 pl-1.5 pr-2 text-xs dark:border-white/10 dark:bg-dark-elevated"
        >
          {item.previewUrl ? (
            <img src={item.previewUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-400">
              {item.kind === 'video' ? <Film className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </span>
          )}
          <span className="min-w-0">
            <span className="block max-w-[10rem] truncate font-medium text-gray-800 dark:text-zinc-200">{item.file.name}</span>
            <span className="block text-[11px] text-gray-400 dark:text-zinc-500">{formatBytes(item.file.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={disabled}
            aria-label={`Remove ${item.file.name}`}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function attachmentKind(file: ThreadAttachment) {
  const hint = `${file.attachment_type || ''} ${file.attachment_name || ''}`.toLowerCase();
  if (hint.includes('video') || /\.(mp4|webm|mov|m4v)\b/.test(hint)) return 'video';
  if (hint.includes('image') || /\.(png|jpe?g|gif|webp|bmp|avif)\b/.test(hint)) return 'image';
  return 'file';
}

export function MessageAttachments({ attachments, own }: { attachments?: ThreadAttachment[]; own: boolean }) {
  if (!attachments?.length) return null;
  return (
    <div className={`mt-1.5 flex flex-wrap gap-2 ${own ? 'justify-end' : 'justify-start'}`}>
      {attachments.map((file, index) => {
        const src = chatAttachmentUrl(file.attachment_key || file.attachment_url || '');
        const name = file.attachment_name || 'Attachment';
        const key = file.attachment_id || `${src}-${index}`;
        if (!src) return null;
        const kind = attachmentKind(file);
        if (kind === 'image') {
          return (
            <a key={key} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
              <img src={src} alt={name} loading="lazy" className="max-h-48 max-w-[16rem] object-cover" />
            </a>
          );
        }
        if (kind === 'video') {
          return (
            <video key={key} src={src} controls preload="metadata" className="max-h-48 max-w-[16rem] rounded-xl border border-gray-200 dark:border-white/10" />
          );
        }
        return (
          <a
            key={key}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="flex max-w-[16rem] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 transition hover:bg-gray-50 dark:border-white/10 dark:bg-dark-elevated dark:text-zinc-200 dark:hover:bg-white/5"
          >
            <FileText className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="truncate">{name}</span>
          </a>
        );
      })}
    </div>
  );
}
