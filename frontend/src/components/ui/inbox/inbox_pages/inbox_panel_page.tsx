// src/components/ui/inbox/inbox_pages/inbox_panel_page.tsx
import React from "react";
import { InboxPanelHeader } from "../inbox_components/inbox_panel_header";
import { InboxPanelViewMessage } from "../inbox_components/inbox_panel_viewmessage";
import { InboxPanelChatbox } from "../inbox_components/inbox_panel_chatbox";
import { InboxPinnedBanner } from "../inbox_functions/inbox_pin_message";
import { InboxSideDetails } from "../inbox_components/inbox_side_detail";

export const InboxPanelPage = ({
  selectedConversation,
  getConversationName,
  getAvatar,
  messages,
  visibleMessages,
  messageLoading,
  messageError,
  retryMessages,
  hasOlderMessages,
  loadingOlder,
  onLoadOlder,
  containerRef,
  endRef,
  handleScroll,
  renderMessage,
  messageInput,
  setMessageInput,
  handleSendMessage,
  isSending,
  typingCount,
  replyToMessage,
  editingMessage,
  cancelReply,
  mediaList,
  fileInputRef,
  openFilePicker,
  handleFileChange,
  removeMedia,
  pinnedMessages,
  onUnpin,
  onJumpToPinned,
  textareaRef,
  onUpdateGroupName,
  currentUserId,
  getMemberName,
  getMemberAvatar,
  suggestedAccounts,
  onUpdateMember,
  onRemoveMember,
  onUpdateGroupProfileImage,
  showDetails,
  onShowDetailsChange,
  onPreviewAttachment,
}: any) => {

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-zinc-500">
        Select a conversation to start messaging
      </div>
    );
  }
  const currentMember = selectedConversation.members?.find(
    (member: { account_id: string }) =>
      String(member.account_id) === String(currentUserId)
  );
  const cannotSendToGroup =
    selectedConversation.conversation_type === "group" &&
    (!currentMember ||
      ["left", "removed"].includes(currentMember.status || "active"));

  return (
    <div className="flex h-full max-h-full w-full overflow-hidden bg-gray-50 dark:bg-dark-base relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <InboxPanelHeader
          selectedConversation={selectedConversation}
          getConversationName={getConversationName}
          getAvatar={getAvatar}
          onToggleDetails={() => onShowDetailsChange?.(!showDetails)}
        />

        <InboxPinnedBanner
          selectedConversation={selectedConversation}
          pinnedMessages={pinnedMessages}
          messages={messages}
          onUnpin={onUnpin}
          onJumpTo={onJumpToPinned}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <InboxPanelViewMessage
            messages={visibleMessages || messages}
            messageLoading={messageLoading}
            error={messageError}
            onRetry={retryMessages}
            hasOlderMessages={hasOlderMessages}
            loadingOlder={loadingOlder}
            onLoadOlder={onLoadOlder}
            containerRef={containerRef}
            endRef={endRef}
            handleScroll={handleScroll}
            renderMessage={renderMessage}
          />

          {cannotSendToGroup ? (
            <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 text-center text-sm text-gray-500 dark:text-zinc-400">
              You cannot send messages to this group chat anymore.
            </div>
          ) : (
          <InboxPanelChatbox
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleSendMessage={handleSendMessage}
            isSending={isSending}
            typingCount={typingCount}
            replyToMessage={replyToMessage}
            editingMessage={editingMessage}
            cancelReply={cancelReply}
            mediaList={mediaList}
            fileInputRef={fileInputRef}
            openFilePicker={openFilePicker}
            handleFileChange={handleFileChange}
            removeMedia={removeMedia}
            textareaRef={textareaRef}
          />
          )}
        </div>
      </div>

      {/* Smooth Animated Side Details Panel */}
      <InboxSideDetails
        isOpen={showDetails}
        selectedConversation={selectedConversation}
        getConversationName={getConversationName}
        getAvatar={getAvatar}
        messages={messages}
        pinnedMessages={pinnedMessages}
        onClose={() => onShowDetailsChange?.(false)}
        onUpdateGroupName={onUpdateGroupName}
        currentUserId={currentUserId}
        getMemberName={getMemberName}
        getMemberAvatar={getMemberAvatar}
        suggestedAccounts={suggestedAccounts}
        onUpdateMember={onUpdateMember}
        onRemoveMember={onRemoveMember}
        onUpdateGroupProfileImage={onUpdateGroupProfileImage}
        onJumpToMessage={onJumpToPinned}
        onPreviewAttachment={onPreviewAttachment}
      />
    </div>
  );
};
