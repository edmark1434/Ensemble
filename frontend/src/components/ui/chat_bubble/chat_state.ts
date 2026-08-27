import { create } from "zustand";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import toast from "react-hot-toast";
import type {
  Attachment,
  Inbox,
  Message,
  PinnedMessage,
} from "@/components/ui/inbox/inbox_dataset";

export interface ChatTarget {
  id: string;
  name: string;
  avatarUrl?: string;
  account_id?: string;
  inbox_id?: string;
  unreadCount?: number;
  avatarPayload?: Record<string, string>;
  conversationType?: string;
  listingType?: string;
  listingTitle?: string;
  listingPreview?: string;
  listingPath?: string;
}

interface SocketAck<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatCall {
  provider?: "webrtc" | "google-meet";
  callId: string;
  conversationId: string;
  peerAccountId: string;
  peerName?: string;
  peerAvatar?: string;
  direction: "incoming" | "outgoing";
  status: "ringing" | "active" | "busy";
  pendingOffer?: RTCSessionDescriptionInit;
  startedAt: number;
  conversationType?: string;
  groupName?: string;
  groupAvatar?: string;
  callerName?: string;
  callerId?: string;
  participantIds?: string[];
  startedByAccountId?: string;
}

export interface GroupCallSummary {
  call_id: string;
  conversation_id: string;
  conversation_name?: string;
  conversation_image_key?: string;
  caller_id: string;
  caller_name?: string;
  caller_avatar?: string;
  participant_ids: string[];
  participant_names: string[];
  participant_profiles?: Array<{
    account_id: string;
    display_name: string;
    avatar_key?: string | null;
  }>;
  media_states?: Record<string, { video: boolean; audio: boolean }>;
  status: "ringing" | "active";
  started_at: string;
}

interface CallSignal {
  call_id: string;
  conversation_id: string;
  account_id: string;
  target_account_id: string;
  signal_type: "offer" | "answer" | "ice-candidate" | "media-state" | "end" | "reject" | "busy" | "resume" | "participant-left";
  signal?: unknown;
  actor_name?: string;
  actor_avatar?: string;
  conversation_type?: string;
  conversation_name?: string;
  conversation_image_key?: string;
  caller_id?: string;
  caller_name?: string;
  caller_avatar?: string;
  participant_ids?: string[];
  status?: "ringing" | "active";
  call_status?: "ringing" | "active";
  started_at?: string;
  expires_at?: string;
  media_states?: Record<string, { video: boolean; audio: boolean }>;
}

export interface GoogleMeetingEvent {
  meeting_id: string;
  conversation_id: string;
  requested_by_account_id: string;
  requester_name?: string | null;
  requester_avatar?: string | null;
  provider: "google-meet";
  status: "scheduled" | "requested" | "active" | "ended";
  participant_ids?: string[];
  started_at: string;
  scheduled_at?: string | null;
  ended_at?: string | null;
}

interface ChatState {
  conversations: Inbox[];
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  floatingWindows: ChatTarget[];
  activeFloatingId: string | null;
  isFloatingOpen: boolean;
  unreadCounts: Record<string, number>;
  typingByConversation: Record<string, string[]>;
  onlineAccounts: Record<string, boolean>;
  loadingConversations: boolean;
  loadingMessages: Record<string, boolean>;
  activeCall: ChatCall | null;
  meetingCreationPrompt: {
    conversationId: string;
    targetAccountId: string;
    peerName?: string;
    peerAvatar?: string;
  } | null;
  googleMeetingsByConversation: Record<string, GoogleMeetingEvent>;
  groupCallsByConversation: Record<string, GroupCallSummary>;
  localCallStream: MediaStream | null;
  remoteCallStream: MediaStream | null;
  remoteCallStreams: Record<string, MediaStream>;
  remoteMediaStates: Record<string, { video: boolean; audio: boolean }>;
  initialize: (accountId: string) => void;
  reset: () => void;
  fetchConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  openDirectChat: (target: ChatTarget) => Promise<void>;
  openFloatingConversation: (target: ChatTarget) => Promise<void>;
  closeFloatingChat: () => void;
  removeFloatingWindow: (windowId: string) => void;
  createGroup: (
    name: string,
    members: Array<{ account_id: string }>
  ) => Promise<Inbox>;
  createEngagement: (payload: {
    conversation_name?: string;
    members: Array<{ account_id: string }>;
    job_id?: string;
    gig_id?: string;
    listing_type: "job" | "gig";
    listing_title: string;
    listing_preview?: string;
    listing_path?: string;
  }) => Promise<Inbox>;
  createMarketplace: (payload: {
    context_type: "job_proposal" | "gig_order";
    context_id: string;
  }) => Promise<Inbox>;
  createRevision: (payload: { contract_id: string }) => Promise<Inbox>;
  updateGroupMember: (
    conversationId: string,
    accountId: string,
    updates: { role?: "owner" | "admin" | "member"; status?: "active" | "left" | "removed" }
  ) => Promise<Inbox>;
  removeGroupMember: (
    conversationId: string,
    accountId: string
  ) => Promise<Inbox>;
  updateGroupProfileImage: (
    conversationId: string,
    imageKey: string
  ) => Promise<Inbox>;
  sendMessage: (
    conversationId: string,
    messageContent: string,
    attachments?: Attachment[]
  ) => Promise<Message>;
  replyMessage: (
    conversationId: string,
    parentMessageId: string,
    messageContent: string,
    attachments?: Attachment[]
  ) => Promise<Message>;
  editMessage: (messageId: string, messageContent: string) => Promise<Message>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactMessage: (
    messageId: string,
    reactType: string,
    remove?: boolean
  ) => Promise<Message>;
  pinMessage: (
    conversationId: string,
    messageId: string,
    unpin?: boolean
  ) => Promise<void>;
  renameConversation: (
    conversationId: string,
    conversationName: string
  ) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  markConversationRead: (conversationId: string) => void;
  startCall: (
    conversationId: string,
    targetAccountId: string,
    peer?: {
      name?: string;
      avatar?: string;
      oauthResumed?: boolean;
      creationMode?: "instant" | "scheduled";
      scheduledAt?: string;
    }
  ) => Promise<void>;
  cancelMeetingCreation: () => void;
  submitMeetingCreation: (mode: "instant" | "scheduled", scheduledAt?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  joinGoogleMeeting: (meeting: GoogleMeetingEvent) => Promise<void>;
  endGoogleMeeting: (meeting: GoogleMeetingEvent) => Promise<void>;
  endCallForEveryone: () => Promise<void>;
  joinGroupCall: (conversationId: string) => Promise<void>;
  toggleCallCamera: () => Promise<boolean>;
  toggleCallMicrophone: () => Promise<boolean>;
  dismissCall: () => void;
}

const EMPTY_MESSAGES: Message[] = [];
const chatMediaUrl = (key: string) => {
  if (/^https?:\/\//i.test(key)) return key;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
    /\/$/,
    ""
  );
  return base ? `${base}/${key.replace(/^\/+/, "")}` : key;
};
let authenticatedAccountId: string | null = null;
let listenersBound = false;
let presenceRefreshInterval: ReturnType<typeof setInterval> | null = null;
let pendingGoogleMeetingWindow: Window | null = null;
let conversationsRequest: Promise<void> | null = null;
const messageRequests = new Map<string, Promise<void>>();
const loadedConversationIds = new Set<string>();
const callPeers = new Map<string, RTCPeerConnection>();
let callTimeout: ReturnType<typeof setTimeout> | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let ringAudioContext: AudioContext | null = null;
const queuedIceCandidates = new Map<string, RTCIceCandidateInit[]>();

function stopRing() {
  if (ringInterval) clearInterval(ringInterval);
  ringInterval = null;
  void ringAudioContext?.close().catch(() => undefined);
  ringAudioContext = null;
}

function startRing() {
  stopRing();
  const playTone = () => {
    try {
      ringAudioContext ||= new AudioContext();
      const oscillator = ringAudioContext.createOscillator();
      const gain = ringAudioContext.createGain();
      oscillator.frequency.value = 720;
      gain.gain.setValueAtTime(0.12, ringAudioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ringAudioContext.currentTime + 0.45
      );
      oscillator.connect(gain).connect(ringAudioContext.destination);
      oscillator.start();
      oscillator.stop(ringAudioContext.currentTime + 0.45);
    } catch {
      // Browsers may defer audio until the user has interacted with the page.
    }
  };
  playTone();
  ringInterval = setInterval(playTone, 1800);
}

function clearCallTimeout() {
  if (callTimeout) clearTimeout(callTimeout);
  callTimeout = null;
}

function scheduleCallTimeout(callId: string, expiresAt?: string) {
  clearCallTimeout();
  const remaining = expiresAt
    ? Math.max(0, new Date(expiresAt).getTime() - Date.now())
    : 60_000;
  callTimeout = setTimeout(() => {
    const state = useChatState.getState();
    if (
      state.activeCall?.callId === callId &&
      state.activeCall.status === "ringing"
    ) {
      stopRing();
      releaseCallMedia();
      useChatState.setState({ activeCall: null });
    }
  }, remaining);
}

function releaseCallMedia() {
  clearCallTimeout();
  stopRing();
  callPeers.forEach((peer) => peer.close());
  callPeers.clear();
  queuedIceCandidates.clear();
  const state = useChatState.getState();
  state.localCallStream?.getTracks().forEach((track) => track.stop());
  state.remoteCallStream?.getTracks().forEach((track) => track.stop());
  useChatState.setState({
    localCallStream: null,
    remoteCallStream: null,
    remoteCallStreams: {},
    remoteMediaStates: {},
  });
}

function removeCallPeer(accountId: string) {
  const peer = callPeers.get(accountId);
  if (!peer) return;
  peer.close();
  callPeers.delete(accountId);
  queuedIceCandidates.delete(accountId);
  useChatState.setState((state) => {
    const remoteCallStreams = Object.fromEntries(
      Object.entries(state.remoteCallStreams).filter(
        ([peerAccountId]) => peerAccountId !== accountId
      )
    );
    const tracks = Object.values(remoteCallStreams).flatMap((stream) =>
      stream.getTracks()
    );
    return {
      remoteCallStream: tracks.length ? new MediaStream(tracks) : null,
      remoteCallStreams,
      remoteMediaStates: Object.fromEntries(
        Object.entries(state.remoteMediaStates).filter(
          ([peerAccountId]) => peerAccountId !== accountId
        )
      ),
    };
  });
}

async function createCallPeer(call: ChatCall, peerAccountId = call.peerAccountId) {
  if (callPeers.has(peerAccountId)) removeCallPeer(peerAccountId);
  const previousLocalStream = useChatState.getState().localCallStream;
  const localStream = previousLocalStream || new MediaStream();
  const remoteStream = new MediaStream();
  const callPeer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  for (const kind of ["video", "audio"] as const) {
    const track = localStream.getTracks().find(
      (candidate) => candidate.kind === kind && candidate.readyState === "live"
    );
    const transceiver = callPeer.addTransceiver(kind, {
      // Negotiate send capability up front so later device toggles only need
      // replaceTrack and never rebuild or renegotiate the peer connection.
      direction: "sendrecv",
    });
    if (track) await transceiver.sender.replaceTrack(track);
  }
  callPeer.ontrack = (event) => {
    const currentTracks = remoteStream.getTracks();
    const incomingTracks = event.streams[0]?.getTracks() || [event.track];
    const publishRemoteTracks = () => {
      const livePeerTracks = remoteStream.getTracks().filter(
        (track) =>
          track.readyState === "live" &&
          (track.kind !== "video" || !track.muted)
      );
      useChatState.setState((state) => {
        const remoteCallStreams = {
          ...state.remoteCallStreams,
          [peerAccountId]: new MediaStream(livePeerTracks),
        };
        const allRemoteTracks = Object.values(remoteCallStreams).flatMap(
          (stream) => stream.getTracks()
        );
        return {
          remoteCallStream: new MediaStream(allRemoteTracks),
          remoteCallStreams,
        };
      });
    };
    incomingTracks.forEach((track) => {
      if (!currentTracks.some((item) => item.id === track.id)) {
        remoteStream.addTrack(track);
      }
      track.onmute = publishRemoteTracks;
      track.onunmute = publishRemoteTracks;
      track.onended = () => {
        remoteStream.removeTrack(track);
        publishRemoteTracks();
      };
    });
    publishRemoteTracks();
  };
  callPeer.onicecandidate = ({ candidate }) => {
    if (!candidate) return;
    socket.emit("callSignal", {
      call_id: call.callId,
      conversation_id: call.conversationId,
      target_account_id: peerAccountId,
      signal_type: "ice-candidate",
      signal: candidate.toJSON(),
    });
  };
  useChatState.setState((state) => ({
    localCallStream: localStream,
    remoteCallStreams: {
      ...state.remoteCallStreams,
      [peerAccountId]: remoteStream,
    },
  }));
  callPeers.set(peerAccountId, callPeer);
  return callPeer;
}

async function addQueuedIceCandidates(peerAccountId: string) {
  const callPeer = callPeers.get(peerAccountId);
  if (!callPeer?.remoteDescription) return;
  const candidates = queuedIceCandidates.get(peerAccountId) || [];
  while (candidates.length) {
    const candidate = candidates.shift();
    if (candidate) {
      await callPeer.addIceCandidate(candidate).catch(() => undefined);
    }
  }
  queuedIceCandidates.delete(peerAccountId);
}

async function setLocalMediaKind(
  call: ChatCall,
  kind: "video" | "audio",
  enabled: boolean
) {
  const state = useChatState.getState();
  const currentStream = state.localCallStream || new MediaStream();
  const staleTracks = currentStream.getTracks().filter((track) => track.kind === kind);
  let nextTrack: MediaStreamTrack | null = null;

  if (enabled) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone require localhost or a secure HTTPS connection.");
    }
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video:
        kind === "video"
          ? {
              width: { ideal: 640 },
              height: { ideal: 360 },
              frameRate: { ideal: 24, max: 30 },
            }
          : false,
      audio: kind === "audio",
    });
    nextTrack = mediaStream.getTracks().find((track) => track.kind === kind) || null;
    if (!nextTrack) {
      mediaStream.getTracks().forEach((track) => track.stop());
      throw new Error(`No ${kind === "video" ? "camera" : "microphone"} is available.`);
    }
  }

  staleTracks.forEach((track) => {
    currentStream.removeTrack(track);
    track.stop();
  });
  if (nextTrack) currentStream.addTrack(nextTrack);

  await Promise.all(
    [...callPeers.values()].map(async (peerConnection) => {
      const transceiver = peerConnection.getTransceivers().find(
        (item) => item.receiver.track.kind === kind
      );
      if (!transceiver) return;
      await transceiver.sender.replaceTrack(nextTrack);
    })
  );
  useChatState.setState({
    localCallStream: new MediaStream(currentStream.getTracks()),
  });

  await emitWithAck<CallSignal>("callSignal", {
    call_id: call.callId,
    conversation_id: call.conversationId,
    target_account_id:
      call.conversationType === "group" ? undefined : call.peerAccountId,
    signal_type: "media-state",
    signal: {
      video: currentStream.getVideoTracks().some(
        (track) => track.enabled && track.readyState === "live"
      ),
      audio: currentStream.getAudioTracks().some(
        (track) => track.enabled && track.readyState === "live"
      ),
    },
  });

  return Boolean(nextTrack);
}

async function persistCallCard(
  conversationId: string,
  outcome: "ended" | "missed",
  startedAt?: number
) {
  const callStartedAt = startedAt || useChatState.getState().activeCall?.startedAt;
  const duration =
    callStartedAt
      ? Math.max(
          0,
          Math.round(
            (Date.now() - callStartedAt) / 1000
          )
        )
      : 0;
  const content =
    outcome === "missed"
      ? "[video-call:missed] Missed video call"
      : `[video-call:ended] Video call · ${formatCallDuration(duration)}`;
  await useChatState
    .getState()
    .sendMessage(conversationId, content)
    .catch(() => undefined);
}

export function formatCallDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [
    ...(hours > 0 ? [hours] : []),
    minutes,
    remainingSeconds,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function formatCallCardText(content = "") {
  const text = content.replace(
    /^(?:\[video-call:(?:missed|ended)\]|\[meeting:(?:requested|ended):[^\]]+\]|\[zoom-call:(?:started|ended):[^\]]+\])\s*/,
    ""
  );
  return text.replace(/(\d+)\s+secs?\b/i, (_match, seconds) =>
    formatCallDuration(Number(seconds))
  );
}

const messageTime = (message: Message) =>
  new Date(message.created_at || message.updated_at || 0).getTime();

const conversationTime = (conversation: Inbox) =>
  new Date(
    conversation.last_message_time || conversation.updated_at || 0
  ).getTime();

const messagePreview = (message: Message) =>
  message.message_content ||
  (message.attachments?.length
    ? message.attachments.length === 1
      ? "Sent an attachment"
      : `Sent ${message.attachments.length} attachments`
    : "");

function upsertMessage(messages: Message[], incoming: Message): Message[] {
  const incomingId = String(incoming._id);
  const existingIndex = messages.findIndex(
    (message) => String(message._id) === incomingId
  );
  if (existingIndex === -1) {
    return [...messages, incoming].sort(
      (left, right) => messageTime(left) - messageTime(right)
    );
  }
  const next = [...messages];
  next[existingIndex] = { ...next[existingIndex], ...incoming };
  return next;
}

function upsertConversation(
  conversations: Inbox[],
  incoming: Inbox
): Inbox[] {
  const incomingId = String(incoming._id);
  const existingIndex = conversations.findIndex(
    (conversation) => String(conversation._id) === incomingId
  );
  const next =
    existingIndex === -1
      ? [incoming, ...conversations]
      : conversations.map((conversation, index) =>
          index === existingIndex ? { ...conversation, ...incoming } : conversation
        );
  return next.sort(
    (left, right) => conversationTime(right) - conversationTime(left)
  );
}

function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(10000).emit(
      event,
      payload,
      (timeoutError: Error | null, response?: SocketAck<T>) => {
        if (timeoutError) {
          reject(new Error("Chat request timed out"));
          return;
        }
        if (!response?.success || response.data === undefined) {
          reject(new Error(response?.error || "Chat request failed"));
          return;
        }
        resolve(response.data);
      }
    );
  });
}

function reconcileMessage(message: Message, isNewMessage = false) {
  if (!message?._id || !message.conversation_id) return;
  const conversationId = String(message.conversation_id);
  const existedBefore = (
    useChatState.getState().messagesByConversation[conversationId] ||
    EMPTY_MESSAGES
  ).some((current) => String(current._id) === String(message._id));
  useChatState.setState((state) => {
    const currentMessages =
      state.messagesByConversation[conversationId] || EMPTY_MESSAGES;
    const alreadyExists = currentMessages.some(
      (current) => String(current._id) === String(message._id)
    );
    const isIncoming =
      authenticatedAccountId &&
      String(message.sender_id) !== authenticatedAccountId;
    const isActive =
      state.activeConversationId === conversationId &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible";
    const unreadCount =
      isNewMessage && !alreadyExists && isIncoming && !isActive
        ? (state.unreadCounts[conversationId] || 0) + 1
        : state.unreadCounts[conversationId] || 0;

    return {
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: upsertMessage(
          currentMessages,
          message
        ),
      },
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: unreadCount,
      },
      conversations: state.conversations
        .map((conversation) => {
          if (String(conversation._id) !== conversationId) return conversation;
          return isNewMessage
            ? {
                ...conversation,
                last_message: messagePreview(message),
                last_message_id: String(message._id),
                last_message_sender_id: String(message.sender_id),
                last_message_time: message.created_at,
                updated_at: message.updated_at,
                unread_count: unreadCount,
              }
            : conversation;
        })
        .sort(
          (left, right) => conversationTime(right) - conversationTime(left)
        ),
    };
  });

  const state = useChatState.getState();
  const isConversationOpen =
    state.activeConversationId === conversationId ||
    (state.isFloatingOpen &&
      state.floatingWindows.some((chatWindow) =>
        [chatWindow.id, chatWindow.inbox_id].some(
          (id) => String(id) === conversationId
        )
      ));
  if (
    isConversationOpen &&
    isNewMessage &&
    !existedBefore &&
    authenticatedAccountId &&
    String(message.sender_id) !== authenticatedAccountId &&
    document.visibilityState === "visible"
  ) {
    state.markConversationRead(conversationId);
  }
}

function bindSocketListeners() {
  if (listenersBound) return;
  listenersBound = true;
  const requestPresenceSnapshot = () => {
    if (socket.connected) socket.emit("getPresenceSnapshot", {});
  };
  socket.on("connect", requestPresenceSnapshot);
  const refreshPresenceWhenVisible = () => {
    if (document.visibilityState === "visible") requestPresenceSnapshot();
  };
  document.addEventListener("visibilitychange", refreshPresenceWhenVisible);
  presenceRefreshInterval ||= setInterval(requestPresenceSnapshot, 20_000);

  const markVisibleConversationRead = () => {
    if (document.visibilityState !== "visible") return;
    const state = useChatState.getState();
    const openConversationIds = new Set<string>();
    if (state.activeConversationId) openConversationIds.add(String(state.activeConversationId));
    if (state.isFloatingOpen) {
      state.floatingWindows.forEach((chatWindow) =>
        openConversationIds.add(String(chatWindow.inbox_id || chatWindow.id))
      );
    }
    openConversationIds.forEach((conversationId) =>
      state.markConversationRead(conversationId)
    );
  };

  socket.on("connect", () => {
    if (authenticatedAccountId) {
      void useChatState
        .getState()
        .fetchConversations()
        .then(markVisibleConversationRead)
        .catch((error) => console.error("Unable to refresh chats:", error));
    }
  });
  window.addEventListener("focus", markVisibleConversationRead);
  document.addEventListener("visibilitychange", markVisibleConversationRead);
  socket.on("newMessage", (message: Message) =>
    reconcileMessage(message, true)
  );
  socket.on("messageReplied", (message: Message) =>
    reconcileMessage(message, true)
  );
  socket.on("messageUpdated", (message: Message) =>
    reconcileMessage(message)
  );
  socket.on("messageReactionUpdated", (message: Message) =>
    reconcileMessage(message)
  );

  socket.on(
    "messageDeleted",
    ({
      conversation_id,
      message_id,
      deleted_at,
    }: {
      conversation_id: string;
      message_id: string;
      deleted_at: string;
    }) => {
      useChatState.setState((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversation_id]: (
            state.messagesByConversation[conversation_id] || EMPTY_MESSAGES
          ).map((message) =>
            String(message._id) === String(message_id)
              ? {
                  ...message,
                  is_deleted: true,
                  is_unsent: true,
                  deleted_at,
                }
              : message
          ),
        },
      }));
    }
  );

  const reconcilePins = ({
    conversation_id,
    pinned_messages,
  }: {
    conversation_id: string;
    pinned_messages: PinnedMessage[];
  }) => {
    useChatState.setState((state) => ({
      conversations: state.conversations.map((conversation) =>
        String(conversation._id) === String(conversation_id)
          ? { ...conversation, pinned_messages }
          : conversation
      ),
    }));
  };
  socket.on("messagePinned", reconcilePins);
  socket.on("messageUnpinned", reconcilePins);
  socket.on("groupMembersUpdated", (conversation: Inbox) => {
    useChatState.setState((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
    }));
  });
  socket.on("groupProfileImageUpdated", (conversation: Inbox) => {
    const imageUrl = conversation.conversation_image_key
      ? chatMediaUrl(conversation.conversation_image_key)
      : undefined;
    useChatState.setState((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
      floatingWindows: state.floatingWindows.map((window) =>
        [window.id, window.inbox_id].some(
          (id) => String(id) === String(conversation._id)
        )
          ? { ...window, avatarUrl: imageUrl }
          : window
      ),
    }));
  });
  socket.on("conversationPreviewUpdated", (conversation: Inbox) => {
    useChatState.setState((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
    }));
  });


  socket.on("conversationCreated", (conversation: Inbox) => {
    useChatState.setState((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
    }));
    socket.emit("joinRoom", {
      conversation_id: String(conversation._id),
    });
  });
  socket.on(
    "conversationRenamed",
    ({
      conversation_id,
      conversation_name,
      updated_at,
    }: {
      conversation_id: string;
      conversation_name: string;
      updated_at: string;
    }) => {
      useChatState.setState((state) => ({
        conversations: state.conversations.map((conversation) =>
          String(conversation._id) === String(conversation_id)
            ? { ...conversation, conversation_name, updated_at }
            : conversation
        ),
        floatingWindows: state.floatingWindows.map((window) =>
          [window.id, window.inbox_id].some(
            (id) => String(id) === String(conversation_id)
          )
            ? { ...window, name: conversation_name }
            : window
        ),
      }));
    }
  );

  socket.on(
    "typingChanged",
    ({
      conversation_id,
      account_id,
      is_typing,
    }: {
      conversation_id: string;
      account_id: string;
      is_typing: boolean;
    }) => {
      if (String(account_id) === authenticatedAccountId) return;
      useChatState.setState((state) => {
        const typing = new Set(
          state.typingByConversation[conversation_id] || []
        );
        if (is_typing) typing.add(String(account_id));
        else typing.delete(String(account_id));
        return {
          typingByConversation: {
            ...state.typingByConversation,
            [conversation_id]: [...typing],
          },
        };
      });
    }
  );

  socket.on(
    "conversationPresence",
    ({
      members,
    }: {
      members: Array<{ account_id: string; is_online: boolean }>;
    }) => {
      useChatState.setState((state) => ({
        onlineAccounts: {
          ...state.onlineAccounts,
          ...Object.fromEntries(
            members.map((member) => [
              String(member.account_id),
              member.is_online,
            ])
          ),
        },
      }));
    }
  );
  socket.on(
    "presenceSnapshot",
    ({ members }: { members: Array<{ account_id: string; is_online: boolean }> }) => {
      useChatState.setState((state) => ({
        onlineAccounts: {
          ...state.onlineAccounts,
          ...Object.fromEntries(
            members.map((member) => [String(member.account_id), member.is_online])
          ),
        },
      }));
    }
  );
  socket.on(
    "presenceChanged",
    ({
      account_id,
      is_online,
    }: {
      account_id: string;
      is_online: boolean;
    }) => {
      useChatState.setState((state) => ({
        onlineAccounts: {
          ...state.onlineAccounts,
          [String(account_id)]: is_online,
        },
      }));
    }
  );

  socket.on(
    "messagesSeen",
    ({
      conversation_id,
      account_id,
      read_at,
    }: {
      conversation_id: string;
      account_id: string;
      read_at: string;
    }) => {
      useChatState.setState((state) => ({
        unreadCounts:
          String(account_id) === authenticatedAccountId
            ? { ...state.unreadCounts, [conversation_id]: 0 }
            : state.unreadCounts,
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversation_id]: (
            state.messagesByConversation[conversation_id] || EMPTY_MESSAGES
          ).map((message) => {
            if (String(message.sender_id) === String(account_id)) return message;
            const readBy = message.read_by || [];
            if (
              readBy.some(
                (reader) => String(reader.account_id) === String(account_id)
              )
            ) {
              return message;
            }
            return {
              ...message,
              read_by: [
                ...readBy,
                { account_id: String(account_id), read_at },
              ],
            };
          }),
        },
      }));
    }
  );
  socket.on("googleMeetingRequested", (event: GoogleMeetingEvent) => {
    useChatState.setState((state) => ({
      googleMeetingsByConversation: {
        ...state.googleMeetingsByConversation,
        [String(event.conversation_id)]: event,
      },
    }));
    if (String(event.requested_by_account_id) === String(authenticatedAccountId)) return;
    if (event.status === "scheduled") {
      toast(`${event.requester_name || "Someone"} scheduled a meeting.`);
      return;
    }
    const state = useChatState.getState();
    if (state.activeCall) return;
    const conversation = state.conversations.find(
      (item) => String(item._id) === String(event.conversation_id)
    );
    startRing();
    useChatState.setState({
      activeCall: {
        provider: "google-meet",
        callId: String(event.meeting_id),
        conversationId: String(event.conversation_id),
        peerAccountId: String(event.requested_by_account_id),
        peerName: event.requester_name || conversation?.conversation_name || "Someone",
        peerAvatar: event.requester_avatar || undefined,
        direction: "incoming",
        status: "ringing",
        startedAt: new Date(event.started_at).getTime(),
        conversationType: conversation?.conversation_type,
        groupName: conversation?.conversation_name,
        callerId: String(event.requested_by_account_id),
        callerName: event.requester_name || undefined,
        startedByAccountId: String(event.requested_by_account_id),
        participantIds: event.participant_ids || [],
      },
    });
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== "ensemble:google-meeting-closed") return;
    const activeCall = useChatState.getState().activeCall;
    if (activeCall?.provider === "google-meet") useChatState.setState({ activeCall: null });
  });

  socket.on("googleMeetingEnded", (event: GoogleMeetingEvent) => {
    useChatState.setState((state) => {
      const googleMeetingsByConversation = { ...state.googleMeetingsByConversation };
      delete googleMeetingsByConversation[String(event.conversation_id)];
      return { googleMeetingsByConversation };
    });
    const activeCall = useChatState.getState().activeCall;
    if (activeCall?.provider !== "google-meet" || activeCall.callId !== String(event.meeting_id)) return;
    stopRing();
    useChatState.setState({ activeCall: null });
    toast("The meeting has ended.");
  });
  socket.on("googleMeetingUpdated", (event: GoogleMeetingEvent) => {
    useChatState.setState((state) => ({
      googleMeetingsByConversation: {
        ...state.googleMeetingsByConversation,
        [String(event.conversation_id)]: event,
      },
    }));
    const activeCall = useChatState.getState().activeCall;
    if (activeCall?.provider !== "google-meet" || activeCall.callId !== String(event.meeting_id)) return;
    useChatState.setState({
      activeCall: {
        ...activeCall,
        participantIds: event.participant_ids || activeCall.participantIds,
        status: "active",
      },
    });
  });

  socket.on("callSignal", async (callSignal: CallSignal) => {
    const state = useChatState.getState();
    if (callSignal.signal_type === "offer") {
      if (
        state.activeCall?.callId === String(callSignal.call_id) &&
        callSignal.signal
      ) {
        const peerAccountId = String(callSignal.account_id);
        const callPeer = await createCallPeer(
          state.activeCall,
          peerAccountId
        );
        await callPeer.setRemoteDescription(
          callSignal.signal as RTCSessionDescriptionInit
        );
        const answer = await callPeer.createAnswer();
        await callPeer.setLocalDescription(answer);
        socket.emit("callSignal", {
          call_id: state.activeCall.callId,
          conversation_id: state.activeCall.conversationId,
          target_account_id: peerAccountId,
          signal_type: "answer",
          signal: answer,
        });
        await addQueuedIceCandidates(peerAccountId);
        clearCallTimeout();
        stopRing();
        useChatState.setState({
          activeCall: { ...state.activeCall, status: "active" },
        });
        return;
      }
      if (state.activeCall) return;
      const conversation = state.conversations.find(
        (item) => String(item._id) === String(callSignal.conversation_id)
      );
      const peerWindow = state.floatingWindows.find(
        (item) => String(item.account_id) === String(callSignal.account_id)
      );
      state.loadConversation(String(callSignal.conversation_id)).catch(() => undefined);
      useChatState.setState({
        activeCall: {
          callId: String(callSignal.call_id),
          conversationId: String(callSignal.conversation_id),
          peerAccountId: String(callSignal.account_id),
          peerName:
            callSignal.conversation_type === "group"
              ? callSignal.conversation_name || conversation?.conversation_name || "Group chat"
              : peerWindow?.name || callSignal.actor_name || "Incoming call",
          peerAvatar:
            callSignal.conversation_type === "group"
              ? callSignal.conversation_image_key
              : peerWindow?.avatarUrl || callSignal.actor_avatar,
          direction: "incoming",
          status: "ringing",
          pendingOffer: callSignal.signal
            ? (callSignal.signal as RTCSessionDescriptionInit)
            : undefined,
          startedAt: callSignal.started_at
            ? new Date(callSignal.started_at).getTime()
            : Date.now(),
          conversationType: callSignal.conversation_type,
          groupName: callSignal.conversation_name,
          groupAvatar: callSignal.conversation_image_key,
          callerName: callSignal.caller_name || callSignal.actor_name,
          callerId: callSignal.caller_id || callSignal.account_id,
          participantIds: callSignal.participant_ids || [],
        },
      });
      startRing();
      scheduleCallTimeout(String(callSignal.call_id), callSignal.expires_at);
      return;
    }
    if (
      !state.activeCall ||
      state.activeCall.callId !== String(callSignal.call_id)
    ) {
      return;
    }
    if (callSignal.signal_type === "answer") {
      const peerAccountId = String(callSignal.account_id);
      const callPeer = callPeers.get(peerAccountId);
      if (callPeer && callSignal.signal) {
        await callPeer.setRemoteDescription(
          callSignal.signal as RTCSessionDescriptionInit
        );
        await addQueuedIceCandidates(peerAccountId);
      } else if (!callSignal.signal) {
        const peer = await createCallPeer(state.activeCall, peerAccountId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("callSignal", {
          call_id: state.activeCall.callId,
          conversation_id: state.activeCall.conversationId,
          target_account_id: peerAccountId,
          signal_type: "offer",
          signal: offer,
        });
      }
      clearCallTimeout();
      stopRing();
      useChatState.setState({
        activeCall: {
          ...state.activeCall,
          status: "active",
          startedAt:
            state.activeCall.status === "active"
              ? state.activeCall.startedAt
              : Date.now(),
        },
      });
    } else if (callSignal.signal_type === "ice-candidate") {
      const peerAccountId = String(callSignal.account_id);
      const callPeer = callPeers.get(peerAccountId);
      const candidate = callSignal.signal as RTCIceCandidateInit;
      if (callPeer?.remoteDescription) {
        await callPeer.addIceCandidate(candidate).catch(() => undefined);
      } else {
        const candidates = queuedIceCandidates.get(peerAccountId) || [];
        candidates.push(candidate);
        queuedIceCandidates.set(peerAccountId, candidates);
      }
    } else if (callSignal.signal_type === "media-state") {
      const mediaState = (callSignal.signal || {}) as {
        video?: boolean;
        audio?: boolean;
      };
      useChatState.setState((currentState) => ({
        remoteMediaStates: {
          ...currentState.remoteMediaStates,
          [String(callSignal.account_id)]: {
            video: Boolean(mediaState.video),
            audio: Boolean(mediaState.audio),
          },
        },
      }));
    } else if (callSignal.signal_type === "resume") {
      const peerAccountId = String(callSignal.account_id);
      if (peerAccountId === authenticatedAccountId) return;
      const peer = await createCallPeer(state.activeCall, peerAccountId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("callSignal", {
        call_id: state.activeCall.callId,
        conversation_id: state.activeCall.conversationId,
        target_account_id: peerAccountId,
        signal_type: "offer",
        signal: offer,
      });
    } else if (callSignal.signal_type === "busy") {
      releaseCallMedia();
      useChatState.setState({
        activeCall: { ...state.activeCall, status: "busy" },
      });
    } else if (callSignal.signal_type === "participant-left") {
      const departedAccountId = String(callSignal.account_id);
      removeCallPeer(departedAccountId);
      useChatState.setState({
        activeCall: {
          ...state.activeCall,
          participantIds: (callSignal.participant_ids || []).map(String),
        },
      });
    } else if (
      callSignal.signal_type === "reject" ||
      callSignal.signal_type === "end"
    ) {
      releaseCallMedia();
      useChatState.setState({ activeCall: null });
    }
  });
  socket.on("callSessionRestored", (session: CallSignal) => {
    if (!authenticatedAccountId || useChatState.getState().activeCall) return;
    const isCaller = String(session.caller_id) === authenticatedAccountId;
    const isParticipant = (session.participant_ids || []).some(
      (participantId) => String(participantId) === authenticatedAccountId
    );
    const isGroup = session.conversation_type === "group";
    const call: ChatCall = {
      callId: String(session.call_id),
      conversationId: String(session.conversation_id),
      peerAccountId: String(session.caller_id || session.account_id),
      peerName: isGroup
        ? session.conversation_name || "Group chat"
        : session.caller_name || session.actor_name || "Video call",
      peerAvatar: isGroup
        ? session.conversation_image_key
        : session.caller_avatar || session.actor_avatar,
      direction: isCaller ? "outgoing" : "incoming",
      status: isParticipant && session.status === "active" ? "active" : "ringing",
      startedAt: session.started_at
        ? new Date(session.started_at).getTime()
        : Date.now(),
      conversationType: session.conversation_type,
      groupName: session.conversation_name,
      groupAvatar: session.conversation_image_key,
      callerName: session.caller_name,
      callerId: session.caller_id,
      participantIds: session.participant_ids || [],
    };
    useChatState.setState({
      activeCall: call,
      remoteMediaStates: { ...(session.media_states || {}) },
    });
    if (call.status === "ringing") {
      if (!isCaller) startRing();
      if (session.call_status !== "active") {
        scheduleCallTimeout(call.callId, session.expires_at);
      }
    } else {
      const resumeTarget = (session.participant_ids || []).find(
        (participantId) => String(participantId) !== authenticatedAccountId
      );
      if (!resumeTarget) return;
      socket.emit("callSignal", {
        call_id: call.callId,
        conversation_id: call.conversationId,
        target_account_id: String(resumeTarget),
        signal_type: "resume",
        signal: null,
      });
    }
  });
  socket.on(
    "groupCallUpdated",
    ({ conversation_id, call }: { conversation_id: string; call: GroupCallSummary | null }) => {
      const state = useChatState.getState();
      const next = { ...state.groupCallsByConversation };
      if (call) next[String(conversation_id)] = {
        ...call,
        participant_ids: Array.from(new Set(call.participant_ids.map(String))),
        participant_profiles: Array.from(
          new Map(
            (call.participant_profiles || []).map((participant) => [
              String(participant.account_id),
              participant,
            ])
          ).values()
        ),
      };
      else delete next[String(conversation_id)];

      const current = state.activeCall;
      if (!current || current.conversationId !== String(conversation_id)) {
        useChatState.setState({ groupCallsByConversation: next });
        return;
      }
      if (!call) {
        releaseCallMedia();
        useChatState.setState({ groupCallsByConversation: next, activeCall: null });
        return;
      }
      const participantIds = Array.from(new Set(call.participant_ids.map(String)));
      for (const peerAccountId of [...callPeers.keys()]) {
        if (!participantIds.includes(peerAccountId)) removeCallPeer(peerAccountId);
      }
      const currentAccountIsParticipant = Boolean(
        authenticatedAccountId && participantIds.includes(authenticatedAccountId)
      );
      if (current.status === "active" && !currentAccountIsParticipant) {
        releaseCallMedia();
        useChatState.setState({ groupCallsByConversation: next, activeCall: null });
        return;
      }
      useChatState.setState({
        groupCallsByConversation: next,
        activeCall: { ...current, participantIds },
        remoteMediaStates: Object.fromEntries(
          Object.entries(call.media_states || {}).filter(([accountId]) =>
            participantIds.includes(String(accountId))
          )
        ),
      });
    }
  );
}

const useChatState = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  floatingWindows: [],
  activeFloatingId: null,
  isFloatingOpen: false,
  unreadCounts: {},
  typingByConversation: {},
  onlineAccounts: {},
  loadingConversations: false,
  loadingMessages: {},
  activeCall: null,
  meetingCreationPrompt: null,
  googleMeetingsByConversation: {},
  groupCallsByConversation: {},
  localCallStream: null,
  remoteCallStream: null,
  remoteCallStreams: {},
  remoteMediaStates: {},

  initialize: (accountId) => {
    const nextAccountId = String(accountId);
    if (authenticatedAccountId !== nextAccountId) {
      authenticatedAccountId = nextAccountId;
      set({
        conversations: [],
        messagesByConversation: {},
        activeConversationId: null,
        floatingWindows: [],
        activeFloatingId: null,
        unreadCounts: {},
        typingByConversation: {},
        onlineAccounts: {},
        activeCall: null,
        googleMeetingsByConversation: {},
        groupCallsByConversation: {},
        localCallStream: null,
        remoteCallStream: null,
        remoteCallStreams: {},
        remoteMediaStates: {},
      });
      loadedConversationIds.clear();
    }
    bindSocketListeners();
    if (!socket.connected) socket.connect();
    void get()
      .fetchConversations()
      .catch((error) => console.error("Unable to load chats:", error));
  },

  reset: () => {
    releaseCallMedia();
    authenticatedAccountId = null;
    conversationsRequest = null;
    messageRequests.clear();
    loadedConversationIds.clear();
    pendingGoogleMeetingWindow?.close();
    pendingGoogleMeetingWindow = null;
    socket.disconnect();
    set({
      conversations: [],
      messagesByConversation: {},
      activeConversationId: null,
      floatingWindows: [],
      activeFloatingId: null,
      isFloatingOpen: false,
      unreadCounts: {},
      typingByConversation: {},
      onlineAccounts: {},
      loadingConversations: false,
      loadingMessages: {},
      activeCall: null,
      meetingCreationPrompt: null,
      googleMeetingsByConversation: {},
      groupCallsByConversation: {},
      localCallStream: null,
      remoteCallStream: null,
      remoteCallStreams: {},
      remoteMediaStates: {},
    });
  },

  fetchConversations: async () => {
    if (!authenticatedAccountId) return;
    if (conversationsRequest) return conversationsRequest;
    conversationsRequest = (async () => {
      set({ loadingConversations: true });
      try {
        const response = await api.get<Inbox[]>("/api/inbox");
        const conversations = response.data || [];
        set((state) => ({
          conversations: conversations
            .reduce<Inbox[]>(
              (result, conversation) =>
                upsertConversation(result, conversation),
              []
            )
            .sort(
              (left, right) =>
                conversationTime(right) - conversationTime(left)
            ),
          unreadCounts: {
            ...state.unreadCounts,
            ...Object.fromEntries(
              conversations.map((conversation) => [
                String(conversation._id),
                conversation.unread_count || 0,
              ])
            ),
          },
        }));
        conversations
          .filter((conversation) => conversation.conversation_type === "group")
          .forEach((conversation) => {
            emitWithAck<GroupCallSummary | null>("getActiveGroupCall", {
              conversation_id: String(conversation._id),
            })
              .then((call) => {
                if (!call) return;
                set((state) => ({
                  groupCallsByConversation: {
                    ...state.groupCallsByConversation,
                    [String(conversation._id)]: call,
                  },
                }));
              })
              .catch(() => undefined);
          });
      } finally {
        set({ loadingConversations: false });
        conversationsRequest = null;
      }
    })();
    return conversationsRequest;
  },

  loadConversation: async (conversationId) => {
    const id = String(conversationId);
    if (loadedConversationIds.has(id)) return;
    const existingRequest = messageRequests.get(id);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      set((state) => ({
        loadingMessages: { ...state.loadingMessages, [id]: true },
      }));
      try {
        const response = await api.get<{
          Inbox: Inbox;
          Messages: Message[];
        }>(`/api/inbox/conversation/${id}`);
        set((state) => ({
          conversations: response.data.Inbox
            ? upsertConversation(state.conversations, response.data.Inbox)
            : state.conversations,
          messagesByConversation: {
            ...state.messagesByConversation,
            [id]: (response.data.Messages || []).reduce<Message[]>(
              (messages, message) => upsertMessage(messages, message),
              state.messagesByConversation[id] || []
            ),
          },
        }));
        loadedConversationIds.add(id);
        socket.emit("joinRoom", { conversation_id: id });
        const activeGoogleMeeting = await api
          .get<GoogleMeetingEvent | null>(`/api/google-meet/conversations/${id}/active`)
          .then((result) => result.data)
          .catch(() => null);
        set((state) => {
          const meetings = { ...state.googleMeetingsByConversation };
          if (activeGoogleMeeting) meetings[id] = activeGoogleMeeting;
          else delete meetings[id];
          return { googleMeetingsByConversation: meetings };
        });
        if (
          !get().activeCall &&
          activeGoogleMeeting?.status === "requested" &&
          String(activeGoogleMeeting.requested_by_account_id) !== String(authenticatedAccountId)
        ) {
            const conversation = get().conversations.find(
              (item) => String(item._id) === id
            );
            set({
              activeCall: {
                provider: "google-meet",
                callId: String(activeGoogleMeeting.meeting_id),
                conversationId: id,
                peerAccountId: String(activeGoogleMeeting.requested_by_account_id),
                peerName: activeGoogleMeeting.requester_name || conversation?.conversation_name || "Someone",
                peerAvatar: activeGoogleMeeting.requester_avatar || undefined,
                direction: "incoming",
                status: "ringing",
                startedAt: new Date(activeGoogleMeeting.started_at).getTime(),
                conversationType: conversation?.conversation_type,
                callerId: String(activeGoogleMeeting.requested_by_account_id),
                callerName: activeGoogleMeeting.requester_name || undefined,
                startedByAccountId: String(activeGoogleMeeting.requested_by_account_id),
                participantIds: activeGoogleMeeting.participant_ids || [],
              },
            });
        }
      } finally {
        set((state) => ({
          loadingMessages: { ...state.loadingMessages, [id]: false },
        }));
        messageRequests.delete(id);
      }
    })();
    messageRequests.set(id, request);
    return request;
  },

  selectConversation: async (conversationId) => {
    const id = String(conversationId);
    set({ activeConversationId: id });
    await get().loadConversation(id);
    get().markConversationRead(id);
  },

  openDirectChat: async (target) => {
    if (!target.account_id) return;
    const direct = await api.post<string>("/api/inbox/two-accounts", {
      recipientId: target.account_id,
      conversation_type: "direct",
    });
    const conversationId = String(direct.data);
    const response = await api.get<{ inbox: Inbox }>(
      `/api/inbox/conversation/direct/${target.account_id}`
    );
    const inbox = response.data.inbox;
    set((state) => ({
      conversations: upsertConversation(state.conversations, inbox),
    }));
    await get().openFloatingConversation({
      ...target,
      id: conversationId,
      inbox_id: conversationId,
      avatarPayload: (inbox as Inbox & {
        avatarPayload?: Record<string, string>;
      }).avatarPayload,
    });
  },

  openFloatingConversation: async (target) => {
    const conversationId = String(target.inbox_id || target.id);
    const chatTarget = {
      ...target,
      id: conversationId,
      inbox_id: conversationId,
    };
    set((state) => ({
      floatingWindows: [
        chatTarget,
        ...state.floatingWindows.filter(
          (window) => String(window.id) !== conversationId
        ),
      ].slice(0, 4),
      activeFloatingId: conversationId,
      activeConversationId: conversationId,
      isFloatingOpen: true,
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
    }));
    await get().loadConversation(conversationId);
    get().markConversationRead(conversationId);
  },

  closeFloatingChat: () =>
    set({
      isFloatingOpen: false,
      activeFloatingId: null,
      activeConversationId: null,
    }),

  removeFloatingWindow: (windowId) =>
    set((state) => {
      const floatingWindows = state.floatingWindows.filter(
        (window) => String(window.id) !== String(windowId)
      );
      const removedActive =
        String(state.activeFloatingId) === String(windowId);
      return {
        floatingWindows,
        activeFloatingId: removedActive
          ? floatingWindows[0]?.id || null
          : state.activeFloatingId,
        activeConversationId:
          String(state.activeConversationId) === String(windowId)
            ? floatingWindows[0]?.inbox_id || floatingWindows[0]?.id || null
            : state.activeConversationId,
        isFloatingOpen: removedActive ? false : state.isFloatingOpen,
      };
    }),

  createGroup: async (name, members) => {
    const response = await api.post<Inbox>("/api/inbox/group", {
      conversation_name: name,
      members,
    });
    set((state) => ({
      conversations: upsertConversation(state.conversations, response.data),
      activeConversationId: String(response.data._id),
    }));
    socket.emit("joinRoom", {
      conversation_id: String(response.data._id),
    });
    return response.data;
  },

  createEngagement: async (payload) => {
    const response = await api.post<Inbox>("/api/inbox/engagement", payload);
    set((state) => ({
      conversations: upsertConversation(state.conversations, response.data),
    }));
    return response.data;
  },


  createMarketplace: async (payload) => {
    const response = await api.post<{ inbox: Inbox; created: boolean }>(
      "/api/inbox/marketplace",
      payload
    );
    const inbox = response.data.inbox;
    set((state) => ({
      conversations: upsertConversation(state.conversations, inbox),
    }));
    socket.emit("joinRoom", {
      conversation_id: String(inbox._id),
    });
    return inbox;
  },
  createRevision: async (payload) => {
    const response = await api.post<{ inbox: Inbox; created: boolean }>(
      "/api/inbox/revision",
      payload
    );
    const inbox = response.data.inbox;
    set((state) => ({
      conversations: upsertConversation(state.conversations, inbox),
    }));
    socket.emit("joinRoom", {
      conversation_id: String(inbox._id),
    });
    return inbox;
  },
  updateGroupMember: async (conversationId, accountId, updates) => {
    const conversation = await emitWithAck<Inbox>("updateGroupMember", {
      conversation_id: String(conversationId),
      account_id: String(accountId),
      updates,
    });
    set((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
    }));
    return conversation;
  },

  removeGroupMember: async (conversationId, accountId) => {
    const conversation = await emitWithAck<Inbox>("removeGroupMember", {
      conversation_id: String(conversationId),
      account_id: String(accountId),
    });
    set((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
    }));
    return conversation;
  },

  updateGroupProfileImage: async (conversationId, imageKey) => {
    const id = String(conversationId);
    const previous = get().conversations.find(
      (item) => String(item._id) === id
    );
    const optimisticImageUrl = chatMediaUrl(imageKey);
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        String(conversation._id) === id
          ? { ...conversation, conversation_image_key: imageKey }
          : conversation
      ),
      floatingWindows: state.floatingWindows.map((window) =>
        [window.id, window.inbox_id].some(
          (windowId) => String(windowId) === id
        )
          ? { ...window, avatarUrl: optimisticImageUrl }
          : window
      ),
    }));
    try {
      const conversation = await emitWithAck<Inbox>(
        "updateGroupProfileImage",
        {
          conversation_id: id,
          image_key: imageKey,
        }
      );
      const imageUrl = conversation.conversation_image_key
        ? chatMediaUrl(conversation.conversation_image_key)
        : undefined;
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
        floatingWindows: state.floatingWindows.map((window) =>
          [window.id, window.inbox_id].some(
            (windowId) => String(windowId) === id
          )
            ? { ...window, avatarUrl: imageUrl }
            : window
        ),
      }));
      return conversation;
    } catch (error) {
      if (previous) {
        const previousImageUrl = previous.conversation_image_key
          ? chatMediaUrl(previous.conversation_image_key)
          : undefined;
        set((state) => ({
          conversations: upsertConversation(state.conversations, previous),
          floatingWindows: state.floatingWindows.map((window) =>
            [window.id, window.inbox_id].some(
              (windowId) => String(windowId) === id
            )
              ? { ...window, avatarUrl: previousImageUrl }
              : window
          ),
        }));
      }
      throw error;
    }
  },

  sendMessage: async (conversationId, messageContent, attachments = []) => {
    const messageType =
      attachments.length === 0
        ? "text"
        : attachments[0].attachment_type === "video"
        ? "video"
        : attachments[0].attachment_type === "file"
        ? "file"
        : "image";
    const message = await emitWithAck<Message>("sendMessage", {
      conversation_id: String(conversationId),
      message_type: messageType,
      message_content: messageContent,
      attachments,
      links: [],
    });
    reconcileMessage(message, true);
    return message;
  },

  replyMessage: async (
    conversationId,
    parentMessageId,
    messageContent,
    attachments = []
  ) => {
    const messageType =
      attachments.length === 0
        ? "text"
        : attachments[0].attachment_type === "video"
        ? "video"
        : attachments[0].attachment_type === "file"
        ? "file"
        : "image";
    const message = await emitWithAck<Message>("replyMessage", {
      conversation_id: String(conversationId),
      parent_message_id: String(parentMessageId),
      message_type: messageType,
      message_content: messageContent,
      attachments,
      links: [],
    });
    reconcileMessage(message, true);
    return message;
  },

  editMessage: async (messageId, messageContent) => {
    const message = await emitWithAck<Message>("editMessage", {
      message_id: String(messageId),
      message_content: messageContent,
    });
    reconcileMessage(message);
    return message;
  },

  deleteMessage: async (messageId) => {
    await emitWithAck("deleteMessage", { message_id: String(messageId) });
  },

  reactMessage: async (messageId, reactType, remove = false) => {
    const message = await emitWithAck<Message>("reactMessage", {
      message_id: String(messageId),
      react_type: reactType,
      remove,
    });
    reconcileMessage(message);
    return message;
  },

  pinMessage: async (conversationId, messageId, unpin = false) => {
    await emitWithAck(unpin ? "unpinMessage" : "pinMessage", {
      conversation_id: String(conversationId),
      message_id: String(messageId),
    });
  },

  renameConversation: async (conversationId, conversationName) => {
    const id = String(conversationId);
    const previous = get().conversations.find(
      (conversation) => String(conversation._id) === id
    );
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        String(conversation._id) === id
          ? { ...conversation, conversation_name: conversationName }
          : conversation
      ),
      floatingWindows: state.floatingWindows.map((window) =>
        [window.id, window.inbox_id].some(
          (windowId) => String(windowId) === id
        )
          ? { ...window, name: conversationName }
          : window
      ),
    }));
    try {
      const conversation = await emitWithAck<Inbox>("renameConversation", {
        conversation_id: id,
        conversation_name: conversationName,
      });
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
      }));
    } catch (error) {
      if (previous) {
        set((state) => ({
          conversations: upsertConversation(state.conversations, previous),
          floatingWindows: state.floatingWindows.map((window) =>
            [window.id, window.inbox_id].some(
              (windowId) => String(windowId) === id
            )
              ? { ...window, name: previous.conversation_name }
              : window
          ),
        }));
      }
      throw error;
    }
  },

  setTyping: (conversationId, isTyping) => {
    socket.emit("typing", {
      conversation_id: String(conversationId),
      is_typing: isTyping,
    });
  },

  markConversationRead: (conversationId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
      conversations: state.conversations.map((conversation) =>
        String(conversation._id) === String(conversationId)
          ? { ...conversation, unread_count: 0 }
          : conversation
      ),
    }));
    socket.emit("markConversationRead", {
      conversation_id: String(conversationId),
    });
  },

  startCall: async (conversationId, targetAccountId, peer = {}) => {
    if (get().activeCall) return;
    if (!peer.creationMode) {
      set({
        meetingCreationPrompt: {
          conversationId: String(conversationId),
          targetAccountId: String(targetAccountId),
          peerName: peer.name,
          peerAvatar: peer.avatar,
        },
      });
      return;
    }
    try {
      const response = await api.post<GoogleMeetingEvent>("/api/google-meet/meetings", {
        conversation_id: String(conversationId),
        mode: peer.creationMode,
        scheduled_at: peer.scheduledAt,
      });
      const meeting = response.data;
      set((state) => ({
        googleMeetingsByConversation: {
          ...state.googleMeetingsByConversation,
          [String(conversationId)]: meeting,
        },
      }));
      if (peer.creationMode === "instant") {
        await get().joinGoogleMeeting(meeting);
        toast.success("Instant meeting created.");
      } else {
        pendingGoogleMeetingWindow?.close();
        pendingGoogleMeetingWindow = null;
        toast.success("Meeting scheduled and shared with the conversation.");
      }
    } catch (error: any) {
      if (
        error?.response?.status === 409 &&
        /already has an active meeting/i.test(error?.response?.data?.error || "")
      ) {
        const active = await api
          .get<GoogleMeetingEvent | null>(`/api/google-meet/conversations/${conversationId}/active`)
          .then((response) => response.data)
          .catch(() => null);
        if (active) {
          set((state) => ({
            googleMeetingsByConversation: {
              ...state.googleMeetingsByConversation,
              [String(conversationId)]: active,
            },
          }));
          pendingGoogleMeetingWindow?.close();
          pendingGoogleMeetingWindow = null;
          toast("Restored the active meeting display.");
          return;
        }
      }
      if (
        error?.response?.status === 409 &&
        /(?:connect your google|reconnect your google)/i.test(error?.response?.data?.error || "")
      ) {
        const connection = await api.get<{ authorization_url: string }>("/api/google-meet/connect");
        const authWindow = pendingGoogleMeetingWindow && !pendingGoogleMeetingWindow.closed
          ? pendingGoogleMeetingWindow
          : window.open("about:blank", "ensemble-google-connect", "popup=yes,width=600,height=760,resizable=yes");
        if (authWindow) {
          pendingGoogleMeetingWindow = authWindow;
          authWindow.location.replace(connection.data.authorization_url);
          const redirect = new URL(connection.data.authorization_url).searchParams.get("redirect_uri");
          const callbackOrigin = redirect ? new URL(redirect).origin : "";
          let resumed = false;
          const resumeMeetingRequest = () => {
            if (resumed) return;
            resumed = true;
            window.removeEventListener("message", resumeAfterGoogleConnect);
            void get().startCall(conversationId, targetAccountId, { ...peer, oauthResumed: true });
          };
          const resumeAfterGoogleConnect = (messageEvent: MessageEvent) => {
            if (messageEvent.origin !== callbackOrigin) return;
            if (messageEvent.data?.type !== "ensemble:google-meet-connected") return;
            resumeMeetingRequest();
          };
          window.addEventListener("message", resumeAfterGoogleConnect);
          const closeWatcher = window.setInterval(async () => {
            if (!authWindow.closed) return;
            window.clearInterval(closeWatcher);
            if (resumed) return;
            const status = await api.get<{ connected: boolean }>("/api/google-meet/status").catch(() => null);
            if (status?.data.connected) resumeMeetingRequest();
          }, 750);
        } else {
          toast.error("Allow pop-ups for Ensemble to connect Google.");
        }
        return;
      }
      pendingGoogleMeetingWindow?.close();
      pendingGoogleMeetingWindow = null;
      toast.error(error?.response?.data?.error || "Unable to request the meeting.");
      return;
    }
  },

  cancelMeetingCreation: () => set({ meetingCreationPrompt: null }),

  submitMeetingCreation: async (mode, scheduledAt) => {
    const prompt = get().meetingCreationPrompt;
    if (!prompt) return;
    if (mode === "instant") {
      pendingGoogleMeetingWindow = window.open("about:blank", "ensemble-google-meet", "popup=yes,width=1100,height=760,resizable=yes,scrollbars=yes");
      if (!pendingGoogleMeetingWindow) {
        toast.error("Allow pop-ups for Ensemble to create the meeting.");
        return;
      }
      pendingGoogleMeetingWindow.document.write('<body style="margin:0;background:#080808;color:white;font:14px sans-serif;display:grid;place-items:center;height:100vh">Creating Google Meet...</body>');
    }
    set({ meetingCreationPrompt: null });
    await get().startCall(prompt.conversationId, prompt.targetAccountId, {
      name: prompt.peerName,
      avatar: prompt.peerAvatar,
      creationMode: mode,
      scheduledAt,
    });
  },

  joinGoogleMeeting: async (meeting) => {
    const popup = pendingGoogleMeetingWindow && !pendingGoogleMeetingWindow.closed
      ? pendingGoogleMeetingWindow
      : window.open("about:blank", "ensemble-google-meet", "popup=yes,width=1100,height=760,resizable=yes,scrollbars=yes");
    pendingGoogleMeetingWindow = null;
    if (!popup) {
      toast.error("Allow pop-ups for Ensemble to join the meeting.");
      return;
    }
    try {
      const response = await api.post<GoogleMeetingEvent & { meeting_url: string }>(
        `/api/google-meet/meetings/${meeting.meeting_id}/join`
      );
      set((state) => ({
        googleMeetingsByConversation: {
          ...state.googleMeetingsByConversation,
          [String(meeting.conversation_id)]: response.data,
        },
      }));
      popup.location.replace(response.data.meeting_url);
      popup.focus();
      const watcher = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(watcher);
        void api.post(`/api/google-meet/meetings/${meeting.meeting_id}/leave`).catch(() => undefined);
      }, 1000);
    } catch (error: any) {
      popup.close();
      toast.error(error?.response?.data?.error || "Unable to join the meeting.");
    }
  },

  endGoogleMeeting: async (meeting) => {
    try {
      const response = await api.post<{ provider_end_error?: string | null }>(`/api/google-meet/meetings/${meeting.meeting_id}/end`);
      if (response.data.provider_end_error) {
        toast.error(`Ensemble ended the meeting, but Google Meet reported: ${response.data.provider_end_error}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to end the meeting.");
    }
  },

  acceptCall: async () => {
    const call = get().activeCall;
    if (!call || call.direction !== "incoming") return;
    clearCallTimeout();
    stopRing();
    if (call.provider === "google-meet") {
      const meeting = get().googleMeetingsByConversation[call.conversationId];
      if (meeting) await get().joinGoogleMeeting(meeting);
      set({ activeCall: null });
      return;
    }
    try {
      const peerConnection =
        call.conversationType === "group"
          ? null
          : await createCallPeer(call, call.peerAccountId);
      let answer: RTCSessionDescriptionInit | null = null;
      if (call.pendingOffer && peerConnection) {
        await peerConnection.setRemoteDescription(call.pendingOffer);
        await addQueuedIceCandidates(call.peerAccountId);
        answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
      }
      const response = await emitWithAck<CallSignal>("callSignal", {
        call_id: call.callId,
        conversation_id: call.conversationId,
        target_account_id:
          call.conversationType === "group" ? undefined : call.peerAccountId,
        signal_type: "answer",
        signal: answer,
      });
      set({
        activeCall: {
          ...call,
          status: "active",
          startedAt: Date.now(),
        },
      });
    } catch (error) {
      releaseCallMedia();
      toast.error(
        error instanceof Error ? error.message : "Unable to join the video call."
      );
      throw error;
    }
  },

  rejectCall: async () => {
    const call = get().activeCall;
    if (!call) return;
    if (call.provider === "google-meet") {
      stopRing();
      set({ activeCall: null });
      return;
    }
    try {
      await emitWithAck<CallSignal>("callSignal", {
        call_id: call.callId,
        conversation_id: call.conversationId,
        target_account_id:
          call.conversationType === "group" ? undefined : call.peerAccountId,
        signal_type: call.direction === "incoming" ? "reject" : "end",
        signal: null,
      });
      if (call.direction === "incoming" || call.status === "ringing") {
        await persistCallCard(call.conversationId, "missed");
      }
    } finally {
      releaseCallMedia();
      set({ activeCall: null });
    }
  },

  endCall: async () => {
    const call = get().activeCall;
    if (!call) return;
    if (call.provider === "google-meet") {
      try {
        if (String(call.startedByAccountId) === String(authenticatedAccountId)) {
          await api.post(`/api/google-meet/meetings/${call.callId}/end`);
        }
      } finally {
        set({ activeCall: null });
      }
      return;
    }
    try {
      const response = await emitWithAck<CallSignal>("callSignal", {
        call_id: call.callId,
        conversation_id: call.conversationId,
        target_account_id:
          call.conversationType === "group" ? undefined : call.peerAccountId,
        signal_type: "end",
        signal: null,
      });
      if (
        call.conversationType !== "group" ||
        response.signal_type === "end"
      ) {
        await persistCallCard(call.conversationId, "ended", call.startedAt);
      }
    } finally {
      releaseCallMedia();
      set({ activeCall: null });
    }
  },
  endCallForEveryone: async () => {
    const call = get().activeCall;
    if (!call || call.conversationType !== "group") return;
    try {
      await emitWithAck<CallSignal>("callSignal", {
        call_id: call.callId,
        conversation_id: call.conversationId,
        signal_type: "end-for-everyone",
        signal: null,
      });
      await persistCallCard(call.conversationId, "ended", call.startedAt);
    } finally {
      releaseCallMedia();
      set({ activeCall: null });
    }
  },
  joinGroupCall: async (conversationId) => {
    if (get().activeCall) return;
    const call = get().groupCallsByConversation[String(conversationId)];
    if (!call) {
      toast.error("This group call is no longer active.");
      return;
    }
    set({
      activeCall: {
        callId: call.call_id,
        conversationId: call.conversation_id,
        peerAccountId: call.caller_id,
        peerName: call.conversation_name || "Group chat",
        peerAvatar: call.conversation_image_key,
        direction: "incoming",
        status: "ringing",
        startedAt: new Date(call.started_at).getTime(),
        conversationType: "group",
        groupName: call.conversation_name,
        groupAvatar: call.conversation_image_key,
        callerName: call.caller_name,
        callerId: call.caller_id,
        participantIds: call.participant_ids,
      },
    });
    await get().acceptCall();
  },
  toggleCallCamera: async () => {
    const call = get().activeCall;
    if (!call || call.status !== "active") return false;
    const hasLiveVideo = Boolean(
      get().localCallStream?.getVideoTracks().some(
        (track) => track.readyState === "live"
      )
    );
    return await setLocalMediaKind(call, "video", !hasLiveVideo);
  },
  toggleCallMicrophone: async () => {
    const call = get().activeCall;
    if (!call || call.status !== "active") return false;
    const hasLiveAudio = Boolean(
      get().localCallStream?.getAudioTracks().some(
        (track) => track.readyState === "live"
      )
    );
    return await setLocalMediaKind(call, "audio", !hasLiveAudio);
  },
  dismissCall: () => {
    releaseCallMedia();
    set({ activeCall: null });
  },
}));

export const selectActiveMessages = (state: ChatState) =>
  state.activeConversationId
    ? state.messagesByConversation[state.activeConversationId] || EMPTY_MESSAGES
    : EMPTY_MESSAGES;

export default useChatState;
