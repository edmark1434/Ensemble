import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, CreditCard, HelpCircle, FileText, ArrowLeft, AlertCircle,  Ticket, Monitor, Wallet } from "lucide-react";

import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Modals
import ProfileEditModal from "@/pages/user/7_profile/Edits/ProfileEditModal";
import AvatarEditModal from "@/pages/user/7_profile/Edits/AvatarEditModal";

// Modular Tab Components
import { UserSettingsAccountDetails } from "./user_settings_accountdetails";
import { UserSettingsSubscriptionDetails } from "./user_settings_subscriptiondetails";
import { UserSettingsHelp } from "./user_settings_help";
import { UserSettingsLegalPolicies } from "./user_settings_legalpolicies";
import { UserSettingsDisplay } from "./user_settings_display";
import PageSubmitATicket from '@/pages/landing/pages/page_SubmitATicket';
import { UserSettingsWallet } from "./user_settings_wallet";
type TabType = "account" | "wallet" | "subscription" | "help" | "legal" | "ticket" | "display";

interface Preset {
  file_id: number;
  path: string;
  name: string;
}

export default function UserSettings() {
  const navigate = useNavigate();
  const globalUser = useGlobalState((state) => state.user);

  const [activeTab, setActiveTab] = useState<TabType>("display");
  const [loading, setLoading] = useState(true);

  // Unsaved changes state
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Stored original baseline to track unsaved edits
  const [initialValues, setInitialValues] = useState({
    username: "",
    address: "",
    email: "",
  });

  const [avatarPresets, setAvatarPresets] = useState<Preset[]>([]);
  const [profileData, setProfileData] = useState<any>({});

  const [subscription, setSubscription] = useState<{
    plan_name: string;
    status: string;
    renews_at?: string;
    cancel_at_period_end?: boolean;
  }>({
    plan_name: "Free Member",
    status: "Active",
  });
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);

  const constructAvatarUrl = (path: string | undefined): string => {
    if (!path) return "https://i.pravatar.cc/150?u=user";
    if (path.startsWith("http")) return path;
    const cloudfront = import.meta.env.VITE_CLOUDFRONT_URL;
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return `${cloudfront}/${cleanPath}`;
  };

  const fetchAvatarPresets = async () => {
    try {
      const presetsResponse = await api.get("/api/files/profile-presets");
      setAvatarPresets(presetsResponse.data.files || []);
    } catch (error) {
      console.error("Error fetching presets:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const accountId = globalUser?.account_id;

      if (accountId) {
        const [profileRes, subRes] = await Promise.all([
          api.get(`/api/accounts/profile/${accountId}`),
          api.get(`/api/subscription/plan-details`).catch(() => null),
        ]);

        const rawProfile = profileRes.data.data || profileRes.data.profile || {};
        setProfileData(rawProfile);

        setFullName(rawProfile.name || globalUser?.display_name || "User");
        setBirthdate(
          rawProfile.birthdate || rawProfile.birth_date
            ? new Date(rawProfile.birthdate || rawProfile.birth_date).toLocaleDateString()
            : "Not Specified"
        );

        const fetchedUsername = rawProfile.username || rawProfile.handle || globalUser?.username || "";
        const fetchedAddress = rawProfile.location || rawProfile.address || "";
        const fetchedEmail = rawProfile.email_address || rawProfile.email || globalUser?.email || "";

        setUsername(fetchedUsername);
        setAddress(fetchedAddress);
        setEmail(fetchedEmail);

        setInitialValues({
          username: fetchedUsername,
          address: fetchedAddress,
          email: fetchedEmail,
        });

        setIsDirty(false);

        let avatar = rawProfile.avatar_preset_url || rawProfile.avatar_url;
        setAvatarUrl(constructAvatarUrl(avatar));

        if (subRes?.data?.planDetails) {
          setSubscription({
            plan_name: subRes.data.planDetails.plan_name || "Free Member",
            status: subRes.data.planDetails.status || "Active",
            renews_at: subRes.data.planDetails.renews_at,
            cancel_at_period_end: Boolean(subRes.data.planDetails.cancel_at_period_end),
          });
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAvatarPresets();
  }, [globalUser]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const executeWithUnsavedCheck = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowUnsavedModal(true);
    } else {
      action();
    }
  };

  const handleGoBack = () => {
    executeWithUnsavedCheck(() => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/home");
      }
    });
  };

  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return;
    executeWithUnsavedCheck(() => {
      setActiveTab(newTab);
    });
  };

  const handleDiscardChanges = () => {
    setIsDirty(false);
    setPassword("");
    setConfirmPassword("");
    setUsername(initialValues.username);
    setAddress(initialValues.address);
    setEmail(initialValues.email);
    setShowUnsavedModal(false);

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // UPDATED: Handle save with email verification and username uniqueness
  const handleSaveAccountDetails = async (
    e: React.FormEvent, 
    isEmailVerified: boolean, 
    isUsernameUnique: boolean
  ) => {
    e.preventDefault();

    // Check username uniqueness
    if (!isUsernameUnique) {
      toast.error("Username is already taken. Please choose another.");
      return;
    }

    // Check password match
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Check email verification if changed
    const isEmailChanged = email !== initialValues.email;
    if (isEmailChanged && !isEmailVerified) {
      toast.error("Please verify your email before saving.");
      return;
    }

    try {
      const toastId = toast.loading("Updating settings...");

      await api.put("/api/accounts/setting-account-info", {
        ...(username !== initialValues.username) ? { username,isUsernameUnique } : {},
        ...(address !== initialValues.address) ? { address } : {},
        ...(email !== initialValues.email) ? { email,isEmailVerified } : {},
        ...(password ? { password } : {}),
      });

      toast.success("Account details updated successfully!", { id: toastId });
      setPassword("");
      setConfirmPassword("");
      setIsDirty(false);
      setInitialValues({ username, address, email });

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      toast.error(err.response?.data?.message || "Failed to update account details");
    }
  };

 
  const handleCancelSubscription = async () => {
    if (confirm("Are you sure you want to cancel your current subscription?")) {
      try {
        setIsCancellingSubscription(true);
        const { data } = await api.post("/api/payment/cancel-subscription");
        setSubscription((prev) => ({ ...prev, cancel_at_period_end: true }));
        toast.success(data.message || "Subscription cancellation scheduled successfully.");
      } catch (err: any) {
        toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to cancel subscription.");
      } finally {
        setIsCancellingSubscription(false);
      }
    }
  };
  const navItems = [
    { id: "display", label: "Display Settings", icon: Monitor },
    { id: "account", label: "Account Details", icon: User },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "subscription", label: "Subscription Details", icon: CreditCard },
    { id: "ticket", label: "Submit a Ticket", icon: Ticket },
    { id: "help", label: "Help & Support", icon: HelpCircle },
    { id: "legal", label: "Legal & Policies", icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#080a12] text-gray-900 dark:text-zinc-200 p-6 md:p-12 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Fullscreen Header & Expandable Circle Back Button */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="group relative flex items-center h-10 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 px-2.5 hover:px-4 overflow-hidden"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5" />
              <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-semibold">
                Back
              </span>
            </button>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Manage your user profile, subscription, support, and legal terms.</p>
            </div>
          </div>
          {isDirty && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
              ● Unsaved Changes Detected
            </span>
          )}
        </div>

        {/* Fullscreen Sidebar + Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Side Navigation Menu */}
          <aside className="md:col-span-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`relative w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm dark:shadow-md"
                      : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-zinc-400"}`} />
                  <span className="z-10">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-blue-500/10 rounded-xl border border-blue-500/20"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </aside>

          {/* Main Animated Workspace */}
          <main className="md:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="bg-white dark:bg-[#0d0f1a] p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl"
              >
                {activeTab === "account" && (
                  <UserSettingsAccountDetails
                    fullName={fullName}
                    birthdate={birthdate}
                    username={username}
                    setUsername={setUsername}
                    address={address}
                    setAddress={setAddress}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    onSave={handleSaveAccountDetails}
                    onOpenEditModal={() => setIsEditModalOpen(true)}
                    initialValues={initialValues}
                    setIsDirty={setIsDirty}
                  />
                )}

                {activeTab === "subscription" && (
                  <UserSettingsSubscriptionDetails
                    subscription={subscription}
                    onCancelSubscription={handleCancelSubscription}
                    isCancelling={isCancellingSubscription}
                  />
                )}

                {activeTab === "wallet" && <UserSettingsWallet />}

                {activeTab === "help" && <UserSettingsHelp />}

                {activeTab === "display" && <UserSettingsDisplay />}

                {activeTab === "legal" && <UserSettingsLegalPolicies />}
                {activeTab === "ticket" && <PageSubmitATicket />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0d0f1a] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500 dark:text-amber-400">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Unsaved Changes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-zinc-300">
              You have unsaved changes in your account details. Would you like to save or discard your changes before leaving?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              >
                Discard Changes
              </button>
              <button
                onClick={(e) => {
                  setShowUnsavedModal(false);
                  // Create a synthetic event to pass to handleSaveAccountDetails
                  const syntheticEvent = e as any;
                  handleSaveAccountDetails(syntheticEvent, false, true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        data={{
          username,
          name: fullName,
          birthdate: profileData.birthdate || profileData.birth_date || "",
          role: profileData.role || "Freelancer",
          email_address: email,
          address,
          bio: profileData.bio || profileData.description || "",
          tagline: profileData.tagline || "",
          country: profileData.country || "",
          zipCode: profileData.zipCode || profileData.zip_code || "",
          skills: profileData.skills || [],
          social_links: profileData.social_links || [],
          avatar_file_id: profileData.avatar_file_id || null,
          avatar_preset_url: avatarUrl || "",
          joinedDate: profileData.joinedDate || "",
        }}
        onSave={() => fetchSettings()}
      />
    </div>
  );
}
