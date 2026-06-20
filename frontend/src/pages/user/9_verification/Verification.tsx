import {
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  FileText,
  User,
  Globe,
  Shield,
  Check,
  ArrowLeft,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Scan,
  UserCheck,
  Clock,
  AlertCircle,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

type VerificationStep = 1 | 2 | 3 | 4;

interface ExtractedData {
  fullName: string;
  idNumber: string;
  dateOfBirth: string;
  issueDate: string;
  expiryDate: string;
  nationality: string;
  [key: string]: string;
}

const Verification = () => {
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const [currentStep, setCurrentStep] = useState<VerificationStep>(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Step 1: Contact Verification
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneOTP, setPhoneOTP] = useState("");
  const [emailOTP, setEmailOTP] = useState("");
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [sendingPhoneOTP, setSendingPhoneOTP] = useState(false);
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);
  
  // Step 2: ID Verification
  const [nationality, setNationality] = useState("");
  const [idType, setIdType] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    fullName: "",
    idNumber: "",
    dateOfBirth: "",
    issueDate: "",
    expiryDate: "",
    nationality: "",
  });
  const [extractedDataEditable, setExtractedDataEditable] = useState<ExtractedData>({
    fullName: "",
    idNumber: "",
    dateOfBirth: "",
    issueDate: "",
    expiryDate: "",
    nationality: "",
  });
  const [extractionDone, setExtractionDone] = useState(false);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  
  // Step 3: Liveliness Check
  const [livelinessVerified, setLivelinessVerified] = useState(false);
  const [livelinessLoading, setLivelinessLoading] = useState(false);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ID Types
  const idTypes = [
    "National ID",
    "Passport",
    "Driver's License",
    "Voter's ID",
    "Social Security ID",
    "Postal ID",
    "PRC ID",
    "UMID",
  ];

  const nationalities = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", 
    "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", 
    "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
    "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", 
    "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", 
    "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", 
    "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", 
    "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", 
    "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
    "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", 
    "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", 
    "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", 
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", 
    "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", 
    "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", 
    "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", 
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", 
    "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", 
    "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", 
    "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", 
    "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", 
    "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", 
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", 
    "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
    "Saint Lucia", "Saint Vincent", "Samoa", "San Marino", "Sao Tome and Principe", 
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", 
    "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", 
    "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", 
    "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria", 
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", 
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", 
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
    "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", 
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  // Step 1: Send OTP
  const sendPhoneOTP = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }
    
    setSendingPhoneOTP(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowPhoneOTP(true);
      toast.success("OTP sent to your phone number");
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setSendingPhoneOTP(false);
    }
  };

  const sendEmailOTP = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    
    setSendingEmailOTP(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowEmailOTP(true);
      toast.success("OTP sent to your email");
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setSendingEmailOTP(false);
    }
  };

  const verifyPhoneOTP = () => {
    if (!phoneOTP || phoneOTP.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    
    // Simulate verification
    setPhoneVerified(true);
    setPhoneVerifiedAt(new Date().toLocaleString());
    setShowPhoneOTP(false);
    toast.success("Phone number verified successfully!");
  };

  const verifyEmailOTP = () => {
    if (!emailOTP || emailOTP.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    
    // Simulate verification
    setEmailVerified(true);
    setEmailVerifiedAt(new Date().toLocaleString());
    setShowEmailOTP(false);
    toast.success("Email verified successfully!");
  };

  // Step 2: Handle ID Upload
  const handleIdFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFront(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdFrontPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdBack(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractIDData = async () => {
    if (!nationality || !idType || !idFront) {
      toast.error("Please fill in all required fields and upload ID front image");
      return;
    }

    setExtractionLoading(true);
    try {
      // Simulate OCR extraction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock extracted data
      const mockExtractedData: ExtractedData = {
        fullName: "John Michael Doe",
        idNumber: "ID-2024-001234",
        dateOfBirth: "1990-05-15",
        issueDate: "2020-01-01",
        expiryDate: "2030-01-01",
        nationality: nationality,
      };
      
      setExtractedData(mockExtractedData);
      setExtractedDataEditable(mockExtractedData);
      setExtractionDone(true);
      toast.success("Data extracted successfully! Please verify the information.");
    } catch (error) {
      toast.error("Failed to extract data. Please try again.");
    } finally {
      setExtractionLoading(false);
    }
  };

  const handleExtractedDataChange = (field: string, value: string) => {
    setExtractedDataEditable(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const confirmExtractedData = () => {
    // Validate extracted data
    const requiredFields = ["fullName", "idNumber", "dateOfBirth", "expiryDate"];
    const missingFields = requiredFields.filter(field => !extractedDataEditable[field]);
    
    if (missingFields.length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setStep2Complete(true);
    toast.success("ID verification complete! Proceed to liveliness check.");
  };

  // Step 3: Liveliness Check
  const startLivelinessCheck = async () => {
    setLivelinessLoading(true);
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Simulate liveliness check (in production, this would use facial recognition)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful verification
      setLivelinessVerified(true);
      toast.success("Liveliness check passed!");
      
      // Stop camera after verification
      stream.getTracks().forEach(track => track.stop());
      
      // Move to completion step after delay
      setTimeout(() => {
        setCurrentStep(4);
      }, 1500);
      
    } catch (error) {
      toast.error("Failed to access camera. Please ensure camera permissions are granted.");
    } finally {
      setLivelinessLoading(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        // In production, send this image for facial recognition
      }
    }
  };

  const isStep1Complete = phoneVerified && emailVerified;
  const isStep2Complete = step2Complete;

  // Progress
  const getProgress = () => {
    switch (currentStep) {
      case 1: return 25;
      case 2: return 50;
      case 3: return 75;
      case 4: return 100;
      default: return 0;
    }
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep === 1 && !isStep1Complete) {
      toast.error("Please verify both phone and email first");
      return;
    }
    if (currentStep === 2 && !isStep2Complete) {
      toast.error("Please complete ID verification first");
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(prev => (prev + 1) as VerificationStep);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as VerificationStep);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle="Verification" credits={1250} />

      <div className="mx-auto max-w-4xl p-6 md:p-8">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 md:p-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Account Verification</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Complete the verification process to unlock all features
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-zinc-400">Progress</span>
              <span className="text-xs text-zinc-400">{getProgress()}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="mb-8 flex justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                  currentStep >= step 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'border border-white/20 bg-white/5 text-zinc-500'
                }`}>
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                <span className="mt-2 text-xs text-zinc-500">
                  {step === 4 ? 'Complete' : `Step ${step}`}
                </span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="mt-6">
            {/* Step 1: Contact Verification */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Verify Contact Information</h2>
                
                {/* Phone Verification */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-400" />
                      <span className="text-sm font-medium text-white">Phone Number</span>
                    </div>
                    {phoneVerified && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Verified {phoneVerifiedAt}
                      </span>
                    )}
                  </div>
                  
                  {!phoneVerified ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+63 912 345 6789"
                          className="flex-1 rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={showPhoneOTP}
                        />
                        <button
                          onClick={sendPhoneOTP}
                          disabled={sendingPhoneOTP || showPhoneOTP}
                          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                        >
                          {sendingPhoneOTP ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                        </button>
                      </div>
                      
                      {showPhoneOTP && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={phoneOTP}
                            onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            className="flex-1 rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            maxLength={6}
                          />
                          <button
                            onClick={verifyPhoneOTP}
                            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600"
                          >
                            Verify
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      {phoneNumber}
                    </div>
                  )}
                </div>

                {/* Email Verification */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-400" />
                      <span className="text-sm font-medium text-white">Email Address</span>
                    </div>
                    {emailVerified && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Verified {emailVerifiedAt}
                      </span>
                    )}
                  </div>
                  
                  {!emailVerified ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="flex-1 rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={showEmailOTP}
                        />
                        <button
                          onClick={sendEmailOTP}
                          disabled={sendingEmailOTP || showEmailOTP}
                          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                        >
                          {sendingEmailOTP ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                        </button>
                      </div>
                      
                      {showEmailOTP && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={emailOTP}
                            onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            className="flex-1 rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            maxLength={6}
                          />
                          <button
                            onClick={verifyEmailOTP}
                            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600"
                          >
                            Verify
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      {email}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={goToNextStep}
                    disabled={!isStep1Complete}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: ID Verification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">ID Verification</h2>
                
                {/* Nationality & ID Type */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Nationality
                    </label>
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={extractionDone}
                    >
                      <option value="">Select nationality</option>
                      {nationalities.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      ID Type
                    </label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={extractionDone}
                    >
                      <option value="">Select ID type</option>
                      {idTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ID Upload */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      ID Front
                    </label>
                    <div
                      onClick={() => frontInputRef.current?.click()}
                      className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 transition hover:border-blue-500 hover:bg-white/10"
                    >
                      {idFrontPreview ? (
                        <img src={idFrontPreview} alt="ID Front" className="h-full w-full object-contain p-2" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-zinc-500" />
                          <span className="mt-2 text-sm text-zinc-500">Upload ID Front</span>
                        </>
                      )}
                    </div>
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleIdFrontUpload}
                      className="hidden"
                      disabled={extractionDone}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      ID Back (Optional)
                    </label>
                    <div
                      onClick={() => backInputRef.current?.click()}
                      className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 transition hover:border-blue-500 hover:bg-white/10"
                    >
                      {idBackPreview ? (
                        <img src={idBackPreview} alt="ID Back" className="h-full w-full object-contain p-2" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-zinc-500" />
                          <span className="mt-2 text-sm text-zinc-500">Upload ID Back</span>
                        </>
                      )}
                    </div>
                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleIdBackUpload}
                      className="hidden"
                      disabled={extractionDone}
                    />
                  </div>
                </div>

                {/* Extract Button */}
                {!extractionDone && (
                  <button
                    onClick={extractIDData}
                    disabled={extractionLoading || !nationality || !idType || !idFront}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    {extractionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting Data...
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4" />
                        Extract ID Data
                      </>
                    )}
                  </button>
                )}

                {/* Extracted Data */}
                {extractionDone && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <h3 className="font-medium text-white">Extracted Information</h3>
                        <span className="ml-auto text-xs text-zinc-500">Please verify and correct if needed</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs text-zinc-500">Full Name</label>
                          <input
                            type="text"
                            value={extractedDataEditable.fullName}
                            onChange={(e) => handleExtractedDataChange('fullName', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">ID Number</label>
                          <input
                            type="text"
                            value={extractedDataEditable.idNumber}
                            onChange={(e) => handleExtractedDataChange('idNumber', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">Date of Birth</label>
                          <input
                            type="date"
                            value={extractedDataEditable.dateOfBirth}
                            onChange={(e) => handleExtractedDataChange('dateOfBirth', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500">Expiry Date</label>
                          <input
                            type="date"
                            value={extractedDataEditable.expiryDate}
                            onChange={(e) => handleExtractedDataChange('expiryDate', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#080a12] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={confirmExtractedData}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-600"
                      >
                        <Check className="h-4 w-4" />
                        Confirm & Proceed
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={goToPreviousStep}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={goToNextStep}
                    disabled={!isStep2Complete}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Liveliness Check */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Liveliness Check</h2>
                
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-col items-center gap-4">
                    {!livelinessVerified ? (
                      <>
                        <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-black/50">
                          <video
                            ref={videoRef}
                            className="w-full"
                            autoPlay
                            muted
                            playsInline
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full border-2 border-blue-500 p-12">
                              <div className="h-32 w-32 rounded-full border-2 border-blue-400/50 animate-pulse" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-zinc-400">
                            Position your face within the frame and look at the camera
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            We'll verify that you're a real person
                          </p>
                        </div>

                        <button
                          onClick={startLivelinessCheck}
                          disabled={livelinessLoading}
                          className="flex items-center gap-2 rounded-lg bg-blue-500 px-8 py-3 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                        >
                          {livelinessLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" />
                              Start Verification
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="rounded-full bg-green-500/20 p-4">
                          <CheckCircle className="h-12 w-12 text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Verification Complete!</h3>
                        <p className="text-sm text-zinc-400">Your liveliness check has been verified successfully.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={goToPreviousStep}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={goToNextStep}
                    disabled={!livelinessVerified}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete Verification
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Completion */}
            {currentStep === 4 && (
              <div className="py-8 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-yellow-500/20 p-6">
                    <Clock className="h-16 w-16 text-yellow-400 animate-pulse" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white">Verification Pending</h2>
                <p className="mt-2 text-zinc-400">
                  Your verification is currently being reviewed by our team.
                </p>
                
                <div className="mx-auto mt-6 max-w-md rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm text-zinc-300">
                        We will send you an update regarding your verification status.
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        This process usually takes 24-48 hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-center gap-3 text-sm text-zinc-400">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Phone Verified
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Email Verified
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      ID Verified
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Liveliness Check
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/profile')}
                  className="mt-8 rounded-lg bg-blue-500 px-8 py-3 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                  Return to Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verification;