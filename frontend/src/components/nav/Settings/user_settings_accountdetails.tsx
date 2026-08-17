import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Calendar, Mail, MapPin, Camera, Lock, Save, ShieldCheck, Send, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";

interface AccountDetailsProps {
  fullName: string;
  birthdate: string;
  username: string;
  setUsername: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  onSave: (e: React.FormEvent, isEmailVerified: boolean, isUsernameUnique: boolean) => void;
  onOpenEditModal: () => void;
  initialValues: { username: string; address: string; email: string };
  setIsDirty: (isDirty: boolean) => void;
}

const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_STORAGE_KEY = "accountDetails.emailVerification.sentAt";
type AddressSuggestion = { id: string; label: string; street_line_1: string; city: string; province_state: string; postal_code: string };

export const UserSettingsAccountDetails: React.FC<AccountDetailsProps> = ({
  fullName,
  birthdate,
  username,
  setUsername,
  address,
  setAddress,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSave,
  initialValues,
  setIsDirty,
}) => {
  const navigate = useNavigate();

  // Email verification state
  const [verificationCode, setVerificationCode] = React.useState("");
  const [isEmailVerified, setIsEmailVerified] = React.useState(false);
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState("");
  const [showVerificationInput, setShowVerificationInput] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [successMessage, setSuccessMessage] = React.useState("");
  
  // Password visibility toggles
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [userNameError, setUsernameError] = React.useState("");
  const [isUsernameUnique, setIsUsernameUnique] = React.useState(username === initialValues.username);
  const [addressSuggestions, setAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isAddressFocused, setIsAddressFocused] = React.useState(false);
  
  // Whether the email has been changed from its original value.
  const isEmailChanged = email !== initialValues.email;

  // Whenever the email changes, any prior verification becomes invalid
  React.useEffect(() => {
    if (isEmailChanged) {
      setIsEmailVerified(false);
      setVerificationCode("");
      setVerificationError("");
      setShowVerificationInput(false);
      setResendCooldown(0);
      sessionStorage.removeItem(RESEND_STORAGE_KEY);
    }
  }, [email, isEmailChanged]);

  // On mount, restore any in-progress resend cooldown
  React.useEffect(() => {
    const sentAt = sessionStorage.getItem(RESEND_STORAGE_KEY);
    if (!sentAt) return;

    const elapsedSeconds = Math.floor((Date.now() - Number(sentAt)) / 1000);
    const remaining = RESEND_COOLDOWN_SECONDS - elapsedSeconds;

    if (remaining > 0) {
      setResendCooldown(remaining);
      setShowVerificationInput(true);
    } else {
      sessionStorage.removeItem(RESEND_STORAGE_KEY);
    }
  }, []);

  // Tick the cooldown down
  React.useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem(RESEND_STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Dirty state
  React.useEffect(() => {
    const isChanged =
      username !== initialValues.username ||
      address !== initialValues.address ||
      isEmailChanged ||
      password !== "" ||
      confirmPassword !== "";

    setIsDirty(isChanged);
  }, [username, address, isEmailChanged, password, confirmPassword, initialValues, setIsDirty]);

  // Check username uniqueness
  React.useEffect(() => {
    if (!username.trim()) {
      setIsUsernameUnique(true);
      setUsernameError("");
      return;
    }

    if (username === initialValues.username) {
      setIsUsernameUnique(true);
      setUsernameError("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/api/users/check-username", {
          params: { username },
        });

        setIsUsernameUnique(response.data.isUnique);
        setUsernameError("");
        if (response.status !== 200) {
          setUsernameError(response.data.message || "Unable to verify username.");
        }
      } catch (error: any) {
        console.error(error);
        setUsernameError(
          error.response?.data?.message ?? "Unable to verify username."
        );
        setIsUsernameUnique(true);
      }
    }, 500);
    setUsernameError("");
    return () => clearTimeout(timer);
  }, [username, initialValues.username]);

  React.useEffect(() => {
    const query = address.trim();
    if (!isAddressFocused || query.length < 3 || query === initialValues.address) {
      setAddressSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/api/cashouts/address-suggestions", {
          params: { q: query },
          signal: controller.signal,
        });
        setAddressSuggestions(response.data?.addresses || []);
      } catch (error: any) {
        if (error?.code !== "ERR_CANCELED") setAddressSuggestions([]);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address, initialValues.address, isAddressFocused]);

  // Send verification code
  const handleSendVerificationCode = async () => {
    if (!email || isSendingCode || resendCooldown > 0) return;

    setIsSendingCode(true);
    setVerificationError("");
    setShowVerificationInput(true);

    try {
      const response = await api.post("/api/verification/email", { 
        email, 
        first_name: fullName.split(" ")[0], 
        last_name: fullName.split(" ")[1] || "" 
      });
      setSuccessMessage(response.data.message || "Verification code sent successfully.");
      sessionStorage.setItem(RESEND_STORAGE_KEY, Date.now().toString());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setVerificationError("Failed to send verification code. Please try again.");
      console.error("Send verification error:", error);
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    if (!verificationCode || isVerifyingCode || isEmailVerified) return;

    setIsVerifyingCode(true);
    setVerificationError("");

    try {
      const response = await api.post("/api/verification/verify-code", { 
        email, 
        code: verificationCode 
      });
      if (response.status === 200 && response.data.success) {
        setIsEmailVerified(true);
        setVerificationError("");
        setSuccessMessage("Email verified successfully!");
      } else {
        setIsEmailVerified(false);
        setVerificationError("Invalid verification code. Please try again.");
      }
    } catch (error) {
      setVerificationError("Failed to verify code. Please try again.");
      console.error("Verify code error:", error);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setVerificationCode(value);
    if (verificationError) setVerificationError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verification is only required when the email has actually changed.
    if (isEmailChanged && !isEmailVerified) {
      alert("Please verify your email before saving.");
      return;
    }

    // Pass both verification states to parent
    onSave(e, isEmailVerified, isUsernameUnique);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Details</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Manage your identity and profile credentials.</p>
      </div>

      {/* Non-Changeable Information */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-4">
        <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> Fixed Account Info (Not Changeable)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-500 mb-1">Full Name</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5 px-4 py-2 text-sm text-gray-800 dark:text-zinc-300">
              <User className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
              {fullName}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-500 mb-1">Birthdate</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/5 px-4 py-2 text-sm text-gray-800 dark:text-zinc-300">
              <Calendar className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
              {birthdate}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture & Verification Action */}
      <div className="flex items-center justify-between gap-4 py-2 flex-wrap border-b border-gray-200 dark:border-white/5 pb-4">
        <button
          type="button"
          onClick={() => navigate("/account-verification-status")}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-semibold shadow-sm"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> View Verification Status
        </button>
      </div>

      {/* Editable Credentials */}
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full rounded-xl border ${
              !isUsernameUnique && username !== initialValues.username
                ? "border-red-500/50 bg-red-50 dark:bg-red-500/5"
                : "border-gray-300 dark:border-white/10 bg-white dark:bg-white/5"
            } px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors`}
            required
          />
          {!isUsernameUnique && username !== initialValues.username && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{username} is already taken.</p>
          )}
          {userNameError && (
            <p className="text-xs text-red-400 mt-1">{userNameError}</p>
          )}

        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Address / Location</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={() => setIsAddressFocused(true)}
              onBlur={() => window.setTimeout(() => setIsAddressFocused(false), 150)}
              autoComplete="off"
              className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            {isAddressFocused && addressSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setAddress(suggestion.label);
                      setAddressSuggestions([]);
                      setIsAddressFocused(false);
                    }}
                    className="block w-full border-b border-gray-100 px-3 py-2.5 text-left text-xs text-gray-700 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:text-zinc-200 dark:hover:bg-white/5"
                  >
                    <span className="block text-sm">{suggestion.street_line_1 || suggestion.label}</span>
                    <span className="mt-0.5 block text-gray-500 dark:text-zinc-500">{suggestion.city}, {suggestion.province_state} {suggestion.postal_code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Field with Send Code Button */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Email Address</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border ${
                  isEmailChanged && isEmailVerified
                    ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5"
                    : "border-gray-300 dark:border-white/10 bg-white dark:bg-white/5"
                } pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors`}
                required
              />
              {isEmailChanged && isEmailVerified && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
              )}
            </div>
            {isEmailChanged && (
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={!email || isSendingCode || isEmailVerified || resendCooldown > 0}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${
                  isEmailVerified
                    ? "bg-emerald-600/20 text-emerald-400 cursor-default"
                    : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Send className={`h-4 w-4 ${isSendingCode ? "animate-pulse" : ""}`} />
                {isSendingCode
                  ? "Sending..."
                  : isEmailVerified
                  ? "Verified"
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : showVerificationInput
                  ? "Resend Code"
                  : "Send Code"}
              </button>
            )}
          </div>
          {successMessage && (
            <p className="text-xs text-emerald-400 mt-1">{successMessage}</p>
          )}
        </div>

        {/* Verification Code Input */}
        {isEmailChanged && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
              Verification Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={handleVerificationCodeChange}
                  maxLength={6}
                  className={`w-full rounded-xl border ${
                    verificationError
                      ? "border-red-500/50 bg-red-50 dark:bg-red-500/5"
                      : "border-gray-300 dark:border-white/10 bg-white dark:bg-white/5"
                  } px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors`}
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={!verificationCode || isVerifyingCode || isEmailVerified}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium whitespace-nowrap"
              >
                {isVerifyingCode ? "Verifying..." : "Verify"}
              </button>
            </div>

            {verificationError && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{verificationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Verified Badge */}
        {isEmailChanged && isEmailVerified && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">✅ Email Verified</p>
              <p className="text-xs text-emerald-400/70">Your email has been successfully verified</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Leave blank to keep current"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 pl-4 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 pl-4 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all shadow-lg hover:shadow-blue-500/20"
        >
          <Save className="h-4 w-4" /> Save Account Changes
        </button>
      </div>
    </form>
  );
};
