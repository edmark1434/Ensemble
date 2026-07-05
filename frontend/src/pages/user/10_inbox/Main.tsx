// src/pages/user/inbox/Inbox.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Paperclip,
  Video,
  MoreVertical,
  Search,
  UserPlus,
  ArrowLeft,
  Pin,
  CheckCheck,
  Share2,
  Users,
  Briefcase
} from "lucide-react";
import socket from "@/lib/socket";
import { useEffect } from "react";


interface Members{
  user_id:string,
  joined_at:Date,
}

interface PinnedMessage{
  pinned_at:Date,
  pinned_by:string,
  message_id:string,
}

interface Attachment{
  attachment_id:string,
  attachment_type:string,
  attachment_url:string,
}

interface MessageReact{
  user_id:string,
  react_type:string,
}

interface ReadBy{
  user_id:string,
  read_at:Date,
}

interface Inbox{
  id:string,
  conversation_name:string,
  conversation_type:string,
  contract_id:string,
  job_id:string,
  gig_id:string,
  members: Members[],
  pinned_messages: PinnedMessage[],
  created_at:Date,
  updated_at:Date,
}


interface Message{
  id:string,
  conversation_id:string,
  sender_id:string,
  message_type:string,
  message_content:string,
  message_id_reply:string,
  attachments:Attachment[],
  links:string[],
  message_react:MessageReact[],
  read_by:ReadBy[],
  is_edited:boolean,
  deleted_at:Date,
  created_at:Date,
  updated_at:Date,
}


const Inbox = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState<"direct" | "jobs">("direct");

  const handleSendMessage = () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    console.log("Sending message:", trimmed);
    setMessageInput("");
  };
  useEffect(() =>{
    socket.connect();
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  },[])



  return (
    <div className="min-h-screen bg-[#080a12] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0d0f1a]/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-400" />
            Messages
          </h1>
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl h-[calc(100vh-73px)] overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Chat List Sidebar */}
          <div className="hidden md:flex w-80 flex-col border-r border-white/10 bg-[#0d0f1a] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => setActiveTab("direct")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeTab === "direct"
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="h-4 w-4" />
                Direct Messages
              </button>
              <button
                onClick={() => setActiveTab("jobs")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeTab === "jobs"
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Jobs
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "direct" 
                      ? "Search conversations..." 
                      : "Search job messages..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Chat List - Direct Messages */}
            {activeTab === "direct" && (
              <div className="flex-1 overflow-y-auto">
                <button className="w-full p-4 flex items-center gap-3 bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500">
                  <div className="relative flex-shrink-0">
                    <img
                      src="https://ui-avatars.com/api/?name=JD&background=6366f1&color=fff&bold=true"
                      alt="John Doe"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0d0f1a]"></span>
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">John Doe</p>
                    <p className="text-xs text-zinc-500 truncate">
                      Hey! How's the project going?
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">2h ago</p>
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-white px-1">
                      3
                    </span>
                  </div>
                </button>

                <button className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200">
                  <div className="relative flex-shrink-0">
                    <img
                      src="https://ui-avatars.com/api/?name=SM&background=6366f1&color=fff&bold=true"
                      alt="Sarah Miller"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0d0f1a]"></span>
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">Sarah Miller</p>
                    <p className="text-xs text-zinc-500 truncate">
                      Thanks for the update!
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">5h ago</p>
                  </div>
                </button>

                <button className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200">
                  <div className="relative flex-shrink-0">
                    <img
                      src="https://ui-avatars.com/api/?name=MR&background=6366f1&color=fff&bold=true"
                      alt="Mike Ross"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-500 ring-2 ring-[#0d0f1a]"></span>
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">Mike Ross</p>
                    <p className="text-xs text-zinc-500 truncate">
                      See you tomorrow at 3 PM
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">1d ago</p>
                  </div>
                </button>
              </div>
            )}

            {/* Chat List - Jobs */}
            {activeTab === "jobs" && (
              <div className="flex-1 overflow-y-auto">
                <button className="w-full p-4 flex items-center gap-3 bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500">
                  <div className="relative flex-shrink-0">
                    <img
                      src="https://ui-avatars.com/api/?name=SW&background=10b981&color=fff&bold=true"
                      alt="Software Engineer"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">Senior Software Engineer</p>
                    <p className="text-xs text-zinc-500 truncate">
                      We'd like to schedule an interview
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">1h ago</p>
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-white px-1">
                      2
                    </span>
                  </div>
                </button>

                <button className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200">
                  <div className="relative flex-shrink-0">
                    <img
                      src="https://ui-avatars.com/api/?name=PM&background=10b981&color=fff&bold=true"
                      alt="Product Manager"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">Product Manager</p>
                    <p className="text-xs text-zinc-500 truncate">
                      Your application has been shortlisted
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">3h ago</p>
                  </div>
                </button>

                <button className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200">
                  <div className="relative flex-shrink-0">
                    <img
                      src="https://ui-avatars.com/api/?name=FE&background=10b981&color=fff&bold=true"
                      alt="Frontend Developer"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">Frontend Developer</p>
                    <p className="text-xs text-zinc-500 truncate">
                      We reviewed your portfolio
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-zinc-500">2d ago</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0d0f1a] to-[#080a12] overflow-hidden">
            {/* Chat Header */}
            <div className="sticky top-0 z-10 bg-[#0d0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src="https://ui-avatars.com/api/?name=JD&background=6366f1&color=fff&bold=true"
                  alt="John Doe"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold text-white">John Doe</h2>
                  <p className="text-xs text-zinc-500">Active now</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                  <Share2 className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                  <Video className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Received Message */}
              <div className="flex justify-start group relative w-full">
                <img
                  src="https://i.pravatar.cc/150?u=2"
                  alt="Avatar"
                  className="h-8 w-8 rounded-full mr-2 flex-shrink-0 mt-1"
                />
                
                <div className="max-w-[70%] items-start flex flex-col relative">
                  <div className="relative w-full">
                    <div className="relative rounded-2xl px-4 py-2 bg-white/10 text-white rounded-bl-sm">
                      <p className="text-sm break-words whitespace-pre-wrap">
                        Hey! How's the project going?
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-zinc-500 mt-1 text-left">
                    2:20 PM
                  </span>
                </div>
              </div>

              {/* Sent Message */}
              <div className="flex justify-end group relative w-full">
                <div className="max-w-[70%] items-end flex flex-col relative">
                  <div className="relative w-full">
                    <div className="relative rounded-2xl px-4 py-2 bg-blue-500 text-white rounded-br-sm">
                      <p className="text-sm break-words whitespace-pre-wrap">
                        Going great! Just finished the design.
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-zinc-500 mt-1 text-right">
                    2:22 PM
                    <span className="ml-1">
                      <CheckCheck className="h-3 w-3 inline" />
                    </span>
                  </span>
                </div>
              </div>

              {/* Received Message */}
              <div className="flex justify-start group relative w-full">
                <img
                  src="https://i.pravatar.cc/150?u=2"
                  alt="Avatar"
                  className="h-8 w-8 rounded-full mr-2 flex-shrink-0 mt-1"
                />
                
                <div className="max-w-[70%] items-start flex flex-col relative">
                  <div className="relative w-full">
                    <div className="relative rounded-2xl px-4 py-2 bg-white/10 text-white rounded-bl-sm">
                      <p className="text-sm break-words whitespace-pre-wrap">
                        Awesome! Can you share it with me?
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-zinc-500 mt-1 text-left">
                    2:25 PM
                  </span>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-white/10 bg-[#0d0f1a] p-4 flex-shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 pr-12 text-sm text-white outline-none resize-none placeholder:text-zinc-500"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button className="absolute right-2 bottom-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
                <button className="rounded-xl p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-2.5 text-white transition hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;