import { useNavigation } from "react-router-dom";

const LoadingOverlay = () => {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-sm text-white">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;