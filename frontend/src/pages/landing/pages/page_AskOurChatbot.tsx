import useGlobalState from "@/lib/global_state";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  MessageCircleQuestion,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";
import PromptBar, {
  type PromptBarCommand,
  type PromptBarModel,
  type PromptBarSource,
} from "@/components/ui/PromptBar";
import ThoughtLine from "@/components/ui/ThoughtLine";
import Prism from "@/components/ui/Prism";

const CHATBOT_MODELS: PromptBarModel[] = [
  { key: "joed-ai", name: "Joed AI", tag: "General" },
  { key: "joed-mini", name: "Joed Mini", tag: "Fast" },
  { key: "joed-pro", name: "Joed Pro", tag: "Deep Think" },
];

const CHATBOT_SOURCES: PromptBarSource[] = [
  { key: "files", name: "Photos & files", description: "Upload references or screenshots", attach: true },
  { key: "docs", name: "Documentation", description: "Search platform guides & specs" },
  { key: "projects", name: "Projects & Workspace", description: "Escrow, timeline & taskboards" },
  { key: "marketplace", name: "Marketplace & Gigs", description: "Find assets, services & pricing" },
];

const CHATBOT_COMMANDS: PromptBarCommand[] = [
  { key: "summarize", name: "/summarize", description: "Summarize this conversation" },
  { key: "hire", name: "/hire", description: "How to hire video editors & post jobs" },
  { key: "work", name: "/work", description: "How to freelance on Ensemble" },
  { key: "credits", name: "/credits", description: "Learn about credits & subscriptions" },
  { key: "ticket", name: "/ticket", description: "How to submit a support ticket" },
];

const MODEL_STEPS: Record<string, string[]> = {
  "joed-mini": [
    "Fast RAG search in Ensemble documentation",
    "Rapid answer synthesis & link verification",
  ],
  "joed-pro": [
    "Deep contextual analysis of user intent",
    "Multi-document RAG retrieval & vector ranking",
    "Cross-referencing verified platform guides",
    "Synthesizing structured, high-effort response",
  ],
  "joed-ai": [
    "Reading query & conversation context",
    "Searching Ensemble documentation & verified links",
    "Synthesizing structured response",
  ],
};

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
  const storeTheme = useGlobalState((state) => state.theme);
  const searchTheme = new URLSearchParams(window.location.search).get('theme') as 'light' | 'dark' | null;
  const theme = searchTheme || storeTheme;

  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("joed-ai");
  const endRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
  };

  const handleAttach = () => {
    return new Promise<string[]>((resolve) => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.multiple = true;
      fileInput.onchange = () => {
        const files = Array.from(fileInput.files || []).map((f) => f.name);
        resolve(files);
      };
      fileInput.click();
    });
  };

  const handleDictate = async () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    return new Promise<string>((resolve) => {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript || "";
          resolve(transcript);
        };
        recognition.onerror = () => resolve("");
        recognition.onend = () => resolve("");
        recognition.start();
      } catch {
        resolve("");
      }
    });
  };

  const handleSend = async (question: string, modelKey?: string) => {
    const userText = question.trim();
    if (!userText || isSending || userText.length > 2000) return;
    const activeModel = modelKey || selectedModel;
    if (modelKey && modelKey !== selectedModel) {
      setSelectedModel(modelKey);
    }
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsSending(true);

    abortControllerRef.current = new AbortController();

    try {
      const history: ChatHistoryMessage[] = messages.slice(-10).map((message) => ({
        role: message.sender === "bot" ? "assistant" : "user",
        content: message.text,
      }));

      const response = await axios.post<ChatResponse>(
        `${API_BASE_URL}/api/chat`,
        { message: userText, history, model: activeModel },
        {
          signal: abortControllerRef.current.signal,
          withCredentials: false,
          headers: { "ngrok-skip-browser-warning": "true" },
        },
      );
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: response.data.answer,
          sources: response.data.sources || [],
          links: response.data.links || [],
        },
      ]);
    } catch (error: unknown) {
      if (axios.isCancel(error)) return;
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "The support assistant is temporarily unavailable. Please try again."
        : "The support assistant is temporarily unavailable. Please try again.";
      setMessages((prev) => [...prev, { sender: "bot", text: message, error: true }]);
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const resetConversation = () => {
    if (isSending) return;
    handleStop();
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <main className="ensemble-chat-page">
      {/* Interactive WebGL2 Prism Background - Only background animation */}
      <div
        className={`ensemble-chat-prism-bg transition-opacity duration-1000 ${
          !isPageLoading ? (theme === 'dark' ? 'opacity-90' : 'opacity-85') : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <Prism
          animationType="3drotate"
          timeScale={theme === 'dark' ? 0.35 : 0.28}
          height={3.4}
          baseWidth={4.8}
          scale={3.2}
          glow={theme === 'dark' ? 1.15 : 0.72}
          noise={0.0}
          intro={false}
          offset={{ y: -40 }}
          lightMode={theme === 'light'}
          saturation={theme === 'dark' ? 1.05 : 0.7}
          colorFrequency={theme === 'dark' ? 1.2 : 1.15}
          colors={
            theme === 'dark'
              ? ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
              : ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
          }
          interactive={true}
          hoverStrength={1.2}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Loading Overlay */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
          isPageLoading ? 'opacity-100 z-50' : 'opacity-0 -z-10 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 shadow-[0_0_40px_rgba(0,0,0,0.25)]">
          <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
          <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-20" />
        </div>
        <p className="mt-8 text-sm font-semibold text-zinc-500 dark:text-zinc-400 tracking-widest uppercase animate-pulse">
          Initializing AI...
        </p>
      </div>

      <div
        className={`ensemble-chat-shell transition-all duration-1000 ease-out transform ${
          !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
      >
        <button className="ensemble-back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Ensemble
        </button>

        <section className="ensemble-chat-intro">
          <span className="ensemble-eyebrow"><Sparkles size={14} /> Ensemble support</span>
          <h1>How can we help?</h1>
          <p>Get clear answers about Ensemble, grounded in our current platform documentation.</p>
        </section>

        <div className={`ensemble-chat-workspace ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
          <aside className="ensemble-chat-sidebar">
            <div className="ensemble-sidebar-top-bar">
              <div className="ensemble-assistant-card">
                <div className="ensemble-assistant-icon"><img src="/ensemble_lg.svg" alt="Ensemble" /></div>
                <div>
                  <strong>Joeds AI</strong>
                  <small>by Ensemble</small>
                  <span><i /> Documentation online</span>
                </div>
              </div>
              <button
                type="button"
                className="ensemble-sidebar-collapse-btn"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
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
              <div className="ensemble-header-left">
                {!isSidebarOpen && (
                  <button
                    type="button"
                    className="ensemble-sidebar-expand-btn"
                    onClick={() => setIsSidebarOpen(true)}
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                  >
                    <PanelLeftOpen size={16} />
                    <span>Sidebar</span>
                  </button>
                )}
                <div>
                  <strong>Conversation</strong>
                  <span>{messages.length - 1} {messages.length === 2 ? "message" : "messages"}</span>
                </div>
              </div>
              <button className="ensemble-reset-btn" onClick={resetConversation} disabled={isSending || messages.length === 1}>
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
                  <div
                    className="ensemble-thought-bubble"
                    style={{
                      width: "fit-content",
                      minWidth: "min(380px, 100%)",
                    }}
                  >
                    <ThoughtLine
                      label={selectedModel === "joed-pro" ? "Thinking deeply…" : "Thinking…"}
                      doneLabel="Thought for"
                      steps={MODEL_STEPS[selectedModel] || MODEL_STEPS["joed-ai"]}
                      working={isSending}
                      color={theme === "dark" ? "#e4e4e7" : "#1e293b"}
                      glyphColor="#3b82f6"
                      fontSize={13}
                      collapsible={true}
                      showTimer={true}
                    />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="ensemble-composer-wrapper">
              <PromptBar
                placeholder="Ask anything about Ensemble..."
                busy={isSending}
                background={theme === "dark" ? "#18181b" : "#ffffff"}
                color={theme === "dark" ? "#f4f4f5" : "#0f172a"}
                menuBackground={theme === "dark" ? "#202024" : "#ffffff"}
                sparkColor={theme === "dark" ? "#60a5fa" : "#2563eb"}
                models={CHATBOT_MODELS}
                sources={CHATBOT_SOURCES}
                commands={CHATBOT_COMMANDS}
                defaultModel={selectedModel}
                defaultEffort="High"
                radius={16}
                width="100%"
                onSend={(text, detail) => {
                  void handleSend(text, detail.model?.key);
                }}
                onStop={handleStop}
                onAttach={handleAttach}
                onDictate={handleDictate}
              />
            </div>
            <p className="ensemble-chat-disclaimer">AI responses may be imperfect. Contact support for account-specific or payment concerns.</p>
          </section>
        </div>
      </div>
      <style>{`
        .ensemble-chat-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: ${theme === 'dark' ? "#0f0f11" : "#f8fafc"};
          color: ${theme === 'dark' ? "#f4f4f5" : "#0f172a"};
          padding: 36px 32px 48px;
          font-family: "Plus Jakarta Sans", sans-serif;
        }
        .ensemble-chat-prism-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .ensemble-chat-shell {
          position: relative;
          z-index: 1;
          width: min(1160px, 100%);
          margin: 0 auto;
        }
        .ensemble-back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          border-radius: 9999px;
          border: 1px solid ${theme === 'dark' ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"};
          background: ${theme === 'dark' ? "rgba(24, 24, 27, 0.85)" : "rgba(255, 255, 255, 0.92)"};
          color: ${theme === 'dark' ? "#f4f4f5" : "#0f172a"};
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: all .2s ease;
        }
        .ensemble-back-button:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateX(-2px);
        }
        .ensemble-chat-intro {
          margin: 26px 0 24px;
          text-align: center;
        }
        .ensemble-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: ${theme === 'dark' ? "#60a5fa" : "#2563eb"};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .ensemble-chat-intro h1 {
          margin: 10px 0 8px;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.1;
          letter-spacing: -.04em;
          color: ${theme === 'dark' ? "#ffffff" : "#0f172a"};
          font-weight: 800;
          text-shadow: ${theme === 'dark' ? "0 2px 20px rgba(0,0,0,0.6)" : "none"};
        }
        .ensemble-chat-intro p {
          margin: 0;
          color: ${theme === 'dark' ? "#e4e4e7" : "#334155"};
          font-size: 15px;
          font-weight: 450;
          text-shadow: ${theme === 'dark' ? "0 1px 10px rgba(0,0,0,0.7)" : "none"};
        }
        
        .ensemble-chat-workspace {
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
          height: 690px;
          max-height: calc(100vh - 200px);
          overflow: hidden;
          border: 1px solid ${theme === 'dark' ? "rgba(63, 63, 70, 0.55)" : "rgba(226, 232, 240, 0.95)"};
          border-radius: 18px;
          background: ${theme === 'dark' ? "rgba(18, 18, 20, 0.85)" : "rgba(255, 255, 255, 0.95)"};
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: ${theme === 'dark' ? "0 24px 70px rgba(0,0,0,.65)" : "0 20px 60px rgba(15,23,42,.08)"};
          transition: grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ensemble-chat-workspace.sidebar-collapsed {
          grid-template-columns: 0px minmax(0, 1fr);
        }
        
        .ensemble-chat-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
          min-height: 0;
          width: 290px;
          overflow-y: auto;
          overflow-x: hidden;
          border-right: 1px solid ${theme === 'dark' ? "rgba(63, 63, 70, 0.55)" : "#e2e8f0"};
          background: ${theme === 'dark' ? "rgba(15, 15, 17, 0.75)" : "rgba(248, 250, 252, 0.88)"};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ensemble-chat-workspace.sidebar-collapsed .ensemble-chat-sidebar {
          opacity: 0;
          pointer-events: none;
          transform: translateX(-16px);
          border-right-color: transparent;
        }

        .ensemble-sidebar-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .ensemble-sidebar-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          border-radius: 8px;
          border: 1px solid ${theme === 'dark' ? "#3f3f46" : "#cbd5e1"};
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"};
          color: ${theme === 'dark' ? "#e4e4e7" : "#1e293b"};
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ensemble-sidebar-collapse-btn:hover {
          border-color: #3b82f6;
          color: ${theme === 'dark' ? "#ffffff" : "#0f172a"};
          background: ${theme === 'dark' ? "#202024" : "#f1f5f9"};
        }

        .ensemble-assistant-card {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ensemble-assistant-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border: 1px solid ${theme === 'dark' ? "#27272a" : "#e2e8f0"};
          border-radius: 12px;
          background: ${theme === 'dark' ? "#18181b" : "#f1f5f9"};
        }
        .ensemble-assistant-icon img {
          width: 28px;
          height: 28px;
          object-fit: contain;
          filter: ${theme === 'dark' ? 'none' : 'invert(1)'};
          opacity: ${theme === 'dark' ? '1' : '0.8'};
        }
        .ensemble-assistant-card strong, .ensemble-assistant-card small, .ensemble-assistant-card span {
          display: block;
        }
        .ensemble-assistant-card strong {
          font-size: 14px;
          font-weight: 700;
          color: ${theme === 'dark' ? "#ffffff" : "#0f172a"};
        }
        .ensemble-assistant-card small {
          margin-top: 1px;
          color: ${theme === 'dark' ? "#a1a1aa" : "#475569"};
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .ensemble-assistant-card span {
          margin-top: 5px;
          color: ${theme === 'dark' ? "#d4d4d8" : "#334155"};
          font-size: 11px;
          font-weight: 500;
        }
        .ensemble-assistant-card i {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 3px rgba(52,211,153,.15);
        }
        
        .ensemble-sidebar-section {
          flex: 1;
        }
        .ensemble-sidebar-section h2 {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 10px;
          color: ${theme === 'dark' ? "#a1a1aa" : "#475569"};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .ensemble-quick-list {
          display: grid;
          gap: 7px;
        }
        .ensemble-quick-list button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          padding: 11px 12px;
          border: 1px solid ${theme === 'dark' ? "rgba(255, 255, 255, 0.06)" : "rgba(226, 232, 240, 0.95)"};
          border-radius: 9px;
          background: ${theme === 'dark' ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.85)"};
          color: ${theme === 'dark' ? "#f4f4f5" : "#0f172a"};
          font: inherit;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
          text-align: left;
          cursor: pointer;
          transition: all .2s ease;
        }
        .ensemble-quick-list button:hover:not(:disabled) {
          border-color: #3b82f6;
          background: ${theme === 'dark' ? "rgba(37, 99, 235, 0.18)" : "#ffffff"};
          color: ${theme === 'dark' ? "#ffffff" : "#1d4ed8"};
          box-shadow: ${theme === 'dark' ? "0 2px 10px rgba(0,0,0,0.3)" : "0 2px 8px rgba(37, 99, 235, 0.12)"};
        }
        .ensemble-quick-list button:hover svg {
          color: #3b82f6;
        }
        
        .ensemble-sidebar-note {
          display: flex;
          gap: 10px;
          color: ${theme === 'dark' ? "#a1a1aa" : "#475569"};
        }
        .ensemble-sidebar-note svg {
          flex: 0 0 auto;
          margin-top: 1px;
          color: #3b82f6;
        }
        .ensemble-sidebar-note strong, .ensemble-sidebar-note span {
          display: block;
        }
        .ensemble-sidebar-note strong {
          color: ${theme === 'dark' ? "#f4f4f5" : "#0f172a"};
          font-size: 11px;
          font-weight: 600;
        }
        .ensemble-sidebar-note span {
          margin-top: 3px;
          color: ${theme === 'dark' ? "#a1a1aa" : "#475569"};
          font-size: 10px;
          line-height: 1.5;
        }
        
        .ensemble-conversation {
          display: grid;
          min-width: 0;
          min-height: 0;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
          background: ${theme === 'dark' ? "rgba(18, 18, 20, 0.6)" : "rgba(255, 255, 255, 0.82)"};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .ensemble-conversation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 70px;
          padding: 0 24px;
          border-bottom: 1px solid ${theme === 'dark' ? "#27272a" : "#e2e8f0"};
        }
        .ensemble-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ensemble-sidebar-expand-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px;
          border-radius: 8px;
          border: 1px solid ${theme === 'dark' ? "#3f3f46" : "#cbd5e1"};
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"};
          color: ${theme === 'dark' ? "#e4e4e7" : "#1e293b"};
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ensemble-sidebar-expand-btn:hover {
          border-color: #3b82f6;
          color: ${theme === 'dark' ? "#ffffff" : "#0f172a"};
          background: ${theme === 'dark' ? "#202024" : "#f1f5f9"};
        }
        .ensemble-conversation-header strong, .ensemble-conversation-header span {
          display: block;
        }
        .ensemble-conversation-header strong {
          font-size: 14px;
          font-weight: 700;
          color: ${theme === 'dark' ? "#ffffff" : "#0f172a"};
        }
        .ensemble-conversation-header span {
          margin-top: 3px;
          color: ${theme === 'dark' ? "#a1a1aa" : "#64748b"};
          font-size: 11px;
        }
        .ensemble-conversation-header button.ensemble-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border: 1px solid ${theme === 'dark' ? "#3f3f46" : "#cbd5e1"};
          border-radius: 8px;
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"};
          color: ${theme === 'dark' ? "#e4e4e7" : "#1e293b"};
          font: inherit;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ensemble-conversation-header button.ensemble-reset-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
          background: ${theme === 'dark' ? "#202024" : "#f8fafc"};
        }
        .ensemble-conversation-header button:disabled, .ensemble-quick-list button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }
        
        .ensemble-message-log {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 0;
          padding: 28px;
          overflow-y: auto;
          scrollbar-color: ${theme === 'dark' ? "#27272a transparent" : "#cbd5e1 transparent"};
        }
        .ensemble-message-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .ensemble-message-row.is-user {
          flex-direction: row-reverse;
        }
        .ensemble-message-avatar {
          position: relative;
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          border: 1px solid ${theme === 'dark' ? "#27272a" : "#e2e8f0"};
          border-radius: 9px;
          background: ${theme === 'dark' ? "#18181b" : "#f1f5f9"};
          color: #60a5fa;
        }
        .ensemble-message-avatar img {
          width: 20px;
          height: 20px;
          object-fit: contain;
          filter: ${theme === 'dark' ? 'none' : 'invert(1)'};
          opacity: ${theme === 'dark' ? '1' : '0.8'};
        }
        .ensemble-message-row.is-user .ensemble-message-avatar {
          color: #ffffff;
          background: #2563eb;
          border-color: #3b82f6;
        }
        .ensemble-message-avatar.is-thinking {
          animation: ensemble-avatar-glow 2s infinite ease-in-out;
          border-color: rgba(59, 130, 246, 0.4);
        }
        .ensemble-message-avatar.is-thinking img {
          animation: ensemble-logo-pulse 1.4s ease-in-out infinite;
        }
        
        .ensemble-message-bubble {
          max-width: min(74%, 650px);
          padding: 12px 16px;
          border: 1px solid ${theme === 'dark' ? "rgba(63, 63, 70, 0.6)" : "#e2e8f0"};
          border-radius: 4px 13px 13px;
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"};
          color: ${theme === 'dark' ? "#f4f4f5" : "#0f172a"};
          box-shadow: ${theme === 'dark' ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.04)"};
          font-size: 13px;
          font-weight: 450;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .ensemble-message-row.is-user .ensemble-message-bubble {
          border-color: #2563eb;
          border-radius: 13px 4px 13px 13px;
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
        }
        .ensemble-message-bubble.is-error {
          border-color: ${theme === "dark" ? "rgba(248,113,113,.3)" : "rgba(239,68,68,.4)"};
          background: ${theme === "dark" ? "rgba(127,29,29,.25)" : "rgba(254,226,226,1)"};
          color: ${theme === "dark" ? "#fecaca" : "#991b1b"};
        }
        
        .ensemble-thought-bubble {
          display: block;
          max-width: min(88%, 680px);
          padding: 14px 18px;
          border: 1px solid ${theme === 'dark' ? "#27272a" : "#e2e8f0"};
          border-radius: 4px 14px 14px 14px;
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"};
          color: ${theme === 'dark' ? "#f4f4f5" : "#0f172a"};
          box-shadow: ${theme === 'dark' ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.04)"};
          overflow: hidden;
        }

        .ensemble-composer-wrapper {
          margin: 0 24px 6px;
          position: relative;
          z-index: 30;
        }
        .ensemble-chat-disclaimer {
          margin: 6px 24px 14px;
          color: ${theme === 'dark' ? "#a1a1aa" : "#64748b"};
          font-size: 11px;
          font-weight: 500;
          text-align: center;
        }
        .ensemble-inline-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin: 0 2px;
          color: #60a5fa;
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: rgba(96,165,250,.45);
          text-underline-offset: 3px;
        }
        .ensemble-inline-link:hover {
          color: #93c5fd;
        }
        
        @keyframes ensemble-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: .3; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes ensemble-avatar-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          50% { box-shadow: 0 0 12px 0 rgba(59, 130, 246, 0.35); }
        }
        @keyframes ensemble-logo-pulse {
          0%, 100% { transform: scale(.88); opacity: .65; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        
        @media (max-width: 820px) {
          .ensemble-chat-page { padding: 24px 18px 32px; }
          .ensemble-chat-intro { margin-top: 22px; }
          .ensemble-chat-workspace {
            grid-template-columns: 1fr;
            height: 720px;
            max-height: calc(100vh - 120px);
          }
          .ensemble-chat-workspace.sidebar-collapsed {
            grid-template-columns: 1fr;
          }
          .ensemble-chat-workspace.sidebar-collapsed .ensemble-chat-sidebar {
            display: none;
          }
          .ensemble-chat-sidebar {
            gap: 16px;
            padding: 18px;
            width: 100%;
            border-right: 0;
            border-bottom: 1px solid ${theme === 'dark' ? "#27272a" : "#e5e7eb"};
          }
          .ensemble-sidebar-section { order: 3; }
          .ensemble-quick-list { display: flex; overflow-x: auto; padding-bottom: 2px; }
          .ensemble-quick-list button {
            min-width: 210px;
            border-color: ${theme === 'dark' ? "#27272a" : "#e2e8f0"};
            background: ${theme === 'dark' ? "#18181b" : "#f8fafc"};
          }
          .ensemble-sidebar-note { display: none; }
          .ensemble-conversation { min-height: 560px; }
        }
        @media (max-width: 520px) {
          .ensemble-chat-page { padding: 18px 12px 24px; }
          .ensemble-chat-intro h1 { font-size: 30px; }
          .ensemble-chat-intro p { padding: 0 14px; font-size: 13px; }
          .ensemble-chat-workspace { border-radius: 14px; }
          .ensemble-message-log { padding: 20px 14px; }
          .ensemble-message-bubble { max-width: 84%; }
          .ensemble-conversation-header { padding: 0 15px; }
          .ensemble-conversation-header button.ensemble-reset-btn { font-size: 0; padding: 8px; }
          .ensemble-conversation-header button.ensemble-reset-btn svg { margin: 0; }
          .ensemble-composer-wrapper { margin: 0 12px 6px; }
          .ensemble-chat-disclaimer { margin-inline: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ensemble-typing span,
          .ensemble-message-avatar.is-thinking img,
          .ensemble-message-avatar.is-thinking { animation: none; }
          * { scroll-behavior: auto !important; }
        }
      `}</style>
    </main>
  );
};

export default PageAskOurChatbot;

function parseMarkdownBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length >= 4) {
      return <strong key={i} className="font-bold text-gray-900 dark:text-gray-100">{chunk.slice(2, -2)}</strong>;
    }
    return chunk;
  });
}

function InlineAnswer({ text, links }: { text: string; links: VerifiedLink[] }) {
  const linkMap = new Map(links.map((link) => [`[[${link.id}]]`, link]));
  const parts = text.split(/(\[\[LINK_\d+\]\])/g);
  return (
    <div>
      {parts.map((part, index) => {
        const link = linkMap.get(part);
        if (!link) return <React.Fragment key={index + '-' + part.slice(0, 12)}>{parseMarkdownBold(part)}</React.Fragment>;
        return (
          <a key={link.id + '-' + index} href={link.url} target="_blank" rel="noreferrer" className="ensemble-inline-link">
            {link.label}<ExternalLink size={11} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
