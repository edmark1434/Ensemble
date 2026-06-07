import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Bot, User, ArrowLeft } from "lucide-react";

interface Msg { sender: "bot" | "user"; text: string; }

const PageAskOurChatbot: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([
    { sender: "bot", text: "Hi! I am the Ensemble Support Assistant. Ask me anything about posting projects, editing tools, or portfolio badges." }
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInput("");

    setTimeout(() => {
      setMessages(prev => [...prev, { sender: "bot", text: "Thanks for reaching out! To learn more about that topic, you can browse our active /landing/pages options or submit an official track ticket." }]);
    }, 800);
  };

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", height: "85vh", display: "flex", flexDirection: "column" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Chat Header */}
        <div style={{ background: "#0d0f1a", border: "1px solid #1e2130", borderBottom: "none", padding: "20px 32px", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "rgba(59,130,246,0.1)", padding: 8, borderRadius: 50 }}><Bot size={20} color="#3b82f6" /></div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>AI Support Assistant</h3>
            <span style={{ fontSize: 12, color: "#2dd4bf" }}>Online</span>
          </div>
        </div>

        {/* Message Log Grid */}
        <div style={{ flex: 1, background: "rgba(13,15,26,0.5)", border: "1px solid #1e2130", padding: 32, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((m, idx) => {
            const isBot = m.sender === "bot";
            return (
              <div key={idx} style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", gap: 12 }}>
                {isBot && <div style={{ background: "#111827", padding: 8, borderRadius: 50, height: "fit-content" }}><Bot size={16} color="#3b82f6" /></div>}
                <div style={{ background: isBot ? "#1e2130" : "#3b82f6", color: "#fff", padding: "12px 18px", borderRadius: 12, maxWidth: "70%", fontSize: 14, lineHeight: 1.5 }}>
                  {m.text}
                </div>
                {!isBot && <div style={{ background: "#111827", padding: 8, borderRadius: 50, height: "fit-content" }}><User size={16} color="#fff" /></div>}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input Bar */}
        <div style={{ background: "#0d0f1a", border: "1px solid #1e2130", borderTop: "none", padding: 16, borderRadius: "0 0 16px 16px", display: "flex", gap: 12 }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a support request..." style={{ flex: 1, background: "#080a12", border: "1px solid #1e2130", borderRadius: 10, padding: "0 16px", color: "#fff", outline: "none" }} />
          <button onClick={handleSend} style={{ background: "#fff", border: "none", borderRadius: 10, width: 44, height: 44, display: "flex", alignItems: "center", justifyContext: "center", cursor: "pointer", paddingLeft: 12 }}><Send size={16} color="#000" /></button>
        </div>
      </div>
    </div>
  );
};

export default PageAskOurChatbot;