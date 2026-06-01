// src/components/ui/ToastProvider.tsx
import { Toaster } from 'react-hot-toast';
import { toastConfig } from "@/components/utility/toast.ts";

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: toastConfig.style,
        success: toastConfig.success,
        error: toastConfig.error,
        loading: toastConfig.loading,
      }}
      containerStyle={{
        top: '50%',
        right: 20,
        transform: 'translateY(-80%)',
      }}
    />
  );
};