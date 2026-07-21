import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { STAFF_LOGIN_PATH } from "@/lib/staffRoutes";

/** Sign-out button for staff portals. Ends the session and returns to the staff login page. */
export default function LogoutButton({ loginPath = STAFF_LOGIN_PATH }: { loginPath?: string }) {
  const { clearUser } = useGlobalState();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.get("/api/users/logout");
    } catch {
      // Still clear the local session if the request fails.
    }
    clearUser();
    navigate(loginPath, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-200"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}
