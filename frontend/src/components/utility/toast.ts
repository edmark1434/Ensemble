// src/config/toast.ts
import React from 'react';
import toast, { type ToastOptions } from 'react-hot-toast';
import { Loader2, Info } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { SwipeToast } from '@/components/ui/SwipeToast';

/**
 * Base Tailwind classes for the toast
 * Using ! to override react-hot-toast inline defaults
 */
const baseClassName = "!flex !items-center !gap-3 !px-4 !py-3 !rounded-xl !shadow-xl border !text-sm !font-medium !transition-all !duration-300 !min-w-[320px] !font-['Plus_Jakarta_Sans',sans-serif]";

/**
 * Dynamic class generator for different toast types
 */
const getClassName = (type: 'success' | 'error' | 'loading' | 'custom'): string => {
  const themes = {
    success: '!bg-white dark:!bg-[#27272a] !text-gray-900 dark:!text-white border-emerald-200 dark:border-emerald-500/30 border-l-4 !border-l-emerald-500',
    error: '!bg-white dark:!bg-[#27272a] !text-gray-900 dark:!text-white border-red-200 dark:border-red-500/30 border-l-4 !border-l-red-500',
    loading: '!bg-white dark:!bg-[#27272a] !text-gray-900 dark:!text-white border-blue-200 dark:border-blue-500/30 border-l-4 !border-l-blue-500',
    custom: '!bg-white dark:!bg-[#27272a] !text-gray-900 dark:!text-white border-gray-200 dark:border-white/10'
  };
  return `${baseClassName} ${themes[type]}`;
};

export const ToastLottieIcon = ({ src }: { src: string }) => {
  return React.createElement(
    'div',
    { className: "h-7 w-7 shrink-0 flex items-center justify-center -ml-1" },
    React.createElement(
      'div',
      { className: "scale-[1.3] w-full h-full flex items-center justify-center" },
      React.createElement(DotLottieReact, { src, autoplay: true, loop: false })
    )
  );
};

export const toastConfig = {
  success: {
    duration: 4000,
    icon: React.createElement(ToastLottieIcon, { src: "/icons/lottie/success.lottie" }),
    className: getClassName('success'),
    style: { padding: '12px 16px', background: 'transparent' },
  },
  error: {
    duration: 5000,
    icon: React.createElement(ToastLottieIcon, { src: "/icons/lottie/error.lottie" }),
    className: getClassName('error'),
    style: { padding: '12px 16px', background: 'transparent' },
  },
  loading: {
    duration: Infinity,
    icon: React.createElement(Loader2, { className: "h-5 w-5 text-blue-500 dark:text-blue-400 animate-spin" }),
    className: getClassName('loading'),
    style: { padding: '12px 16px', background: 'transparent' },
  },
  custom: {
    duration: 4000,
    icon: React.createElement(Info, { className: "h-5 w-5 text-amber-500 dark:text-amber-400" }),
    className: getClassName('custom'),
    style: { padding: '12px 16px', background: 'transparent' },
  },
  style: undefined
};

// --- Helper Functions ---

export const showSuccessToast = (message: string, options?: ToastOptions) =>
  toast.custom(
    (t) =>
      React.createElement(SwipeToast, {
        open: t.visible,
        onClose: () => toast.dismiss(t.id),
        duration: options?.duration ?? 4000,
        fuseColor: '#10b981',
        icon: React.createElement(ToastLottieIcon, { src: "/icons/lottie/success.lottie" }),
        title: message,
        className: 'w-[356px] max-w-[calc(100vw-32px)] border-emerald-200/80 dark:border-emerald-500/20',
      }),
    { ...options, duration: Infinity }
  );

export const showErrorToast = (message: string, options?: ToastOptions) =>
  toast.custom(
    (t) =>
      React.createElement(SwipeToast, {
        open: t.visible,
        onClose: () => toast.dismiss(t.id),
        duration: options?.duration ?? 5000,
        fuseColor: '#f43f5e',
        icon: React.createElement(ToastLottieIcon, { src: "/icons/lottie/error.lottie" }),
        title: message,
        className: 'w-[356px] max-w-[calc(100vw-32px)] border-red-200/80 dark:border-red-500/20',
      }),
    { ...options, duration: Infinity }
  );

export const showCustomToast = (message: string, description?: string, options?: ToastOptions) =>
  toast.custom(
    (t) =>
      React.createElement(SwipeToast, {
        open: t.visible,
        onClose: () => toast.dismiss(t.id),
        duration: options?.duration ?? 4000,
        fuseColor: '#f5a524',
        icon: React.createElement(Info, { className: "h-5 w-5 text-amber-500 dark:text-amber-400" }),
        title: message,
        description,
        className: 'w-[356px] max-w-[calc(100vw-32px)]',
      }),
    { ...options, duration: Infinity }
  );

export const showLoadingToast = (message: string) =>
  toast.loading(message, toastConfig.loading as ToastOptions);

export const dismissToast = (id?: string) => toast.dismiss(id);
