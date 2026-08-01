// src/components/ui/inbox/inbox_functions/inbox_timeof_message.tsx
import React from "react";
import { Check, CheckCheck } from "lucide-react";

export const formatMessageTime = (dateString?: string | Date): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const shouldDisplayTimestamp = (
  currentDate?: string | Date,
  previousDate?: string | Date
): boolean => {
  if (!currentDate) return false;
  if (!previousDate) return true;

  const currentMs = new Date(currentDate).getTime();
  const previousMs = new Date(previousDate).getTime();
  return currentMs - previousMs >= 60000;
};

interface InboxTimeOfMessageProps {
  timestamp?: string | Date;
  isSender?: boolean;
  status?: "sent" | "seen";
  recipientAvatar?: string; // Optional: render mini avatar if seen
  recipientAvatars?: string[];
}

export const InboxTimeOfMessage: React.FC<InboxTimeOfMessageProps> = ({
  timestamp,
  isSender = false,
  status,
  recipientAvatar,
  recipientAvatars = [],
}) => {
  if (!timestamp) return null;

  const formattedTime = formatMessageTime(timestamp);

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] text-zinc-400 select-none ${
        isSender ? "justify-end text-right" : "justify-start text-left"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <span>{formattedTime}</span>

      {/* Render status icons only for messages sent by the current user */}
      {isSender && status && (
        <span className="flex items-center ml-0.5">
          {status === "seen" ? (
            recipientAvatars.length || recipientAvatar ? (
              <span className="flex -space-x-1" title={`Seen by ${recipientAvatars.length || 1}`}>
                {(recipientAvatars.length ? recipientAvatars : [recipientAvatar!])
                  .slice(0, 5)
                  .map((avatar, index) => (
                    <img
                      key={`${avatar}-${index}`}
                      src={avatar}
                      alt="Seen"
                      className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-blue-500"
                    />
                  ))}
              </span>
            ) : (
              <CheckCheck
                className="h-3.5 w-3.5 text-blue-400"
                title="Seen"
              />
            )
          ) : (
            <Check
              className="h-3.5 w-3.5 text-zinc-500"
              title="Sent"
            />
          )}
        </span>
      )}
    </div>
  );
};
