// src/config/toast.ts
import React from 'react';
import toast, { type ToastOptions } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

/**
 * Base Tailwind classes for the toast
 * Using ! to override react-hot-toast inline defaults
 */
const baseClassName = "!flex !items-center !gap-3 !px-4 !py-3 !rounded-xl !shadow-xl border !text-sm !font-medium !transition-all !duration-300 !min-w-[320px]";

/**
 * Dynamic class generator for different toast types
 */
const getClassName = (type: 'success' | 'error' | 'loading' | 'custom'): string => {
  const themes = {
    success: '!bg-white dark:!bg-[#0f172a] !text-gray-900 dark:!text-white border-emerald-200 dark:border-emerald-500/30 border-l-4 !border-l-emerald-500',
    error: '!bg-white dark:!bg-[#0f172a] !text-gray-900 dark:!text-white border-red-200 dark:border-red-500/30 border-l-4 !border-l-red-500',
    loading: '!bg-white dark:!bg-[#0f172a] !text-gray-900 dark:!text-white border-blue-200 dark:border-blue-500/30 border-l-4 !border-l-blue-500',
    custom: '!bg-white dark:!bg-[#0f172a] !text-gray-900 dark:!text-white border-gray-200 dark:border-white/10'
  };
  return `${baseClassName} ${themes[type]}`;
};

export const toastConfig = {
  success: {
    duration: 4000,
    icon: React.createElement(CheckCircle, { className: "h-5 w-5 text-emerald-500 dark:text-emerald-400" }),
    className: getClassName('success'),
    style: { padding: '12px 16px', background: 'transparent' },
  },
  error: {
    duration: 5000,
    icon: React.createElement(XCircle, { className: "h-5 w-5 text-red-500 dark:text-red-400" }),
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
    duration: 3000,
    icon: React.createElement(Info, { className: "h-5 w-5 text-indigo-500 dark:text-indigo-400" }),
    className: getClassName('custom'),
    style: { padding: '12px 16px', background: 'transparent' },
  },
  style: undefined
};

// --- Helper Functions ---

export const showSuccessToast = (message: string) =>
  toast.success(message, toastConfig.success as ToastOptions);

export const showErrorToast = (message: string) =>
  toast.error(message, toastConfig.error as ToastOptions);

export const showLoadingToast = (message: string) =>
  toast.loading(message, toastConfig.loading as ToastOptions);

export const dismissToast = (id?: string) => toast.dismiss(id);