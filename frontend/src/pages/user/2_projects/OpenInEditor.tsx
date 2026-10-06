import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios.ts";

const OpenInEditor: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const EDITOR_URL = import.meta.env.VITE_EDITOR_URL || 'http://localhost:3000';

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/editor/handoff-token');
        const params = new URLSearchParams({ token: data.handoffToken });
        window.location.replace(`${EDITOR_URL}/editor/${projectId}?${params}`);
      } catch {
        navigate('/projects?error=could_not_open_project');
      }
    })();
  }, [projectId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-dark-base">
      <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-zinc-400" />
      <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Opening project...</p>
    </div>
  );
};

export default OpenInEditor;