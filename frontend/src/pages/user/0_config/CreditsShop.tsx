import { useState, useEffect } from "react";
import {
  Crown,
  Gift,
  Check,
  Wallet,
  Coins,
  Gem,
  Shield,
  CreditCard,
  QrCode,
  ArrowRight,
  X,
  AlertCircle,
  ArrowUpRight,
  Banknote
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate } from "react-router-dom";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: string;
  originalPrice?: string;
  savings?: string;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
}

interface Membership {
  id: string;
  name: string;
  price: string;
  originalPrice: string | null;
  color: string;
  badgeColor: string;
  icon: React.ReactNode;
  features: string[];
  buttonText: string;
  isPrimary: boolean;
  popular?: boolean;
}

const creditPacks: CreditPack[] = [
  {
    id: "pocket",
    name: "Pocket of Credits",
    credits: 80,
    price: "₱99",
    icon: <Wallet className="h-5 w-5" />,
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: "bundle",
    name: "Bundle of Credits",
    credits: 250,
    price: "₱299",
    originalPrice: "₱340",
    savings: "Save 12%",
    icon: <Coins className="h-5 w-5" />,
    color: "from-green-500 to-emerald-500",
    popular: true
  },
  {
    id: "box",
    name: "Box of Credits",
    credits: 750,
    price: "₱849",
    originalPrice: "₱1,060",
    savings: "Save 20%",
    icon: <Gift className="h-5 w-5" />,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "vault",
    name: "Vault of Credits",
    credits: 1600,
    price: "₱1,599",
    originalPrice: "₱2,280",
    savings: "Save 30%",
    icon: <Gem className="h-5 w-5" />,
    color: "from-yellow-500 to-orange-500"
  }
];

const memberships: Membership[] = [
  {
    id: "free",
    name: "FREE",
    price: "₱0",
    originalPrice: null,
    color: "#ffffff",
    badgeColor: "rgba(255, 255, 255, 0.05)",
    icon: null,
    features: [
      "720p Export",
      "Standard Export Speed",
      "Low Render Queue",
      "Watermarked Export",
      "Basic Tools",
      "3 Collaborators",
      "3 Collaborative Projects",
      "1 Asset Post"
    ],
    buttonText: "Get Started",
    isPrimary: false
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "₱599",
    originalPrice: "₱899",
    color: "#eab308",
    badgeColor: "rgba(234, 179, 8, 0.1)",
    icon: <Crown size={16} fill="#eab308" color="#eab308" />,
    features: [
      "1080p Export",
      "Accelerated Export Speed",
      "Priority Render Queue",
      "No Watermark",
      "Premium Tools + AI",
      "10 Collaborators",
      "10 Collaborative Projects",
      "20 Asset Posts",
      "Profile Visibility +30%",
      "Badge Display"
    ],
    buttonText: "Upgrade to Premium",
    isPrimary: true,
    popular: true
  },
  {
    id: "business",
    name: "BUSINESS",
    price: "₱3,500",
    originalPrice: "₱3,999",
    color: "#2dd4bf",
    badgeColor: "rgba(45, 212, 191, 0.1)",
    icon: <Crown size={16} fill="#2dd4bf" color="#2dd4bf" />,
    features: [
      "2K - 4K Export",
      "Maximum Export Speed",
      "Absolute Render Queue",
      "No Watermark",
      "Premium Tools + AI",
      "20 Collaborators",
      "20 Collaborative Projects",
      "Unlimited Asset Posts",
      "Profile Visibility +90%",
      "Badge Display and More"
    ],
    buttonText: "Upgrade to Business",
    isPrimary: true
  }
];

const paymentOptions = [
  { id: "GCASH", name: "GCash", icon: <QrCode className="h-5 w-5 text-blue-500" /> },
  { id: "MAYA", name: "Maya", icon: <QrCode className="h-5 w-5 text-green-500" /> },
  { id: "CARD", name: "Credit/Debit Card", icon: <CreditCard className="h-5 w-5 text-purple-500" /> }
];

const cashoutDestinations = [
  { id: "GCASH", name: "GCash Wallet", icon: <QrCode className="h-5 w-5 text-blue-500" /> },
  { id: "MAYA", name: "Maya Wallet", icon: <QrCode className="h-5 w-5 text-green-500" /> },
  { id: "BDO", name: "BDO Unibank", icon: <Banknote className="h-5 w-5 text-blue-700" /> }
];

const CreditShop: React.FC = () => {
  useNavigate();
  const userCurrentCredits = 1250;

  const creditToPesoRate = 1.0;
  const platformFeeRate = 0.20;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"topup" | "membership" | "cashout">("topup");
  const [tabTriggerAnim, setTabTriggerAnim] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>("GCASH");
  const [selectedCashoutDest, setSelectedCashoutDest] = useState<string>("GCASH");

  const [cashoutAmount, setCashoutAmount] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");

  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isCashoutModalOpen, setIsCashoutModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Layout initialization trigger animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      // Trigger slide on initial frame loading completion hook
      setTimeout(() => setTabTriggerAnim(true), 50);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle slide animations on tab click switching mechanics
  const handleTabChange = (tab: "topup" | "membership" | "cashout") => {
    setTabTriggerAnim(false);
    setTimeout(() => {
      setActiveTab(tab);
      setTabTriggerAnim(true);
    }, 180); // Smooth timing match transition exit window frame size
  };

  const computeCashoutMetrics = (inputCredits: string) => {
    const credits = parseInt(inputCredits) || 0;
    const grossAmount = credits * creditToPesoRate;
    const platformFee = grossAmount * platformFeeRate;
    const netPayout = grossAmount - platformFee;
    return { grossAmount, platformFee, netPayout };
  };

  const handleOpenPackCheckout = (pack: CreditPack) => {
    setSelectedPack(pack);
    setIsPackModalOpen(true);
  };

  const handleOpenMembershipCheckout = (membership: Membership) => {
    if (membership.id === "free") return;
    setSelectedMembership(membership);
    setIsMembershipModalOpen(true);
  };

  const handleOpenCashoutCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashoutAmount || parseInt(cashoutAmount) <= 0 || parseInt(cashoutAmount) > userCurrentCredits) return;
    setIsCashoutModalOpen(true);
  };

  const handleConfirmPackPayment = () => {
    if (!selectedPack) return;
    setIsProcessing(true);

    const xenditPayload = {
      amount: parseInt(selectedPack.price.replace(/[₱,]/g, "")),
      currency: "PHP",
      payment_method: selectedPayment,
      description: `Top-up: ${selectedPack.name}`,
    };
    console.log("Dispatching Xendit Request Payload:", xenditPayload);

    setTimeout(() => {
      setIsProcessing(false);
      setIsPackModalOpen(false);
      alert(`Connecting to Xendit Gateway... \nRouting invoice logic via ${selectedPayment}.`);
    }, 1500);
  };

  const handleConfirmMembershipPayment = () => {
    if (!selectedMembership) return;
    setIsProcessing(true);

    const xenditPayload = {
      amount: parseInt(selectedMembership.price.replace(/[₱,]/g, "")),
      currency: "PHP",
      payment_method: selectedPayment,
      description: `Subscription Upgrade: ${selectedMembership.name} Plan`,
    };
    console.log("Dispatching Xendit Membership Payload:", xenditPayload);

    setTimeout(() => {
      setIsProcessing(false);
      setIsMembershipModalOpen(false);
      alert(`Connecting to Xendit Checkout... \nUpgrading cluster authorizations to ${selectedMembership.name}.`);
    }, 1500);
  };

  const handleConfirmCashoutDisbursement = () => {
    const { netPayout } = computeCashoutMetrics(cashoutAmount);
    setIsProcessing(true);

    const xenditDisbursementPayload = {
      amount: netPayout,
      channel_code: selectedCashoutDest,
      account_name: accountName,
      account_number: accountNumber,
      currency: "PHP",
      description: `Credit Cashout redemption platform transaction.`,
    };
    console.log("Dispatching Xendit Disbursement Payload:", xenditDisbursementPayload);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCashoutModalOpen(false);
      setCashoutAmount("");
      setAccountNumber("");
      setAccountName("");
      alert(`Cashout Dispatched! \nXendit Disbursement payout for ₱${netPayout.toLocaleString()} processing under active queue routing.`);
    }, 1800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />
        <div className="mx-auto max-w-7xl p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const cashoutMetrics = computeCashoutMetrics(cashoutAmount);

  return (
    <div className="min-h-screen bg-[#080a12] text-white selection:bg-blue-500/30 relative overflow-x-hidden">
      <style>{`
        .pricing-card {
          background: rgba(13, 15, 26, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid #1e2130;
          border-radius: 24px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          background: rgba(17, 20, 34, 0.7);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8);
        }
      `}</style>

      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 filter blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/5 filter blur-[140px] pointer-events-none z-0" />

      <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 relative z-10">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Web Shop Tiers
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Manage ecosystem capital. Recharge assets, upgrade parameters, or liquidate credits instantly.
          </p>
        </div>

        {/* Tab Switcher Layout */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-xl p-1.5 bg-[#0d0f1a] border border-[#1e2130]">
            <button
              onClick={() => handleTabChange("topup")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === "topup" ? "bg-white text-[#080a12] shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Coins className="h-4 w-4" />
              Top Up
            </button>
            <button
              onClick={() => handleTabChange("membership")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === "membership" ? "bg-white text-[#080a12] shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Crown className="h-4 w-4" />
              Memberships
            </button>
            <button
              onClick={() => handleTabChange("cashout")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === "cashout" ? "bg-white text-[#080a12] shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Cashout
            </button>
          </div>
        </div>

        {/* DYNAMIC VIEW SHELF W/ SLIDE UP ANIMATIONS */}
        <div
          className={`transition-all duration-500 ease-out transformation transform ${
            tabTriggerAnim ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* TOP UP CONTAINER */}
          {activeTab === "topup" && (
            <div className="space-y-10">
              <div className="bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs text-blue-400 font-bold border border-blue-500/20">1</span>
                  Select Payment Option
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {paymentOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedPayment(option.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selectedPayment === option.id ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30" : "border-[#1e2130] bg-transparent hover:border-zinc-700 hover:bg-white/5"
                      }`}
                    >
                      <div className="p-2 bg-white/5 rounded-lg">{option.icon}</div>
                      <span className="text-sm font-semibold">{option.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs text-blue-400 font-bold border border-blue-500/20">2</span>
                  Choose Credit Package
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {creditPacks.map((pack) => (
                    <div key={pack.id} className={`group relative overflow-hidden rounded-2xl border border-[#1e2130] bg-[#0d0f1a]/40 p-6 transition-all duration-300 hover:border-blue-500/50 hover:bg-[#111422]/70 ${pack.popular ? "ring-1 ring-emerald-500/40 border-emerald-500/30" : ""}`}>
                      {pack.popular && <div className="absolute -right-8 top-4 rotate-45 bg-emerald-500 px-8 py-0.5 text-[9px] font-bold text-white tracking-widest">POPULAR</div>}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl bg-gradient-to-br ${pack.color} p-2.5 text-white shadow-md`}>{pack.icon}</div>
                          <div>
                            <h3 className="text-sm font-bold tracking-tight text-white">{pack.name}</h3>
                            <p className="text-xs text-zinc-500">{pack.credits} Credits</p>
                          </div>
                        </div>
                        {pack.savings && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">{pack.savings}</span>}
                      </div>
                      <div className="mt-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-white tracking-tight">{pack.price}</span>
                          {pack.originalPrice && <span className="text-sm text-zinc-600 line-through font-medium">{pack.originalPrice}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleOpenPackCheckout(pack)} className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-[#080a12] transition-all duration-300 hover:bg-zinc-200">
                        Purchase Bundle
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MEMBERSHIPS CONTAINER */}
          {activeTab === "membership" && (
            <div className="grid gap-7 md:grid-cols-3 items-stretch">
              {memberships.map((tier, idx) => (
                <div key={idx} className="pricing-card" style={{ borderColor: tier.isPrimary ? "rgba(255, 255, 255, 0.08)" : "#1e2130" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = tier.color)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = tier.isPrimary ? "rgba(255, 255, 255, 0.08)" : "#1e2130")}>
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span style={{ color: tier.color, fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", background: tier.badgeColor, padding: "4px 10px", borderRadius: "6px" }}>{tier.name}</span>
                      {tier.icon}
                    </div>
                    <div className="flex items-baseline gap-2.5 mb-8">
                      <h2 className="text-4xl font-extrabold tracking-tight text-white m-0">{tier.price}</h2>
                      {tier.originalPrice && <span className="text-zinc-600 text-base line-through font-medium">{tier.originalPrice}</span>}
                    </div>
                    <div className="h-[1px] bg-gradient-to-r from-[#1e2130] to-transparent mb-7" />
                    <div className="flex flex-col gap-3.5 mb-10">
                      {tier.features.map((feat, fidx) => (
                        <div key={fidx} className="text-sm text-zinc-300 flex items-start gap-3 leading-relaxed">
                          <span className="flex items-center justify-center rounded-full p-0.5 mt-0.5 flex-shrink-0" style={{ color: tier.color, background: tier.badgeColor }}><Check size={11} strokeWidth={3} /></span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleOpenMembershipCheckout(tier)} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]" style={{ background: tier.isPrimary ? "#ffffff" : "transparent", color: tier.isPrimary ? "#080a12" : "#ffffff", border: tier.isPrimary ? "none" : "1px solid #1e2130" }} onMouseEnter={(e) => { if (!tier.isPrimary) { e.currentTarget.style.borderColor = "#ffffff"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; } else { e.currentTarget.style.background = "#dde3ed"; } }} onMouseLeave={(e) => { if (!tier.isPrimary) { e.currentTarget.style.borderColor = "#1e2130"; e.currentTarget.style.background = "transparent"; } else { e.currentTarget.style.background = "#ffffff"; } }}>
                    {tier.buttonText}
                    {tier.isPrimary && <div className="w-4 h-4 rounded-full bg-[#080a12] text-white flex items-center justify-center"><ArrowRight size={10} strokeWidth={3} /></div>}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CASHOUT CONTAINER */}
          {activeTab === "cashout" && (
            <div className="max-w-2xl mx-auto bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Liquidate Token Assets</h2>
                <p className="text-xs text-zinc-400">Convert your active platform credit tokens back to secure Philippine Pesos instantly via Xendit Payout routing.</p>
              </div>

              <form onSubmit={handleOpenCashoutCheckout} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-400 block">1. Payout Target Destination</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {cashoutDestinations.map((dest) => (
                      <div
                        key={dest.id}
                        onClick={() => setSelectedCashoutDest(dest.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedCashoutDest === dest.id ? "border-blue-500 bg-blue-500/5 shadow-md" : "border-[#1e2130] bg-transparent hover:bg-white/5"
                        }`}
                      >
                        {dest.icon}
                        <span className="text-xs font-bold mt-2 text-zinc-200">{dest.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block">2. Beneficiary Account Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0917XXXXXXX or Bank No."
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-black/40 border border-[#1e2130] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-zinc-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block">3. Beneficiary Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Exact registered account name"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-black/40 border border-[#1e2130] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-zinc-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-400">4. Settlement Amount (Credits)</label>
                    <span className="text-xs text-zinc-500">Max usable: <b className="text-zinc-300">{userCurrentCredits}</b></span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="10"
                      max={userCurrentCredits}
                      placeholder="Minimum 10 credits"
                      value={cashoutAmount}
                      onChange={(e) => setCashoutAmount(e.target.value)}
                      className="w-full bg-black/40 border border-[#1e2130] rounded-xl pl-4 pr-16 py-3.5 text-base font-bold focus:outline-none focus:border-blue-500 text-white transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">CREDITS</div>
                  </div>

                  {cashoutAmount && parseInt(cashoutAmount) > 0 && parseInt(cashoutAmount) <= userCurrentCredits && (
                    <div className="p-4 bg-zinc-900/60 border border-[#1e2130] rounded-xl space-y-2.5 text-xs transition-opacity duration-300">
                      <div className="flex justify-between text-zinc-400">
                        <span>Gross Conversion (1:1):</span>
                        <span className="font-semibold text-white">₱{cashoutMetrics.grossAmount.toLocaleString()}.00</span>
                      </div>
                      <div className="flex justify-between text-red-400/80">
                        <span>Platform Fee Overhead Take (20%):</span>
                        <span>- ₱{cashoutMetrics.platformFee.toLocaleString()}.00</span>
                      </div>
                      <div className="h-[1px] bg-white/5 my-1" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-zinc-300 font-medium">Net Disbursed Funds Paid Out:</span>
                        <span className="text-lg font-extrabold text-emerald-400">₱{cashoutMetrics.netPayout.toLocaleString()}.00 PHP</span>
                      </div>
                    </div>
                  )}

                  {cashoutAmount && parseInt(cashoutAmount) > userCurrentCredits && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Insufficient balance tokens to execute this liquidation size request.</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!cashoutAmount || parseInt(cashoutAmount) <= 0 || parseInt(cashoutAmount) > userCurrentCredits}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Initiate Settlement Disbursal <ArrowRight size={14} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Security Trust Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/5">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Secure checkout environment processing powered securely via Xendit Compliance
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: CREDIT PACK RECHARGE */}
      {isPackModalOpen && selectedPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-md bg-[#0d0f1a] border border-[#1e2130] rounded-2xl p-6 relative shadow-2xl transition-all duration-300 scale-100">
            <button onClick={() => !isProcessing && setIsPackModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors" disabled={isProcessing}><X className="h-5 w-5" /></button>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white">Confirm Top-Up Order</h3>
              <p className="text-xs text-zinc-400">Reviewing credit distribution values before dispatching gateway invoices.</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Package Selected:</span><span className="font-bold text-blue-400">{selectedPack.name}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Total Credits Issued:</span><span className="font-bold text-emerald-400">+{selectedPack.credits} Credits</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Payment Routing:</span><span className="font-bold text-white text-xs bg-white/10 px-2 py-0.5 rounded-md">Xendit · {paymentOptions.find(o => o.id === selectedPayment)?.name}</span></div>
              <div className="h-[1px] bg-white/5 my-2" /><div className="flex justify-between items-baseline"><span className="text-sm text-zinc-400 font-medium">Amount Due:</span><span className="text-2xl font-extrabold text-white">{selectedPack.price}</span></div>
            </div>
            <div className="flex gap-3">
              <button disabled={isProcessing} onClick={() => setIsPackModalOpen(false)} className="flex-1 py-3 bg-transparent border border-[#1e2130] text-sm font-semibold text-zinc-400 rounded-xl hover:text-white transition-all">Cancel</button>
              <button disabled={isProcessing} onClick={handleConfirmPackPayment} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">{isProcessing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Confirm with Xendit"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TIER UPGRADE */}
      {isMembershipModalOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-md bg-[#0d0f1a] border border-[#1e2130] rounded-2xl p-6 relative shadow-2xl transition-all duration-300 scale-100">
            <button onClick={() => !isProcessing && setIsMembershipModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors" disabled={isProcessing}><X className="h-5 w-5" /></button>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white">Upgrade Account Tier</h3>
              <p className="text-xs text-zinc-400">Lock in your premium operations structure.</p>
            </div>
            <div className="mb-5">
              <label className="text-xs font-bold text-zinc-400 block mb-2">Choose Checkout Option</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentOptions.map((option) => (
                  <div key={option.id} onClick={() => !isProcessing && setSelectedPayment(option.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-all ${selectedPayment === option.id ? "border-blue-500 bg-blue-500/10" : "border-[#1e2130] bg-transparent hover:bg-white/5"}`}>{option.icon} <span className="text-[10px] font-bold mt-1 text-zinc-300">{option.name}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-5 space-y-2.5">
              <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Target Plan:</span><span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded" style={{ color: selectedMembership.color, backgroundColor: selectedMembership.badgeColor }}>{selectedMembership.name}</span></div>
              <div className="h-[1px] bg-white/5 my-1" /><div className="flex justify-between items-baseline"><span className="text-sm text-zinc-400 font-medium">Subscription Cost:</span><span className="text-2xl font-extrabold text-white">{selectedMembership.price}</span></div>
            </div>
            <div className="flex gap-3">
              <button disabled={isProcessing} onClick={() => setIsMembershipModalOpen(false)} className="flex-1 py-3 bg-transparent border border-[#1e2130] text-sm font-semibold text-zinc-400 rounded-xl hover:text-white transition-all">Dismiss</button>
              <button disabled={isProcessing} onClick={handleConfirmMembershipPayment} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">{isProcessing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Upgrade Tier"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CASHOUT DISBURSAL LIQUIDATION */}
      {isCashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-md bg-[#0d0f1a] border border-[#1e2130] rounded-2xl p-6 relative shadow-2xl transition-all duration-300 scale-100">
            <button
              onClick={() => !isProcessing && setIsCashoutModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              disabled={isProcessing}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Confirm Liquidation Disbursal
              </h3>
              <p className="text-xs text-zinc-400">Carefully double check target settlement figures and fees before authorizing.</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Tokens Redeeming:</span>
                <span className="font-bold text-red-400">-{cashoutAmount} Credits</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Target Channel:</span>
                <span className="font-bold text-white text-xs bg-white/10 px-2 py-0.5 rounded-md">
                  Xendit Payout · {cashoutDestinations.find(o => o.id === selectedCashoutDest)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Beneficiary Name:</span>
                <span className="font-bold text-zinc-200 text-sm">{accountName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Account Number:</span>
                <span className="font-mono text-zinc-300 text-xs">{accountNumber}</span>
              </div>

              <div className="h-[1px] bg-white/5 my-2" />

              <div className="flex justify-between items-center text-xs text-zinc-400">
                <span>Gross Processing Metric:</span>
                <span>₱{cashoutMetrics.grossAmount.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between items-center text-xs text-red-400/80">
                <span>Ecosystem Take-Cut (20%):</span>
                <span>- ₱{cashoutMetrics.platformFee.toLocaleString()}.00</span>
              </div>

              <div className="h-[1px] bg-white/5 my-1" />

              <div className="flex justify-between items-baseline">
                <span className="text-sm text-zinc-300 font-medium">Net Transferred Payout:</span>
                <span className="text-2xl font-extrabold text-emerald-400">₱{cashoutMetrics.netPayout.toLocaleString()}.00 PHP</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-6 text-[11px] leading-normal">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Erroneous identity parameters can completely misroute disbursals permanently. Confirm credentials above mirror target banking credentials exactly.</span>
            </div>

            <div className="flex gap-3">
              <button
                disabled={isProcessing}
                onClick={() => setIsCashoutModalOpen(false)}
                className="flex-1 py-3 bg-transparent border border-[#1e2130] text-sm font-semibold text-zinc-400 rounded-xl hover:text-white transition-all disabled:opacity-50"
              >
                Abort
              </button>
              <button
                disabled={isProcessing}
                onClick={handleConfirmCashoutDisbursement}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Execute Disbursal"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditShop;