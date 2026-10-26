import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Film,
  File,
  X,
  RefreshCw,
} from 'lucide-react';

export interface ProgressFileItem {
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

export type SubmissionStage =
  | 'preparing'
  | 'uploading'
  | 'verifying'
  | 'submitting'
  | 'completed'
  | 'error';

export interface SubmissionProgressModalState {
  isOpen: boolean;
  title: string;
  statusText: string;
  progress: number; // 0 to 100
  totalBytes: number;
  transferredBytes: number;
  files: ProgressFileItem[];
  stage: SubmissionStage;
  errorMessage?: string;
}

interface SubmissionProgressModalProps {
  state: SubmissionProgressModalState | null;
  onClose?: () => void;
  onRetry?: () => void;
}

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />;
  }
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) {
    return <Film className="w-4 h-4 text-purple-500 shrink-0" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  return <File className="w-4 h-4 text-zinc-400 shrink-0" />;
};

export const SubmissionProgressModal: React.FC<SubmissionProgressModalProps> = ({
  state,
  onClose,
  onRetry,
}) => {
  if (!state || !state.isOpen) return null;

  const {
    title,
    statusText,
    progress,
    totalBytes,
    transferredBytes,
    files = [],
    stage,
    errorMessage,
  } = state;

  const isCompleted = stage === 'completed';
  const isError = stage === 'error';
  const canClose = isCompleted || isError;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans'] select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#12141c] border border-zinc-200 dark:border-white/10 shadow-2xl p-6 overflow-hidden"
        >
          {/* Close button (only visible on error or completion) */}
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Top Status Icon & Header */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                  : isError
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 animate-scale-in" />
              ) : isError ? (
                <AlertTriangle className="w-6 h-6 animate-shake" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                    className="absolute -inset-1.5 rounded-full border-2 border-transparent border-t-zinc-900 dark:border-t-white opacity-40"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                {title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed truncate">
                {statusText}
              </p>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {isError
                  ? 'Error'
                  : isCompleted
                  ? 'Finished'
                  : `${Math.min(100, Math.max(0, Math.round(progress)))}%`}
              </span>
              {totalBytes > 0 && !isError && (
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {formatBytes(transferredBytes)} / {formatBytes(totalBytes)}
                </span>
              )}
            </div>

            {/* Track */}
            <div className="relative h-2.5 w-full rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/5 overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-all duration-150 ${
                  isError
                    ? 'bg-rose-500'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-zinc-900 dark:bg-white'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>

          {/* Error Message Box */}
          {isError && errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* File Upload List (if files exist) */}
          {files.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <span>Attachments ({files.length})</span>
                <span>
                  {files.filter((f) => f.status === 'completed').length} / {files.length} Done
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {files.map((file, idx) => {
                  const isFileDone = file.status === 'completed';
                  const isFileUploading = file.status === 'uploading';
                  const isFileError = file.status === 'error';

                  return (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {getFileIcon(file.name)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                            {file.name}
                          </p>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isFileDone && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>100%</span>
                          </span>
                        )}

                        {isFileUploading && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                            <RefreshCw className="w-3 h-3 animate-spin text-zinc-500" />
                            <span>{file.progress}%</span>
                          </span>
                        )}

                        {isFileError && (
                          <span className="text-[11px] font-bold text-rose-500">Failed</span>
                        )}

                        {file.status === 'pending' && (
                          <span className="text-[11px] text-zinc-400 font-mono">Queued</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons on Error or Completion */}
          {canClose && (
            <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
              {isError && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition shadow-xs"
                >
                  Try Again
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 transition"
                >
                  {isError ? 'Dismiss' : 'Close'}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
