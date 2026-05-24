"use client";

import { useState, useEffect } from "react";
import { X, Video, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { LiveSessionToken } from "@/types";

interface Props {
  sessionId: string;
  token: string;
  onClose: () => void;
}

export function LiveRoom({ sessionId, token, onClose }: Props) {
  const [roomToken, setRoomToken] = useState<LiveSessionToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<LiveSessionToken>(`/api/v1/live-sessions/${sessionId}/token`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setRoomToken)
      .catch(() => setError("Failed to get room token. You may not be enrolled in this course."))
      .finally(() => setLoading(false));
  }, [sessionId, token]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[oklch(10%_0.02_295)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-white">Live Session</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={`flex-1 min-h-0 ${roomToken ? "h-full w-full overflow-hidden" : "flex items-center justify-center"}`}>
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white/50">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Connecting…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Video className="h-12 w-12 text-white/20" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={onClose}
              className="rounded bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {roomToken && <LiveKitRoom roomToken={roomToken} />}
      </div>
    </div>
  );
}

function LiveKitRoom({ roomToken }: { roomToken: LiveSessionToken }) {
  const [Room, setRoom] = useState<React.ComponentType<{
    token: string;
    serverUrl: string;
    connect: boolean;
    children: React.ReactNode;
  }> | null>(null);
  const [VideoConference, setVideoConference] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const id = "livekit-styles";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "/livekit-styles.css";
      document.head.appendChild(link);
    }

    import("@livekit/components-react").then((m) => {
      setRoom(() => m.LiveKitRoom as typeof Room);
      setVideoConference(() => m.VideoConference as typeof VideoConference);
    });
  }, []);

  if (!Room || !VideoConference) {
    return (
      <div className="flex flex-col items-center gap-3 text-white/50">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading room…</p>
      </div>
    );
  }

  const lkUrl = roomToken.url.startsWith("ws") ? roomToken.url : roomToken.url.replace("http://", "ws://").replace("https://", "wss://");

  return (
    <div className="h-full w-full" data-lk-theme="default">
      <Room token={roomToken.token} serverUrl={lkUrl} connect>
        <VideoConference />
      </Room>
    </div>
  );
}
