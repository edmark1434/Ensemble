import useGlobalState from "@/lib/global_state";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

interface Source { title: string; heading: string; url: string; }
interface VerifiedLink { id: string; label: string; url: string; }
interface Msg { sender: "bot" | "user"; text: string; sources?: Source[]; links?: VerifiedLink[]; error?: boolean; }

interface ChatResponse {
  success: boolean;
  answer: string;
  sources: Source[];
  links: VerifiedLink[];
}

interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Msg = {
  sender: "bot",
  text: "Hi! I’m Joeds AI, Ensemble’s support assistant. I can help with Ensemble accounts, projects, jobs, marketplace assets, credits, subscriptions, collaboration, forums, and support processes.",
};

const QUICK_QUESTIONS = [
  "What subscription plans are available?",
  "How do I verify my account?",
  "How do credits and top-ups work?",
  "How do I submit a support ticket?",
];

const PageAskOurChatbot: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);

  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = async (question = input) => {
    const userText = question.trim();
    if (!userText || isSending || userText.length > 2000) return;
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setIsSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      const history: ChatHistoryMessage[] = messages.slice(-10).map((message) => ({
        role: message.sender === "bot" ? "assistant" : "user",
        content: message.text,
      }));
      const response = await axios.post<ChatResponse>(
        `${API_BASE_URL}/api/chat`,
        { message: userText, history },
        {
          withCredentials: false,
          headers: { "ngrok-skip-browser-warning": "true" },
        },
      );
      setMessages(prev => [...prev, {
        sender: "bot",
        text: response.data.answer,
        sources: response.data.sources || [],
        links: response.data.links || [],
      }]);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "The support assistant is temporarily unavailable. Please try again."
        : "The support assistant is temporarily unavailable. Please try again.";
      setMessages(prev => [...prev, { sender: "bot", text: message, error: true }]);
    } finally {
      setIsSending(false);
    }
  };

  const resetConversation = () => {
    if (isSending) return;
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <main className="ensemble-chat-page">
      <div className="ensemble-chat-glow" aria-hidden="true" />
      <div className="ensemble-chat-shell">
        <button className="ensemble-back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Ensemble
        </button>

        <section className="ensemble-chat-intro">
          <span className="ensemble-eyebrow"><Sparkles size={14} /> Ensemble support</span>
          <h1>How can we help?</h1>
          <p>Get clear answers about Ensemble, grounded in our current platform documentation.</p>
        </section>

        <div className="ensemble-chat-workspace">
          <aside className="ensemble-chat-sidebar">
            <div className="ensemble-assistant-card">
              <div className="ensemble-assistant-icon"><img src="/ensemble_lg.svg" alt="Ensemble" /></div>
              <div>
                <strong>Joeds AI</strong>
                <small>by Ensemble</small>
                <span><i /> Documentation online</span>
              </div>
            </div>

            <div className="ensemble-sidebar-section">
              <h2><MessageCircleQuestion size={15} /> Popular questions</h2>
              <div className="ensemble-quick-list">
                {QUICK_QUESTIONS.map((question) => (
                  <button key={question} onClick={() => void handleSend(question)} disabled={isSending}>
                    {question}<ArrowLeft size={14} />
                  </button>
                ))}
              </div>
            </div>

            <div className="ensemble-sidebar-note">
              <ShieldCheck size={17} />
              <div><strong>Guest access</strong><span>No login or session is required.</span></div>
            </div>
            <div className="ensemble-sidebar-note">
              <BookOpen size={17} />
              <div><strong>Verified guidance</strong><span>Page links come from Ensemble documentation.</span></div>
            </div>
          </aside>

          <section className="ensemble-conversation" aria-label="Ensemble support conversation">
            <header className="ensemble-conversation-header">
              <div>
                <strong>Conversation</strong>
                <span>{messages.length - 1} {messages.length === 2 ? "message" : "messages"}</span>
              </div>
              <button onClick={resetConversation} disabled={isSending || messages.length === 1}>
                <RotateCcw size={14} /> Start over
              </button>
            </header>

            <div className="ensemble-message-log" aria-live="polite">
          {messages.map((m, idx) => {
            const isBot = m.sender === "bot";
            return (
              <div key={idx} className={`ensemble-message-row ${isBot ? "is-bot" : "is-user"}`}>
                <div className="ensemble-message-avatar" aria-hidden="true">
                  {isBot ? <img src="/ensemble_lg.svg" alt="" /> : <User size={16} />}
                </div>
                <div className={`ensemble-message-bubble ${m.error ? "is-error" : ""}`}>
                  <InlineAnswer text={m.text} links={m.links || []} />
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="ensemble-message-row is-bot" role="status">
              <div className="ensemble-message-avatar is-thinking" aria-label="Joeds AI is thinking">
                <img src="/ensemble_lg.svg" alt="" />
              </div>
              <div className="ensemble-message-bubble ensemble-typing">
                <span /><span /><span /><em>Joeds AI is searching Ensemble documentation</em>
              </div>
            </div>
          )}
          <div ref={endRef} />
            </div>

            <form className="ensemble-composer" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
              <div className="ensemble-input-wrap">
                <textarea
                  ref={textareaRef}
                  value={input}
                  maxLength={2000}
                  rows={1}
                  disabled={isSending}
                  aria-label="Support question"
                  onChange={(event) => { setInput(event.target.value); setTimeout(adjustTextareaHeight, 0); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Ask anything about Ensemble..."
                />
                <span>{input.length}/2000</span>
              </div>
              <button type="submit" disabled={isSending || !input.trim()} aria-label="Send support question"><Send size={18} /></button>
            </form>
            <p className="ensemble-chat-disclaimer">AI responses may be imperfect. Contact support for account-specific or payment concerns.</p>
          </section>
        </div>
      </div>
      <style>{`
        .ensemble-chat-page { position: relative; min-height: 100vh; overflow: hidden; background: ${theme === 'dark' ? "#121214" : "#f9fafb"}; color: ${theme === 'dark' ? "#f8fafc" : "#111827"}; padding: 36px 32px 48px; font-family: "Plus Jakarta Sans", sans-serif; }
        .ensemble-chat-glow { position: absolute; top: -180px; left: 50%; width: 620px; height: 360px; transform: translateX(-50%); border-radius: 50%; background: rgba(37, 99, 235, .12); filter: blur(100px); pointer-events: none; }
        .ensemble-chat-shell { position: relative; z-index: 1; width: min(1160px, 100%); margin: 0 auto; }
        .ensemble-back-button { display: inline-flex; align-items: center; gap: 8px; padding: 8px 0; border: 0; background: transparent; color: ${theme === 'dark' ? "#7a8499" : "#6b7280"}; font: inherit; font-size: 13px; cursor: pointer; transition: color .2s ease; }
        .ensemble-back-button:hover { color: ${theme === 'dark' ? "#ffffff" : "#111827"}; }
        .ensemble-chat-intro { margin: 30px 0 26px; text-align: center; }
        .ensemble-eyebrow { display: inline-flex; align-items: center; gap: 7px; color: #60a5fa; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        .ensemble-chat-intro h1 { margin: 10px 0 8px; font-size: clamp(30px, 4vw, 46px); line-height: 1.1; letter-spacing: -.04em; color: ${theme === 'dark' ? "#ffffff" : "#111827"}; }
        .ensemble-chat-intro p { margin: 0; color: ${theme === 'dark' ? "#8b95a7" : "#4b5563"}; font-size: 15px; }
        
        .ensemble-chat-workspace { display: grid; grid-template-columns: 290px minmax(0, 1fr); height: 690px; max-height: calc(100vh - 200px); overflow: hidden; border: 1px solid ${theme === 'dark' ? "#27272a" : "#e5e7eb"}; border-radius: 18px; background: ${theme === 'dark' ? "#18181b" : "#ffffff"}; box-shadow: ${theme === 'dark' ? "0 24px 70px rgba(0,0,0,.28)" : "0 24px 70px rgba(0,0,0,.08)"}; }
        
        .ensemble-chat-sidebar { display: flex; flex-direction: column; gap: 24px; padding: 24px; min-height: 0; overflow-y: auto; border-right: 1px solid ${theme === 'dark' ? "#1e2130" : "#e5e7eb"}; background: ${theme === 'dark' ? "#0a0c15" : "#f8fafc"}; }
        .ensemble-assistant-card { display: flex; align-items: center; gap: 12px; }
        .ensemble-assistant-icon { display: grid; place-items: center; width: 46px; height: 46px; flex: 0 0 46px; border: 1px solid rgba(59,130,246,.25); border-radius: 13px; background: rgba(59,130,246,.1); }
        .ensemble-assistant-icon img { width: 30px; height: 30px; object-fit: contain; filter: ${theme === 'dark' ? 'none' : 'invert(1)'}; opacity: ${theme === 'dark' ? '1' : '0.7'}; }
        .ensemble-assistant-card strong, .ensemble-assistant-card small, .ensemble-assistant-card span { display: block; }
        .ensemble-assistant-card strong { font-size: 14px; color: ${theme === 'dark' ? "#ffffff" : "#111827"}; }
        .ensemble-assistant-card small { margin-top: 1px; color: ${theme === 'dark' ? "#64748b" : "#6b7280"}; font-size: 9px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
        .ensemble-assistant-card span { margin-top: 5px; color: ${theme === 'dark' ? "#8b95a7" : "#4b5563"}; font-size: 11px; }
        .ensemble-assistant-card i { display: inline-block; width: 6px; height: 6px; margin-right: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 3px rgba(52,211,153,.1); }
        
        .ensemble-sidebar-section { flex: 1; }
        .ensemble-sidebar-section h2 { display: flex; align-items: center; gap: 7px; margin: 0 0 10px; color: ${theme === 'dark' ? "#7a8499" : "#6b7280"}; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .ensemble-quick-list { display: grid; gap: 7px; }
        .ensemble-quick-list button { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 11px 12px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: ${theme === 'dark' ? "#aab3c2" : "#4b5563"}; font: inherit; font-size: 12px; line-height: 1.4; text-align: left; cursor: pointer; transition: .2s ease; }
        .ensemble-quick-list button:hover:not(:disabled) { border-color: ${theme === 'dark' ? "#262a3b" : "#e2e8f0"}; background: ${theme === 'dark' ? "#111522" : "#f1f5f9"}; color: ${theme === 'dark' ? "#ffffff" : "#111827"}; }
        .ensemble-quick-list button:hover svg { color: #60a5fa; }
        
        .ensemble-sidebar-note { display: flex; gap: 10px; color: ${theme === 'dark' ? "#64748b" : "#6b7280"}; }
        .ensemble-sidebar-note svg { flex: 0 0 auto; margin-top: 1px; color: #3b82f6; }
        .ensemble-sidebar-note strong, .ensemble-sidebar-note span { display: block; }
        .ensemble-sidebar-note strong { color: ${theme === 'dark' ? "#aab3c2" : "#374151"}; font-size: 11px; }
        .ensemble-sidebar-note span { margin-top: 3px; font-size: 10px; line-height: 1.5; }
        
        .ensemble-conversation { display: grid; min-width: 0; min-height: 0; grid-template-rows: auto minmax(0, 1fr) auto auto; background: ${theme === 'dark' ? "rgba(13,15,26,.72)" : "#ffffff"}; }
        .ensemble-conversation-header { display: flex; align-items: center; justify-content: space-between; min-height: 70px; padding: 0 24px; border-bottom: 1px solid ${theme === 'dark' ? "#1e2130" : "#e5e7eb"}; }
        .ensemble-conversation-header strong, .ensemble-conversation-header span { display: block; }
        .ensemble-conversation-header strong { font-size: 14px; color: ${theme === 'dark' ? "#ffffff" : "#111827"}; }
        .ensemble-conversation-header span { margin-top: 3px; color: ${theme === 'dark' ? "#667085" : "#6b7280"}; font-size: 11px; }
        .ensemble-conversation-header button { display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px; border: 1px solid ${theme === 'dark' ? "#25293a" : "#e2e8f0"}; border-radius: 8px; background: transparent; color: ${theme === 'dark' ? "#8b95a7" : "#4b5563"}; font: inherit; font-size: 11px; cursor: pointer; }
        .ensemble-conversation-header button:hover:not(:disabled) { border-color: #3b82f6; color: ${theme === 'dark' ? "#ffffff" : "#111827"}; background: ${theme === 'dark' ? "transparent" : "#f8fafc"}; }
        .ensemble-conversation-header button:disabled, .ensemble-quick-list button:disabled { opacity: .45; cursor: not-allowed; }
        
        .ensemble-message-log { display: flex; flex-direction: column; gap: 20px; min-height: 0; padding: 28px; overflow-y: auto; scrollbar-color: ${theme === 'dark' ? "#262a3b transparent" : "#cbd5e1 transparent"}; }
        .ensemble-message-row { display: flex; align-items: flex-start; gap: 10px; }
        .ensemble-message-row.is-user { flex-direction: row-reverse; }
        .ensemble-message-avatar { position: relative; display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 32px; border: 1px solid ${theme === 'dark' ? "#25293a" : "#e2e8f0"}; border-radius: 9px; background: ${theme === 'dark' ? "#111522" : "#f1f5f9"}; color: #60a5fa; }
        .ensemble-message-avatar img { width: 20px; height: 20px; object-fit: contain; filter: ${theme === 'dark' ? 'none' : 'invert(1)'}; opacity: ${theme === 'dark' ? '1' : '0.7'}; }
        .ensemble-message-row.is-user .ensemble-message-avatar { color: ${theme === 'dark' ? "#ffffff" : "#111827"}; }
        .ensemble-message-avatar.is-thinking img { animation: ensemble-logo-pulse 1.4s ease-in-out infinite; }
        .ensemble-message-avatar.is-thinking::after { position: absolute; inset: -4px; border: 1px solid transparent; border-top-color: #60a5fa; border-right-color: rgba(96,165,250,.25); border-radius: 11px; content: ""; animation: ensemble-logo-orbit 1.2s linear infinite; }
        
        .ensemble-message-bubble { max-width: min(74%, 650px); padding: 12px 15px; border: 1px solid ${theme === 'dark' ? "#25293a" : "#e2e8f0"}; border-radius: 4px 13px 13px; background: ${theme === 'dark' ? "#151925" : "#f8fafc"}; color: ${theme === 'dark' ? "#d8dee9" : "#334155"}; font-size: 13px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
        .ensemble-message-row.is-user .ensemble-message-bubble { border-color: #2563eb; border-radius: 13px 4px 13px 13px; background: #2563eb; color: #ffffff; }
        .ensemble-message-bubble.is-error { border-color: rgba(248,113,113,.3); background: rgba(127,29,29,.25); color: #fecaca; }
        
        .ensemble-typing { display: flex; align-items: center; gap: 4px; color: ${theme === 'dark' ? "#8b95a7" : "#64748b"}; }
        .ensemble-typing span { width: 5px; height: 5px; border-radius: 50%; background: #60a5fa; animation: ensemble-bounce 1.15s infinite ease-in-out; }
        .ensemble-typing span:nth-child(2) { animation-delay: .12s; } .ensemble-typing span:nth-child(3) { animation-delay: .24s; }
        .ensemble-typing em { margin-left: 7px; font-style: normal; font-size: 11px; }
        
        .ensemble-composer { display: flex; align-items: flex-end; gap: 10px; margin: 0 24px; padding: 10px; border: 1px solid ${theme === 'dark' ? "#262a3b" : "#e2e8f0"}; border-radius: 13px; background: ${theme === 'dark' ? "#121214" : "#f1f5f9"}; transition: border-color .2s ease; }
        .ensemble-composer:focus-within { border-color: #3b82f6; }
        .ensemble-input-wrap { min-width: 0; flex: 1; }
        .ensemble-input-wrap textarea { display: block; width: 100%; max-height: 120px; resize: none; overflow-y: auto; border: 0; outline: 0; background: transparent; color: ${theme === 'dark' ? "#f8fafc" : "#111827"}; font: inherit; font-size: 13px; line-height: 1.5; }
        .ensemble-input-wrap textarea::placeholder { color: ${theme === 'dark' ? "#596276" : "#94a3b8"}; }
        .ensemble-input-wrap span { display: block; margin-top: 3px; color: ${theme === 'dark' ? "#4f596c" : "#94a3b8"}; font-size: 9px; text-align: right; }
        .ensemble-composer > button { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 40px; border: 0; border-radius: 10px; background: ${theme === 'dark' ? "#ffffff" : "#111827"}; color: ${theme === 'dark' ? "#080a12" : "#ffffff"}; cursor: pointer; transition: transform .2s ease, opacity .2s ease; }
        .ensemble-composer > button:hover:not(:disabled) { transform: translateY(-1px); }
        .ensemble-composer > button:disabled { opacity: .35; cursor: not-allowed; }
        
        .ensemble-chat-disclaimer { margin: 9px 24px 15px; color: ${theme === 'dark' ? "#596276" : "#94a3b8"}; font-size: 9px; text-align: center; }
        .ensemble-inline-link { display: inline-flex; align-items: center; gap: 3px; margin: 0 2px; color: #60a5fa; font-weight: 600; text-decoration: underline; text-decoration-color: rgba(96,165,250,.45); text-underline-offset: 3px; }
        .ensemble-inline-link:hover { color: #93c5fd; }
        
        @keyframes ensemble-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-3px); opacity: 1; } }
        @keyframes ensemble-logo-pulse { 0%, 100% { transform: scale(.88); opacity: .65; } 50% { transform: scale(1.08); opacity: 1; } }
        @keyframes ensemble-logo-orbit { to { transform: rotate(360deg); } }
        @media (max-width: 820px) { .ensemble-chat-page { padding: 24px 18px 32px; } .ensemble-chat-intro { margin-top: 22px; } .ensemble-chat-workspace { grid-template-columns: 1fr; height: 720px; max-height: calc(100vh - 120px); } .ensemble-chat-sidebar { gap: 16px; padding: 18px; border-right: 0; border-bottom: 1px solid ${theme === 'dark' ? "#1e2130" : "#e5e7eb"}; } .ensemble-sidebar-section { order: 3; } .ensemble-quick-list { display: flex; overflow-x: auto; padding-bottom: 2px; } .ensemble-quick-list button { min-width: 210px; border-color: ${theme === 'dark' ? "#202435" : "#e2e8f0"}; background: ${theme === 'dark' ? "#0d101b" : "#f8fafc"}; } .ensemble-sidebar-note { display: none; } .ensemble-conversation { min-height: 560px; } }
        @media (max-width: 520px) { .ensemble-chat-page { padding: 18px 12px 24px; } .ensemble-chat-intro h1 { font-size: 30px; } .ensemble-chat-intro p { padding: 0 14px; font-size: 13px; } .ensemble-chat-workspace { border-radius: 14px; } .ensemble-message-log { padding: 20px 14px; } .ensemble-message-bubble { max-width: 84%; } .ensemble-conversation-header { padding: 0 15px; } .ensemble-conversation-header button { font-size: 0; } .ensemble-conversation-header button svg { margin: 0; } .ensemble-composer { margin: 0 12px; } .ensemble-chat-disclaimer { margin-inline: 14px; } }
        @media (prefers-reduced-motion: reduce) { .ensemble-typing span, .ensemble-message-avatar.is-thinking img, .ensemble-message-avatar.is-thinking::after { animation: none; } * { scroll-behavior: auto !important; } }
      `}</style>
    </main>
  );
};

export default PageAskOurChatbot;

function InlineAnswer({ text, links }: { text: string; links: VerifiedLink[] }) {
  const linkMap = new Map(links.map((link) => [`[[${link.id}]]`, link]));
  const parts = text.split(/(\[\[LINK_\d+\]\])/g);
  return (
    <div>
      {parts.map((part, index) => {
        const link = linkMap.get(part);
        if (!link) return <React.Fragment key={`${index}-${part.slice(0, 12)}`}>{part}</React.Fragment>;
        return (
          <a key={`${link.id}-${index}`} href={link.url} target="_blank" rel="noreferrer" className="ensemble-inline-link">
            {link.label}<ExternalLink size={11} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
