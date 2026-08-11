import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ArrowRight } from "lucide-react";
import type { AxiosError } from "axios";
import ShapeGrid from "../../components/ui/ShapeGrid";
import api from "@/lib/axios";
import { toast } from "react-hot-toast";

const T = {
  bg:        "#080a12",
  bgInput:   "#13151f",
  border:    "#2a2d3e",
  borderFoc: "#4a6fa5",
  accent:    "#4a6fa5",
  text:      "#ffffff",
  muted:     "#888",
  dim:       "#555",
  error:     "#e05252",
  fontBody:  "'Plus Jakarta Sans', sans-serif",
};

type Place = {
  id: string;
  label: string;
  address: string;
  country: string;
  zipCode: string;
};

export default function PersonalDetails() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [addressWasSelected, setAddressWasSelected] = useState(false);
  const [form, setForm] = useState({
    middleName: "",
    suffix: "",
    birthDate: "",
    country: "Philippines",
    zipCode: "",
    address: "",
  });

  // ✅ Helper function to format date to YYYY-MM-DD
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";
    
    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Parse the date string and format to YYYY-MM-DD
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "";
      }
      
      // Get local date components to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  useEffect(() => { 
    const fetchCountries = async () => {
      try {
        const response = await api.get('/api/countries');
        setCountries(response.data.countries || []);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);
  
  useEffect(() => {
    const fetchPersonalDetails = async () => {
      try {
        const response = await api.get("/api/onboarding/state");
        if (response.data.completed) return navigate("/home", { replace: true });
        if (response.data.path !== '/setup/personal-details') return navigate(response.data.path, { replace: true });
        const data = response.data.data?.personal_details;
        if (data) {
          const restoredBirthDate = formatDateForInput(data.birthDate || "");
          setForm({ middleName: data.middleName || "", suffix: data.suffix || "", birthDate: restoredBirthDate, country: data.country || "Philippines", zipCode: data.zipCode || "", address: data.address || "" });
          setAddressWasSelected(Boolean(data.address));
        }
      } catch (error) {
        console.error("Error fetching personal details:", error);
      }
    };
    fetchPersonalDetails();
  }, []);

  useEffect(() => {
    if (addressWasSelected || form.address.trim().length < 3) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await api.get('/api/onboarding/addresses', {
          params: { q: form.address },
          signal: controller.signal,
        });
        setPlaces(response.data.places || []);
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'ERR_CANCELED') return;
        console.error("Error fetching places:", err);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.address, addressWasSelected]);

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (key === 'address') setAddressWasSelected(false);
    if (errors[key]) setErrors({ ...errors, [key]: "" });
  };

  // ✅ FIX: Handle place selection - ONLY update form, NOT originalForm
  const handlePlaceSelect = (place: Place) => {
    setForm(prev => ({
      ...prev,
      country: place.country || prev.country,
      zipCode: place.zipCode || prev.zipCode,
      address: place.address
    }));
    setAddressWasSelected(true);
    setPlaces([]);
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    if (!form.birthDate) newErrors.birthDate = "Birth date is required.";
    if (!form.address.trim()) newErrors.address = "Address is required.";
    if (!form.zipCode.trim()) newErrors.zipCode = "Zip code is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        middleName: form.middleName || "",
        suffix: form.suffix || "",
        birthDate: form.birthDate || "",
        country: form.country || "Philippines",
        zipCode: form.zipCode || "",
        address: form.address || ""
      };
      
      await api.post("/api/onboarding/personal-details", payload);
      toast.success("Personal details saved for onboarding.");
      navigate("/setup/upload-image");
    } catch (err: unknown) {
      const apiError = err as AxiosError<{ errors?: Record<string, string>; message?: string }>;
      console.error("Error updating personal details:", apiError.response?.data || apiError.message || err);
      setErrors(apiError.response?.data?.errors || { general: "An error occurred. Please try again." });
      toast.error(apiError.response?.data?.message || "Failed to save personal details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .setup-page-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 100vh;
          background: ${T.bg};
          padding: 80px 20px;
          overflow-x: hidden;
        }

        .canvas-bg-container {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: auto;
        }

        .setup-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          font-family: ${T.fontBody};
          background: rgba(8, 10, 18, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 32px;
          border-radius: 20px;
          border: 1px solid rgba(42, 45, 62, 0.4);
        }

        .animated-content {
          opacity: 0;
          transform: translateY(10px);
          animation: smooth-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
          flex: 1;
        }

        .input-label {
          color: ${T.muted};
          font-size: 12px;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 12px 14px;
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: all .15s ease;
        }

        .form-input:focus {
          border-color: ${T.borderFoc};
        }

        .error-text {
          color: ${T.error};
          font-size: 11px;
          margin-top: 4px;
        }

        @keyframes smooth-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="setup-page-wrapper">
        <div className="canvas-bg-container">
          <ShapeGrid
            direction="diagonal"
            speed={0.3}
            borderColor="rgba(42, 45, 62, 0.3)"
            squareSize={45}
            hoverFillColor="rgba(74, 111, 165, 0.15)"
            hoverTrailAmount={4}
            shape="square"
          />
        </div>

        <form onSubmit={handleNext} className="setup-card">
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>2 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "40%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

          <div className="animated-content">
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20,
            }}>
              <User className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              Additional Personal details
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Please fill out your identity particulars to build your verified editor portfolio workspace.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="input-group">
                <span className="input-label">Middle Name (Optional)</span>
                <input type="text" value={form.middleName} onChange={handleChange("middleName")} className="form-input" placeholder="Optional" />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-label">Suffix (Optional)</span>
                <select
                  value={form.suffix}
                  onChange={handleChange("suffix")}
                  className="form-input"
                >
                  <option value="">Select Suffix</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <span className="input-label">Birth Date</span>
              <input
                type="date"
                value={form.birthDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={handleChange("birthDate")}
                className="form-input"
                style={{ borderColor: errors.birthDate ? T.error : T.border, colorScheme: "dark" }}
              />
              {errors.birthDate && <span className="error-text">{errors.birthDate}</span>}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="input-group" style={{ flex: 2 }}>
                <span className="input-label">Country</span>
                <select value={form.country} onChange={handleChange("country")} className="form-input" style={{ background: T.bgInput }}>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-label">Zip Code</span>
                <input type="text" value={form.zipCode} onChange={handleChange("zipCode")} className="form-input" placeholder="6000" style={{ borderColor: errors.zipCode ? T.error : T.border }} />
                {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 32, position: "relative" }}>
              <span className="input-label">Street Address</span>
              <input
                type="text"
                value={form.address}
                onChange={handleChange("address")}
                className="form-input"
                placeholder="House No., Street name, Barangay, City"
              />

              {places.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#13151f",
                    border: "1px solid #2a2d3e",
                    borderRadius: 8,
                    marginTop: 6,
                    maxHeight: 250,
                    overflowY: "auto",
                    zIndex: 1000,
                    color: "#fff"
                  }}
                >
                  {places.map((place) => (
                    <div
                      key={place.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePlaceSelect(place);
                      }}
                      style={{
                        padding: "12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #2a2d3e"
                      }}
                    >
                      <strong>{place.label}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, background: loading ? "#555" : "#fff", color: "#080a12", border: "none", padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease"
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#e8e8e8"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
              >
                {loading ? "Saving..." : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
