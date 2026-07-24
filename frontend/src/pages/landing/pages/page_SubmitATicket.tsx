import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { TICKET_TYPE_OPTIONS } from "@/pages/admin/ticketManagement/ticketTypes";

const PageSubmitATicket: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [ticketType, setTicketType] = useState<string>("Other");
  const [description, setDescription] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post("/api/users/tickets", {
        email: email.trim(),
        subject: subject.trim(),
        type: ticketType,
        description: description.trim(),
        channel: "web",
        priority: "Medium",
      });
      if (res.data?.success) {
        setTicketNumber(res.data.data?.ticketNumber || null);
        setSubmitted(true);
      } else {
        setError(res.data?.message || "Failed to submit ticket");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to submit ticket";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "#7a8499",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            marginBottom: 40,
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>Submit a Ticket</h1>
        <p style={{ color: "#7a8499", fontSize: 15, marginBottom: 36 }}>
          Encountered a bug or an escrow processing issue? File a support ticket and our team will look into it.
        </p>

        {submitted ? (
          <div
            style={{
              background: "rgba(45,212,191,0.05)",
              border: "1px solid rgba(45,212,191,0.2)",
              padding: 24,
              borderRadius: 12,
            }}
          >
            <h4 style={{ color: "#2dd4bf", fontSize: 18, marginBottom: 8 }}>Ticket submitted successfully</h4>
            <p style={{ color: "#7a8499", fontSize: 14 }}>
              {ticketNumber ? (
                <>
                  Your ticket number is <strong style={{ color: "#fff" }}>{ticketNumber}</strong>. Our team will follow
                  up within 24 hours.
                </>
              ) : (
                "Our customer success team will follow up via email within 24 hours."
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>
                Email Address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d0f1a",
                  border: "1px solid #1e2130",
                  borderRadius: 10,
                  padding: "14px",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>
                Ticket Type
              </label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d0f1a",
                  border: "1px solid #1e2130",
                  borderRadius: 10,
                  padding: "14px",
                  color: "#fff",
                  outline: "none",
                }}
              >
                {TICKET_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>
                Issue Subject
              </label>
              <input
                required
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d0f1a",
                  border: "1px solid #1e2130",
                  borderRadius: 10,
                  padding: "14px",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>
                Detailed Description
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d0f1a",
                  border: "1px solid #1e2130",
                  borderRadius: 10,
                  padding: "14px",
                  color: "#fff",
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontWeight: 700,
                cursor: submitting ? "wait" : "pointer",
                marginTop: 10,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting…" : "Submit Ticket"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PageSubmitATicket;
