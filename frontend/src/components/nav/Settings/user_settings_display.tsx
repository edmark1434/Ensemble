import React from "react";
import useGlobalState from "@/lib/global_state";
import { Monitor, Moon, Sun, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export function UserSettingsDisplay() {
  const { theme, setTheme } = useGlobalState();

  const handleThemeChange = (newTheme: "light" | "dark") => {
    if (theme === newTheme) return;
    setTheme(newTheme);
    toast.success(`Theme updated to ${newTheme} mode!`, {
      icon: newTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />,
      style: {
        borderRadius: '10px',
        background: newTheme === "dark" ? '#1a1d2e' : '#fff',
        color: newTheme === "dark" ? '#fff' : '#1f2937',
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-white/10 pb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-500" />
          Display Settings
        </h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Customize how the application looks and feels on your device.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Theme Preference
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 mb-4">
            Choose between light mode or dark mode for the application interface.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Light Mode Card */}
            <div
              onClick={() => handleThemeChange("light")}
              className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
                theme === "light"
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-blue-300 dark:hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${theme === "light" ? "bg-blue-100 text-blue-600" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"}`}>
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${theme === "light" ? "text-blue-900" : "text-gray-900 dark:text-white"}`}>Light Mode</h4>
                    <p className={`text-xs mt-0.5 ${theme === "light" ? "text-blue-700" : "text-gray-500 dark:text-zinc-400"}`}>Clean and bright appearance</p>
                  </div>
                </div>
                {theme === "light" && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => handleThemeChange("dark")}
              className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
                theme === "dark"
                  ? "border-blue-500 bg-blue-500/10 shadow-md"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"}`}>
                    <Moon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${theme === "dark" ? "text-blue-100" : "text-gray-900 dark:text-white"}`}>Dark Mode</h4>
                    <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-blue-300" : "text-gray-500 dark:text-zinc-400"}`}>Easy on the eyes, darker tones</p>
                  </div>
                </div>
                {theme === "dark" && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
