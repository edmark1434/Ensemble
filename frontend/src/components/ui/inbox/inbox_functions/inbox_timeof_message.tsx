// src/components/ui/inbox/inbox_functions/inbox_timeof_message.tsx
import React from "react";

export const formatMessageTime = (dateString?: string | Date): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Checks whether at least 1 minute (60,000 ms) has passed
 * between the current message and the previous message.
 */
export const shouldDisplayTimestamp = (
  currentDate?: string | Date,
  previousDate?: string | Date
): boolean => {
  if (!currentDate) return false;
  if (!previousDate) return true; // Always display time for the first message

  const currentMs = new Date(currentDate).getTime();
  const previousMs = new Date(previousDate).getTime();

  // 60,000 milliseconds = 1 minute
  return currentMs - previousMs >= 60000;
};

interface InboxTimeOfMessageProps {
  timestamp?: string | Date;
  isSender?: boolean;
}

export const InboxTimeOfMessage: React.FC<InboxTimeOfMessageProps> = ({
  timestamp,
  isSender = false,
}) => {
  if (!timestamp) return null;

  const formattedTime = formatMessageTime(timestamp);

  return (
    <span
      className={`text-[10px] text-zinc-400 select-none ${
        isSender ? "text-right" : "text-left"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {formattedTime}
    </span>
  );
};