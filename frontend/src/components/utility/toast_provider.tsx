// src/components/ui/ToastProvider.tsx
import toast, { Toaster, resolveValue } from 'react-hot-toast';
import { Loader2, Info } from 'lucide-react';
import { SwipeToast } from '@/components/ui/SwipeToast';
import { ToastLottieIcon } from '@/components/utility/toast';

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: Infinity,
        success: { duration: Infinity },
        error: { duration: Infinity },
        loading: { duration: Infinity },
        blank: { duration: Infinity },
      }}
      containerStyle={{
        top: 84,
        right: 20,
      }}
    >
      {(t) => {
        const message = resolveValue(t.message, t);

        if (t.type === 'custom') {
          return <>{message}</>;
        }

        if (t.type === 'loading') {
          return (
            <SwipeToast
              open={t.visible}
              onClose={() => toast.dismiss(t.id)}
              fuse="none"
              duration={0}
              dismissible={false}
              icon={<Loader2 className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-spin" />}
              title={message}
              className="w-[356px] max-w-[calc(100vw-32px)] border-blue-200/80 dark:border-blue-500/20"
            />
          );
        }

        if (t.type === 'error') {
          const dur = typeof t.duration === 'number' && Number.isFinite(t.duration) && t.duration > 0 ? t.duration : 5000;
          return (
            <SwipeToast
              open={t.visible}
              onClose={() => toast.dismiss(t.id)}
              fuse="bottom"
              duration={dur}
              fuseColor="#f43f5e"
              icon={<ToastLottieIcon src="/icons/lottie/error.lottie" />}
              title={message}
              className="w-[356px] max-w-[calc(100vw-32px)] border-red-200/80 dark:border-red-500/20"
            />
          );
        }

        if (t.type === 'success') {
          const dur = typeof t.duration === 'number' && Number.isFinite(t.duration) && t.duration > 0 ? t.duration : 4000;
          return (
            <SwipeToast
              open={t.visible}
              onClose={() => toast.dismiss(t.id)}
              fuse="bottom"
              duration={dur}
              fuseColor="#10b981"
              icon={<ToastLottieIcon src="/icons/lottie/success.lottie" />}
              title={message}
              className="w-[356px] max-w-[calc(100vw-32px)] border-emerald-200/80 dark:border-emerald-500/20"
            />
          );
        }

        const blankDur = typeof t.duration === 'number' && Number.isFinite(t.duration) && t.duration > 0 ? t.duration : 4000;
        return (
          <SwipeToast
            open={t.visible}
            onClose={() => toast.dismiss(t.id)}
            fuse="bottom"
            duration={blankDur}
            fuseColor="#f5a524"
            icon={t.icon || <Info className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
            title={message}
            className="w-[356px] max-w-[calc(100vw-32px)]"
          />
        );
      }}
    </Toaster>
  );
};
