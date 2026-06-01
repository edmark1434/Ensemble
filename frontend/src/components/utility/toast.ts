// src/config/toast.ts
import React from 'react';
import toast, {type ToastOptions } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

/**
 * Base styles for the glassmorphism effect
 */
const baseStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0d0f1a 0%, #0a0c14 100%)',
  color: '#ffffff',
  border: '1px solid rgba(74, 111, 165, 0.3)',
  borderRadius: '12px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '14px',
  textAlign: 'left',
  fontWeight: '500',
  padding: '14px 20px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(12px)',
  minWidth: '320px',
};

/**
 * Dynamic style generator to merge base styles with type-specific gradients
 */
const getStyle = (accentColor: string, accentRgba: string): React.CSSProperties => ({
  ...baseStyle,
  borderLeft: `4px solid ${accentColor}`,
  background: `linear-gradient(135deg, ${accentRgba} 0%, #0d0f1a 100%)`,
});

export const toastConfig = {
  success: {
    duration: 4000,
    icon: React.createElement(CheckCircle, { className: "h-5 w-5 text-emerald-400" }),
    style: getStyle('#10b981', 'rgba(16, 185, 129, 0.15)'),
  },
  error: {
    duration: 5000,
    icon: React.createElement(XCircle, { className: "h-5 w-5 text-red-400" }),
    style: getStyle('#ef4444', 'rgba(239, 68, 68, 0.15)'),
  },
  loading: {
    duration: Infinity, // Loading usually stays until manual dismissal/promise resolution
    icon: React.createElement(Loader2, { className: "h-5 w-5 text-blue-400 animate-spin" }),
    style: getStyle('#3b82f6', 'rgba(59, 130, 246, 0.15)'),
  },
  custom: {
    duration: 3000,
    icon: React.createElement(Info, { className: "h-5 w-5 text-indigo-400" }),
    style: baseStyle,
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