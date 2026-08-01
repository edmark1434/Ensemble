import { useEffect, useRef, useState } from "react";
import { Lock, Mic, MicOff, PhoneOff, Video, VideoOff, X } from "lucide-react";
import useChatState, { formatCallDuration } from "../chat_state";
import useGlobalState from "@/lib/global_state";

const callAvatarUrl = (key: string | null | undefined, name: string) => {
  if (key) {
    if (/^https?:\/\//i.test(key)) return key;
    const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
    if (base) return `${base}/${key.replace(/^\/+/, "")}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "Participant"
  )}&background=374151&color=fff`;
};

const useIsSpeaking = (stream: MediaStream | null) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  useEffect(() => {
    const audioTracks = stream?.getAudioTracks().filter(
      (track) => track.enabled && track.readyState === "live"
    );
    if (!audioTracks?.length) {
      setIsSpeaking(false);
      return;
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaStreamSource(new MediaStream(audioTracks));
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const interval = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
      setIsSpeaking(peak > 10);
    }, 120);
    return () => {
      window.clearInterval(interval);
      source.disconnect();
      void context.close();
    };
  }, [stream]);
  return isSpeaking;
};

const CallVideoTile = ({
  stream,
  name,
  avatar,
  muted = false,
  videoEnabled = true,
}: {
  stream: MediaStream | null;
  name: string;
  avatar: string;
  muted?: boolean;
  videoEnabled?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSpeaking = useIsSpeaking(stream);
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream
      ? new MediaStream(stream.getVideoTracks())
      : null;
    void videoRef.current.play().catch(() => undefined);
  }, [stream]);
  const hasVideo = Boolean(
    videoEnabled &&
    stream?.getVideoTracks().some(
      (track) => track.enabled && !track.muted && track.readyState === "live"
    )
  );
  return (
    <div
      className={`relative min-h-0 overflow-hidden rounded-xl bg-zinc-900 transition-shadow ${
        isSpeaking ? "ring-4 ring-emerald-400" : ""
      }`}
    >
      <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">
        <span className="flex items-center gap-1.5">
          {isSpeaking && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
          {name}
        </span>
      </div>
    </div>
  );
};

const CallAudio = ({ stream }: { stream: MediaStream | null }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = stream;
    audioRef.current.muted = false;
    audioRef.current.volume = 1;
    void audioRef.current.play().catch(() => undefined);
  }, [stream]);
  return <audio ref={audioRef} autoPlay />;
};

export const CallOverlay = () => {
  const activeCall = useChatState((state) => state.activeCall);
  const localStream = useChatState((state) => state.localCallStream);
  const remoteStream = useChatState((state) => state.remoteCallStream);
  const remoteStreams = useChatState((state) => state.remoteCallStreams);
  const remoteMediaStates = useChatState((state) => state.remoteMediaStates);
  const conversations = useChatState((state) => state.conversations);
  const acceptCall = useChatState((state) => state.acceptCall);
  const rejectCall = useChatState((state) => state.rejectCall);
  const endCall = useChatState((state) => state.endCall);
  const endCallForEveryone = useChatState((state) => state.endCallForEveryone);
  const toggleCallCamera = useChatState((state) => state.toggleCallCamera);
  const toggleCallMicrophone = useChatState((state) => state.toggleCallMicrophone);
  const dismissCall = useChatState((state) => state.dismissCall);
  const currentAccountId = useGlobalState((state) => state.user?.account_id);
  const groupCall = useChatState((state) =>
    activeCall?.conversationId
      ? state.groupCallsByConversation[activeCall.conversationId]
      : undefined
  );
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [permissionError, setPermissionError] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const remoteIsSpeaking = useIsSpeaking(remoteStream);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = remoteStream;
    void video.play().catch(() => undefined);
  }, [activeCall?.status, remoteStream]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    video.srcObject = localStream;
    void video.play().catch(() => undefined);
  }, [activeCall?.status, localStream]);

  useEffect(() => {
    setCameraEnabled(
      Boolean(
        localStream
          ?.getVideoTracks()
          .some((track) => track.enabled && track.readyState === "live")
      )
    );
    setMicrophoneEnabled(
      Boolean(
        localStream
          ?.getAudioTracks()
          .some((track) => track.enabled && track.readyState === "live")
      )
    );
  }, [localStream]);

  useEffect(() => {
    if (activeCall?.status !== "active") {
      setElapsedSeconds(0);
      return;
    }
    const updateDuration = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activeCall.startedAt) / 1000))
      );
    };
    updateDuration();
    const interval = window.setInterval(updateDuration, 1000);
    return () => window.clearInterval(interval);
  }, [activeCall?.callId, activeCall?.startedAt, activeCall?.status]);

  if (!activeCall) return null;
  const isGroupCall = activeCall.conversationType === "group";
  const activeConversation = conversations.find(
    (conversation) => String(conversation._id) === activeCall.conversationId
  );
  const currentUserAvatar = currentAccountId
    ? activeConversation?.avatarPayload?.[String(currentAccountId)]
    : undefined;
  const directRemoteCameraEnabled =
    remoteMediaStates[String(activeCall.peerAccountId)]?.video ??
    Boolean(remoteStream?.getVideoTracks().some((track) => !track.muted));
  const avatarUrl = activeCall.peerAvatar
    ? /^https?:\/\//i.test(activeCall.peerAvatar)
      ? activeCall.peerAvatar
      : `${String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
          /\/$/,
          ""
        )}/${activeCall.peerAvatar.replace(/^\/+/, "")}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        activeCall.peerName || "Video call"
      )}&background=374151&color=fff`;

  const accept = async () => {
    setPermissionError("");
    try {
      await acceptCall();
    } catch (error) {
      console.error("Unable to accept video call:", error);
      setPermissionError(
        error instanceof Error
          ? error.message
          : "The call could not be connected. Please try again."
      );
    }
  };

  if (activeCall.status === "active") {
    if (isGroupCall) {
      const participantProfiles = new Map(
        (groupCall?.participant_profiles || []).map((participant) => [
          String(participant.account_id),
          participant,
        ])
      );
      const localProfile = currentAccountId
        ? participantProfiles.get(String(currentAccountId))
        : undefined;
      const remoteParticipants = (groupCall?.participant_ids || [])
        .map((participantId, index) => ({
          id: participantId,
          name:
            participantProfiles.get(String(participantId))?.display_name ||
            groupCall?.participant_names[index] ||
            "Participant",
          avatar: participantProfiles.get(String(participantId))?.avatar_key,
        }))
        .filter((participant) => String(participant.id) !== String(currentAccountId));
      const tileCount = Math.min(8, 1 + remoteParticipants.length);
      const gridClass =
        tileCount <= 1
          ? "grid-cols-1"
          : tileCount === 2
          ? "grid-cols-2"
          : tileCount <= 4
          ? "grid-cols-2 grid-rows-2"
          : tileCount <= 6
          ? "grid-cols-3 grid-rows-2"
          : "grid-cols-4 grid-rows-2";
      return (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black p-3 text-white">
          <CallAudio stream={remoteStream} />
          <div className="pb-3 text-center text-sm font-medium text-zinc-300">
            {formatCallDuration(elapsedSeconds)}
          </div>
          <div className={`grid min-h-0 flex-1 gap-2 ${gridClass}`}>
            <CallVideoTile
              stream={localStream}
              name="You"
              avatar={callAvatarUrl(localProfile?.avatar_key, localProfile?.display_name || "You")}
              muted
            />
            {Array.from({ length: tileCount - 1 }).map((_, index) => {
              const participant = remoteParticipants[index];
              return (
                <CallVideoTile
                  key={participant?.id || index}
                  stream={participant ? remoteStreams[String(participant.id)] || null : null}
                  name={participant?.name || "Participant"}
                  avatar={callAvatarUrl(participant?.avatar, participant?.name || "Participant")}
                  videoEnabled={Boolean(
                    participant && remoteMediaStates[String(participant.id)]?.video
                  )}
                />
              );
            })}
          </div>
          <div className="flex justify-center gap-4 pt-3">
            <button onClick={() => void toggleCallCamera().then(setCameraEnabled)} className="rounded-full bg-white/15 p-4">
              {cameraEnabled ? <Video /> : <VideoOff />}
            </button>
            <button
              onClick={() => void toggleCallMicrophone().then(setMicrophoneEnabled)}
              className="rounded-full bg-white/15 p-4"
            >
              {microphoneEnabled ? <Mic /> : <MicOff />}
            </button>
            <button onClick={() => void endCall()} className="rounded-full bg-red-600 p-4">
              <PhoneOff />
            </button>
            {String(activeCall.callerId) === String(currentAccountId) && (
              <button
                onClick={() => void endCallForEveryone()}
                className="rounded-full bg-red-800 px-4 py-2 text-sm font-semibold hover:bg-red-700"
              >
                End for everyone
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[90] bg-black text-white">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
        {!directRemoteCameraEnabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808]">
            <img
              src={avatarUrl}
              alt=""
              className="h-28 w-28 rounded-full object-cover ring-4 ring-white/10"
            />
            <p className="mt-5 text-xl font-semibold">{activeCall.peerName}</p>
            <p className="mt-1 text-sm text-zinc-400">Call connected</p>
          </div>
        )}
        <div className="absolute left-5 top-5">
          <p className="font-semibold">{activeCall.peerName || "Video call"}</p>
          <p className="flex items-center gap-1 text-xs text-zinc-300">
            <Lock className="h-3 w-3" /> Private call
          </p>
          <p className="mt-1 text-xs font-medium text-zinc-300">
            {formatCallDuration(elapsedSeconds)}
          </p>
          {remoteIsSpeaking && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Speaking
            </p>
          )}
        </div>
        {permissionError && (
          <div className="absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-xl bg-red-600/90 px-4 py-2 text-sm shadow-xl">
            {permissionError}
          </div>
        )}
        <div className="absolute bottom-24 right-5 aspect-video w-64 overflow-hidden rounded-2xl border border-white/20 bg-zinc-900 shadow-2xl sm:w-80">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          {!localStream?.getVideoTracks().length && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
              <img
                src={callAvatarUrl(currentUserAvatar, "You")}
                alt="Your profile"
                className="h-20 w-20 rounded-full object-cover"
              />
              <span className="mt-2 text-xs">Camera is off</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-4">
          <button
            onClick={() => {
              setPermissionError("");
              void toggleCallCamera()
                .then(setCameraEnabled)
                .catch((error) => {
                  console.error("Unable to open camera:", error);
                  setPermissionError(
                    error instanceof Error
                      ? error.message
                      : "The camera could not be opened."
                  );
                });
            }}
            className="rounded-full bg-white/15 p-4 hover:bg-white/25"
            aria-label="Toggle camera"
          >
            {cameraEnabled ? <Video /> : <VideoOff />}
          </button>
          <button
            onClick={() => void toggleCallMicrophone().then(setMicrophoneEnabled)}
            className="rounded-full bg-white/15 p-4 hover:bg-white/25"
            aria-label="Toggle microphone"
          >
            {microphoneEnabled ? <Mic /> : <MicOff />}
          </button>
          <button
            onClick={() => void endCall()}
            className="rounded-full bg-red-600 p-4 hover:bg-red-500"
            aria-label="End call"
          >
            <PhoneOff />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#242424] px-8 py-7 text-center text-white shadow-2xl">
        <button
          onClick={() =>
            activeCall.status === "busy"
              ? dismissCall()
              : void rejectCall()
          }
          className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-zinc-300 hover:bg-white/25"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-lg font-semibold">
          {isGroupCall && activeCall.direction === "incoming"
            ? `${activeCall.groupName || activeCall.peerName || "Group chat"} requested a video call`
            : activeCall.direction === "incoming"
            ? "Incoming call"
            : "Video call"}
        </p>
        <img
          src={avatarUrl}
          alt=""
          className="mx-auto mt-7 h-24 w-24 rounded-full object-cover ring-4 ring-white/10"
        />
        <p className="mt-5 text-2xl font-bold">
          {activeCall.status === "busy"
            ? `${activeCall.peerName || "User"} is busy`
            : isGroupCall && activeCall.direction === "incoming"
            ? `${activeCall.callerName || "A group member"} started the video call`
            : activeCall.direction === "incoming"
            ? `${activeCall.peerName || "Someone"} is calling you`
            : `Calling ${activeCall.peerName || "user"}...`}
        </p>
        <p className="mt-3 flex items-center justify-center gap-1 text-xs text-zinc-400">
          <Lock className="h-3 w-3" /> {isGroupCall ? "Group video call" : "Private video call"}
        </p>
        {permissionError && (
          <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
            {permissionError}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-10">
          <button
            onClick={() =>
              activeCall.status === "busy"
                ? dismissCall()
                : void rejectCall()
            }
            className="flex flex-col items-center gap-2 text-xs"
          >
            <span className="rounded-full bg-red-600 p-4 hover:bg-red-500">
              <PhoneOff className="h-6 w-6" />
            </span>
            {activeCall.direction === "incoming" ? "Decline" : "Cancel"}
          </button>
          {activeCall.direction === "incoming" &&
            activeCall.status === "ringing" && (
              <button
                onClick={() => void accept()}
                className="flex flex-col items-center gap-2 text-xs"
              >
                <span className="rounded-full bg-green-500 p-4 hover:bg-green-400">
                  <Video className="h-6 w-6" />
                </span>
                Accept
              </button>
            )}
        </div>
        {activeCall.status === "ringing" && (
          <p className="mt-6 text-[11px] text-zinc-500">
            Unanswered calls end automatically after one minute.
          </p>
        )}
      </div>
    </div>
  );
};
