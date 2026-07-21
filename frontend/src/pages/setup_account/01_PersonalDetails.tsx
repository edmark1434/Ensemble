import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ArrowRight, ArrowLeft } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";
import axios from "axios";
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
  properties: {
    osm_id: number;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

export default function PersonalDetails() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [originalForm, setOriginalForm] = useState({
    middleName: "",
    suffix: "",
    birthDate: "",
    country: "",
    zipCode: "",
    address: "",
  });
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
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/countries`);
        setCountries(response.data.countries || []);
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);
  
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const response = await api.get("/api/users/session");
      if (response.data.steps) {
        navigate("/*");
      }
    }
    checkOnboardingStatus();
  }, []);
  
  useEffect(() => {
    const fetchPersonalDetails = async () => {
      try {
        const response = await api.get("/api/accounts/personal-details");
        if (response.status === 200 && response.data.success) {
          const data = response.data.data;
          
          // ✅ Format the birth date for the input field
          const formattedBirthDate = formatDateForInput(data.birth_date || "");
          
          // ✅ Store the actual values from database (null or empty)
          const formData = {
            middleName: data.middle_name || "",
            suffix: data.suffix || "",
            birthDate: formattedBirthDate,
            country: data.country || "", // ✅ Keep as empty string if null
            zipCode: data.zip_code || "",
            address: data.address || ""
          };
          
          // ✅ Set form with the data (fallback to "Philippines" for display)
          setForm({
            ...formData,
            country: data.country || "Philippines", // Display default
          });
          
          // ✅ Set originalForm with the actual data from database (no defaults)
          setOriginalForm(formData);
        }
      } catch (error) {
        console.error("Error fetching personal details:", error);
      }
    };
    fetchPersonalDetails();
  }, []);

  useEffect(() => {
    if (!form.address.trim()) {
      setPlaces([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/places`, {
          params: { q: form.address }
        });
        setPlaces(response.data.places || []);
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [form.address]);

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: "" });
  };

  // ✅ FIX: Handle place selection - ONLY update form, NOT originalForm
  const handlePlaceSelect = (place: Place) => {
    const formattedAddress = `${place.properties.name || ''}, ${place.properties.city ?? ''}, ${place.properties.state ?? ''}`.trim().replace(/,\s*$/, '');
    
    const country = place.properties.country || "Philippines";
    const zipCode = place.properties.postcode || "";
    
    // ✅ Only update form
    setForm(prev => ({
      ...prev,
      country: country,
      zipCode: zipCode,
      address: formattedAddress
    }));
    
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
      // ✅ Check if originalForm has data (check if any field has a value)
      const hasOriginalData = Object.values(originalForm).some(value => 
        value !== "" && value !== null && value !== undefined
      );
      
      // Prepare the payload with proper data
      const payload = {
        middleName: form.middleName || "",
        suffix: form.suffix || "",
        birthDate: form.birthDate || "",
        country: form.country || "Philippines",
        zipCode: form.zipCode || "",
        address: form.address || ""
      };
      
      console.log("📊 Original Form (from DB):", originalForm);
      console.log("📊 Current Form (user edits):", form);
      console.log("📊 Has Original Data:", hasOriginalData);
      
      if (!hasOriginalData) {
        // First time saving - POST
        console.log("📊 First time saving - POST");
        const response = await api.post("/api/users/update-personal-details", payload);
        if (response.status === 200 && response.data.success) {
          toast.success("Personal details saved successfully.");
          navigate("/setup/upload-image");
        }
      } else {
        // ✅ Only send updates that have changed
        const updates: any = {};
        const original: any = {};
        
        // Check each field for changes
        // ✅ Compare with originalForm (which has the actual database values)
        if (form.middleName !== originalForm.middleName) {
          updates.middleName = form.middleName;
          original.middleName = originalForm.middleName;
        }
        if (form.suffix !== originalForm.suffix) {
          updates.suffix = form.suffix;
          original.suffix = originalForm.suffix;
        }
        if (form.birthDate !== originalForm.birthDate) {
          updates.birthDate = form.birthDate;
          original.birthDate = originalForm.birthDate;
        }
        // ✅ Compare country: if original is empty/undefined and form has "Philippines", it's a change
        if (form.country !== originalForm.country) {
          updates.country = form.country;
          original.country = originalForm.country;
        }
        if (form.zipCode !== originalForm.zipCode) {
          updates.zipCode = form.zipCode;
          original.zipCode = originalForm.zipCode;
        }
        if (form.address !== originalForm.address) {
          updates.address = form.address;
          original.address = originalForm.address;
        }
        
        console.log("📊 Detected changes:", updates);
        
        // ✅ If there are changes, send them
        if (Object.keys(updates).length > 0) {
          const updatePayload = { 
            originalForm: {
              middleName: original.middleName || originalForm.middleName || "",
              suffix: original.suffix || originalForm.suffix || "",
              birthDate: original.birthDate || originalForm.birthDate || "",
              country: original.country || originalForm.country || "",
              zipCode: original.zipCode || originalForm.zipCode || "",
              address: original.address || originalForm.address || ""
            }, 
            updates: {
              middleName: updates.middleName || form.middleName || "",
              suffix: updates.suffix || form.suffix || "",
              birthDate: updates.birthDate || form.birthDate || "",
              country: updates.country || form.country || "Philippines",
              zipCode: updates.zipCode || form.zipCode || "",
              address: updates.address || form.address || ""
            } 
          };
          
          console.log("📊 Update Payload being sent:", JSON.stringify(updatePayload, null, 2));
          
          const response = await api.put("/api/accounts/update-profile-user", updatePayload);
          if (response.status === 200 && response.data.success) {
            toast.success(response.data.message || "Personal details updated successfully.");
            navigate("/setup/upload-image");
          }
        } else {
          // No changes detected
          console.log("📊 No changes detected, skipping update");
          toast.info("No changes to save.");
          navigate("/setup/upload-image");
        }
      }
    } catch (err: any) {
      console.error("Error updating personal details:", err.response?.data || err.message || err);
      setErrors(err.response?.data?.errors || { general: "An error occurred. Please try again." });
      toast.error(err.response?.data?.message || "Failed to save personal details.");
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
                <span className="input-label">Middle Name</span>
                <input type="text" value={form.middleName} onChange={handleChange("middleName")} className="form-input" placeholder="Optional" />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-label">Suffix</span>
                <select
                  value={form.suffix}
                  onChange={handleChange("suffix")}
                  className="form-input"
                >
                  <option disabled value="">Select Suffix</option>
                  <option value="">N/A</option>
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
                      key={place.properties.osm_id}
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
                      <strong>{place.properties.name}</strong>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {place.properties.city}
                        {place.properties.city && ", "}
                        {place.properties.state}
                        {place.properties.state && ", "}
                        {place.properties.country}
                      </div>
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