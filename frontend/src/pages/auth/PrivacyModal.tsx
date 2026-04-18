// src/components/modals/PrivacyModal.tsx
import { useState } from "react";
import {X, Lock, Eye, ShieldCheck, Mail, Cookie, Check} from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose, onAccept }) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    if (isBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    setIsAccepted(true);
    if (onAccept) onAccept();
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl animate-scale-in flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 sticky top-0 bg-[#0d0f1a]">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-500/20 p-2">
              <Lock className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Privacy Policy
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          onScroll={handleScroll}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">1. Information We Collect</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We collect information you provide directly to us, such as when you create an account, update your profile,
              or communicate with us. This may include:
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2 ml-4">
              <li>Name, email address, and username</li>
              <li>Profile information and avatar</li>
              <li>Project files and content you upload</li>
              <li>Payment information (processed securely by our partners)</li>
              <li>Communications with us or other users</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">2. How We Use Your Information</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends and usage</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">3. Data Security</h3>
            <div className="flex items-start gap-3 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
              <ShieldCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">4. Sharing of Information</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2 ml-4">
              <li>With your consent or at your direction</li>
              <li>With service providers who perform services on our behalf</li>
              <li>To comply with legal obligations</li>
              <li>To protect the rights and safety of Ensemble and its users</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">5. Cookies and Tracking</h3>
            <div className="flex items-start gap-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
              <Cookie className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-300">
                We use cookies and similar tracking technologies to track activity on our service and hold certain information.
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">6. Data Retention</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you services.
              If you delete your account, we will delete or anonymize your information within 30 days.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">7. Your Rights</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2 ml-4">
              <li>The right to access your personal information</li>
              <li>The right to correct inaccurate information</li>
              <li>The right to request deletion of your information</li>
              <li>The right to object to processing of your information</li>
              <li>The right to data portability</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">8. Children's Privacy</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Our service is not directed to children under 13. We do not knowingly collect personal information from
              children under 13. If you become aware that a child has provided us with personal information, please contact us.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">9. International Data Transfers</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province,
              country, or other governmental jurisdiction where data protection laws may differ.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">10. Changes to This Policy</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "effective date".
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">11. Contact Us</h3>
            <div className="flex items-center gap-3 rounded-lg bg-white/5 p-4">
              <Mail className="h-5 w-5 text-blue-400" />
              <p className="text-sm text-zinc-400">
                If you have any questions about this Privacy Policy, please contact us at:{" "}
                <span className="text-blue-400">privacy@ensemble.com</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                Effective date: January 1, 2024. This Privacy Policy applies to all users of the Ensemble platform.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-5 flex gap-3">
          <button
            onClick={handleAccept}
            disabled={!scrolledToBottom}
            className={`flex-1 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              scrolledToBottom
                ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:scale-105"
                : "bg-white/10 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {isAccepted ? (
              <>
                <Check className="h-4 w-4" />
                Accepted
              </>
            ) : (
              "I Agree to the Privacy Policy"
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;