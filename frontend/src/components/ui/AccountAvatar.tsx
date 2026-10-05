import React, { useEffect, useState } from "react";

interface AccountAvatarProps {
  url: string | null | undefined;
  name?: string | null;
  className?: string;
}

const AccountAvatar: React.FC<AccountAvatarProps> = ({ url, name, className = "h-10 w-10" }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  const initial = (name || "").replace(/^@/, "").trim().charAt(0).toUpperCase() || "?";

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full object-cover bg-gray-100 dark:bg-white/5`}
      />
    );
  }

  return (
    <div className={`${className} shrink-0 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/10 text-sm font-semibold text-gray-600 dark:text-zinc-300`}>
      {initial}
    </div>
  );
};

export default AccountAvatar;
