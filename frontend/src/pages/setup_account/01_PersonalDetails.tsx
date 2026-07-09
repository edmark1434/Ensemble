import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ArrowRight, ArrowLeft } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid"; // Adjust import depth if needed

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
  fontBody:    "'Plus Jakarta Sans', sans-serif",
};

export default function PersonalDetails() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [form, setForm] = useState({
    firstName: "John Paul",
    middleName: "",
    lastName: "Mahilom",
    suffix: "",
    birthDate: "",
    country: "Philippines",
    zipCode: "",
    address: "",
  });

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: "" });
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    if (!form.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!form.birthDate) newErrors.birthDate = "Birth date is required.";
    if (!form.address.trim()) newErrors.address = "Address is required.";
    if (!form.zipCode.trim()) newErrors.zipCode = "Zip code is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate("/setup/upload-image");
    } catch (err) {
      console.error(err);
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
        {/* Identical Structural Background Canvas Setup */}
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
          {/* Progress fill smoothly increments to 40% inside static coordinates */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>2 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "40%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

          {/* Entry Form Nodes */}
          <div className="animated-content">
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20,
            }}>
              <User className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              Personal details
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Please fill out your identity particulars to build your verified editor portfolio workspace.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="input-group">
                <span className="input-label">First Name</span>
                <input type="text" value={form.firstName} onChange={handleChange("firstName")} className="form-input" style={{ borderColor: errors.firstName ? T.error : T.border }} />
                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
              </div>
              <div className="input-group">
                <span className="input-label">Middle Name</span>
                <input type="text" value={form.middleName} onChange={handleChange("middleName")} className="form-input" placeholder="Optional" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="input-group" style={{ flex: 3 }}>
                <span className="input-label">Last Name</span>
                <input type="text" value={form.lastName} onChange={handleChange("lastName")} className="form-input" style={{ borderColor: errors.lastName ? T.error : T.border }} />
                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-label">Suffix</span>
                <input type="text" value={form.suffix} onChange={handleChange("suffix")} className="form-input" placeholder="Jr" />
              </div>
            </div>

            <div className="input-group">
              <span className="input-label">Birth Date</span>
              <input type="date" value={form.birthDate} onChange={handleChange("birthDate")} className="form-input" style={{ borderColor: errors.birthDate ? T.error : T.border, colorScheme: "dark" }} />
              {errors.birthDate && <span className="error-text">{errors.birthDate}</span>}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="input-group" style={{ flex: 2 }}>
                <span className="input-label">Country</span>
                <select value={form.country} onChange={handleChange("country")} className="form-input" style={{ background: T.bgInput }}>
                  <option value="Philippines">Philippines</option>
                  <option value="United States">United States</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <span className="input-label">Zip Code</span>
                <input type="text" value={form.zipCode} onChange={handleChange("zipCode")} className="form-input" placeholder="6000" style={{ borderColor: errors.zipCode ? T.error : T.border }} />
                {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 32 }}>
              <span className="input-label">Street Address</span>
              <input type="text" value={form.address} onChange={handleChange("address")} className="form-input" placeholder="House No., Street name, Barangay, City" style={{ borderColor: errors.address ? T.error : T.border }} />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/setup/verify-email")}
                style={{
                  flex: 1, background: "none", border: `1px solid ${T.border}`, color: T.text, padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

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