"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SessionChunk {
  name: string;
  size: number;
  updated: string;
}

interface Session {
  sessionId: string;
  chunks: SessionChunk[];
  firstChunk: string;
  lastChunk: string;
  totalSize: number;
  chunkCount: number;
}

interface DeviceRecordings {
  deviceId: string;
  sessions: Session[];
  totalChunks: number;
  totalSize: number;
  lastActivity: string;
}

// Flat chunk with session context for the unified timeline
interface TimelineChunk {
  name: string;
  size: number;
  updated: string;
  sessionId: string;
  indexInSession: number;
  globalIndex: number;
}

const FALLBACK_LABELS: Record<string, string> = {
  unknown: "Pre-auth device",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function buildTimeline(device: DeviceRecordings): TimelineChunk[] {
  const timeline: TimelineChunk[] = [];
  // Sort sessions chronologically (oldest first)
  const sorted = [...device.sessions].sort((a, b) =>
    a.firstChunk.localeCompare(b.firstChunk)
  );
  let globalIndex = 0;
  for (const session of sorted) {
    for (let i = 0; i < session.chunks.length; i++) {
      const chunk = session.chunks[i];
      timeline.push({
        ...chunk,
        sessionId: session.sessionId,
        indexInSession: i,
        globalIndex: globalIndex++,
      });
    }
  }
  return timeline;
}

export default function SessionRecordingsPage() {
  const [devices, setDevices] = useState<DeviceRecordings[]>([]);
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedChunks, setViewedChunks] = useState<Set<string>>(new Set());

  const [deletingDevice, setDeletingDevice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Player state
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecordings | null>(null);
  const [timeline, setTimeline] = useState<TimelineChunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const urlCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch("/api/session-recordings").then((r) => r.json()),
      fetch("/api/session-recordings/viewed").then((r) => r.json()),
    ])
      .then(([recData, viewedData]) => {
        if (recData.error) throw new Error(recData.error);
        setDevices(recData.devices);
        setLabelMap(recData.labelMap || {});
        if (viewedData.viewedChunks) {
          setViewedChunks(new Set(viewedData.viewedChunks));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const markViewed = useCallback(
    (chunk: TimelineChunk) => {
      if (viewedChunks.has(chunk.name)) return;
      // Optimistically update UI
      setViewedChunks((prev) => new Set(prev).add(chunk.name));
      // Extract deviceId and sessionId from chunk name (format: deviceId/sessionId/file.mp4)
      const parts = chunk.name.split("/");
      const deviceId = parts[0] || "";
      fetch("/api/session-recordings/mark-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          sessionId: chunk.sessionId,
          chunkName: chunk.name,
        }),
      }).catch((err) => console.error("Failed to mark viewed:", err));
    },
    [viewedChunks]
  );

  const loadChunk = useCallback(
    async (chunk: TimelineChunk) => {
      // Mark as viewed when loaded
      markViewed(chunk);

      // Check cache first
      const cached = urlCache.current.get(chunk.name);
      if (cached) {
        setVideoUrl(cached);
        return;
      }
      setVideoLoading(true);
      try {
        const res = await fetch(
          `/api/session-recordings/signed-url?path=${encodeURIComponent(chunk.name)}`
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        urlCache.current.set(chunk.name, data.url);
        setVideoUrl(data.url);
      } catch (err) {
        console.error("Failed to load chunk:", err);
      } finally {
        setVideoLoading(false);
      }
    },
    [markViewed]
  );

  const selectDevice = useCallback(
    (device: DeviceRecordings) => {
      const tl = buildTimeline(device);
      setSelectedDevice(device);
      setTimeline(tl);
      // Start at the oldest unread chunk, or latest chunk if all read
      const firstUnreadIndex = tl.findIndex((c) => !viewedChunks.has(c.name));
      const startIndex = firstUnreadIndex >= 0 ? firstUnreadIndex : tl.length - 1;
      setCurrentIndex(startIndex);
      setVideoUrl(null);
      setShowTable(false);
      if (tl.length > 0) {
        loadChunk(tl[startIndex]);
      }
    },
    [loadChunk, viewedChunks]
  );

  const goToChunk = useCallback(
    (index: number) => {
      if (index < 0 || index >= timeline.length) return;
      setCurrentIndex(index);
      loadChunk(timeline[index]);
    },
    [timeline, loadChunk]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!selectedDevice) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToChunk(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToChunk(currentIndex + 1);
      } else if (e.key === "Escape") {
        setSelectedDevice(null);
        setVideoUrl(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedDevice, currentIndex, goToChunk]);

  // Auto-play on video URL change, default to 3x speed
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load();
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().catch(() => {});
      setIsPaused(false);
    }
  }, [videoUrl]);

  // Sync playback speed to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Scroll timeline to keep current chunk visible
  useEffect(() => {
    if (timelineRef.current && timeline.length > 0) {
      const el = timelineRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex, timeline]);

  // Auto-advance to next chunk when video ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      if (currentIndex < timeline.length - 1) {
        goToChunk(currentIndex + 1);
      }
    };
    video.addEventListener("ended", handler);
    return () => video.removeEventListener("ended", handler);
  }, [currentIndex, timeline, goToChunk]);

  const currentChunk = timeline[currentIndex] || null;

  // Determine session boundaries for timeline coloring
  const sessionIds = [...new Set(timeline.map((c) => c.sessionId))];
  const sessionColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-yellow-500",
    "bg-red-500",
  ];

  // -- Player view --
  if (selectedDevice) {
    const label =
      labelMap[selectedDevice.deviceId] ||
      FALLBACK_LABELS[selectedDevice.deviceId] ||
      selectedDevice.deviceId;

    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-800 bg-gray-900/50">
          <button
            onClick={() => {
              setSelectedDevice(null);
              setVideoUrl(null);
            }}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{label}</h1>
            <p className="text-xs text-gray-500 font-mono truncate">
              {selectedDevice.deviceId}
            </p>
          </div>
          <div className="text-sm text-gray-400 flex items-center gap-3">
            {currentChunk && (
              <span>
                {currentIndex + 1} / {timeline.length} chunks
              </span>
            )}
            {(() => {
              const unviewedCount = timeline.filter((c) => !viewedChunks.has(c.name)).length;
              return unviewedCount > 0 ? (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {unviewedCount} unread
                </span>
              ) : (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  all read
                </span>
              );
            })()}
            <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
              {playbackSpeed}x
            </span>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className={`text-sm px-3 py-1 rounded border transition-colors ${
              showTable
                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
            }`}
          >
            {showTable ? "Hide List" : "Show List"}
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Video area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Video */}
            <div className="flex-1 flex items-center justify-center bg-black relative">
              {videoLoading && !videoUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <svg
                    className="animate-spin w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="max-h-full max-w-full"
                  style={{ maxHeight: "calc(100vh - 200px)" }}
                />
              )}

              {/* Left/Right arrows */}
              {currentIndex > 0 && (
                <button
                  onClick={() => goToChunk(currentIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {currentIndex < timeline.length - 1 && (
                <button
                  onClick={() => goToChunk(currentIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Center speed/pause overlay buttons */}
              {videoUrl && (
                <div className="absolute inset-0 flex items-center justify-center gap-4 pointer-events-none z-20">
                  <div className="pointer-events-auto flex rounded-full overflow-hidden backdrop-blur-sm">
                    {[1, 2, 3].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`w-14 h-14 flex items-center justify-center text-lg font-bold transition-all ${
                          playbackSpeed === speed
                            ? "bg-white/10 text-white"
                            : "bg-black/10 text-white/40 hover:text-white hover:bg-black/20"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const video = videoRef.current;
                      if (!video) return;
                      if (video.paused) {
                        video.play().catch(() => {});
                        setIsPaused(false);
                      } else {
                        video.pause();
                        setIsPaused(true);
                      }
                    }}
                    className="pointer-events-auto w-16 h-16 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white hover:text-white transition-all backdrop-blur-sm"
                  >
                    {isPaused ? (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Chunk info */}
            {currentChunk && (
              <div className="px-4 py-2 bg-gray-900/80 border-t border-gray-800 flex items-center gap-4 text-xs text-gray-400">
                <span>{formatDate(currentChunk.updated)}</span>
                <span>{formatBytes(currentChunk.size)}</span>
                <span className="font-mono truncate">{currentChunk.name.split("/").pop()}</span>
                <span>Session: {currentChunk.sessionId.slice(0, 8)}...</span>
              </div>
            )}

            {/* Timeline */}
            <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                <span>Timeline</span>
                <span className="flex-1" />
                {sessionIds.map((sid, i) => (
                  <span key={sid} className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${sessionColors[i % sessionColors.length]}`}
                    />
                    <span className="font-mono">{sid.slice(0, 6)}</span>
                  </span>
                ))}
              </div>
              <div
                ref={timelineRef}
                className="flex gap-px overflow-x-auto pb-1 scrollbar-thin items-center"
              >
                {timeline.map((chunk, i) => {
                  const sessionIdx = sessionIds.indexOf(chunk.sessionId);
                  const color = sessionColors[sessionIdx % sessionColors.length];
                  const isCurrent = i === currentIndex;
                  const isViewed = viewedChunks.has(chunk.name);
                  // Detect session boundaries
                  const isFirstInSession = i === 0 || timeline[i - 1].sessionId !== chunk.sessionId;
                  const isLastInSession =
                    i === timeline.length - 1 || timeline[i + 1].sessionId !== chunk.sessionId;

                  return (
                    <button
                      key={chunk.name}
                      data-index={i}
                      onClick={() => goToChunk(i)}
                      title={`${formatDate(chunk.updated)} - ${formatBytes(chunk.size)}${isViewed ? "" : " - UNREAD"}`}
                      className={`flex-shrink-0 transition-all relative ${
                        isCurrent
                          ? `${color} ring-2 ring-white ring-offset-1 ring-offset-gray-900`
                          : isViewed
                            ? `${color} opacity-30 hover:opacity-50`
                            : `${color} opacity-90 hover:opacity-100`
                      } ${isFirstInSession ? "rounded-l" : ""} ${isLastInSession ? "rounded-r mr-1" : ""}`}
                      style={{ width: isCurrent ? "12px" : "6px", height: isViewed ? "16px" : "24px", alignSelf: "center" }}
                    >
                      {!isViewed && !isCurrent && (
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side table */}
          {showTable && (
            <div className="w-80 border-l border-gray-800 bg-gray-900 overflow-y-auto flex-shrink-0">
              <div className="p-3 border-b border-gray-800 text-sm font-semibold text-gray-300 flex items-center justify-between">
                <span>All Chunks ({timeline.length})</span>
                {(() => {
                  const unviewedCount = timeline.filter((c) => !viewedChunks.has(c.name)).length;
                  return unviewedCount > 0 ? (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                      {unviewedCount} unread
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="divide-y divide-gray-800/50">
                {timeline.map((chunk, i) => {
                  const isCurrent = i === currentIndex;
                  const isViewed = viewedChunks.has(chunk.name);
                  const sessionIdx = sessionIds.indexOf(chunk.sessionId);

                  return (
                    <button
                      key={chunk.name}
                      onClick={() => goToChunk(i)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        isCurrent
                          ? "bg-blue-500/10 border-l-2 border-blue-500"
                          : !isViewed
                            ? "hover:bg-gray-800/50 border-l-2 border-blue-400"
                            : "hover:bg-gray-800/50 border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sessionColors[sessionIdx % sessionColors.length]}`} />
                        <span className={`font-mono ${isCurrent ? "text-white" : isViewed ? "text-gray-500" : "text-gray-300 font-semibold"}`}>
                          #{String(i).padStart(3, "0")}
                        </span>
                        <span className={`flex-1 truncate ${isViewed ? "text-gray-600" : "text-gray-400"}`}>
                          {formatDate(chunk.updated)}
                        </span>
                        {!isViewed && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                        )}
                        <span className="text-gray-600">{formatBytes(chunk.size)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -- Device list view --
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Session Recordings</h1>
            <p className="text-gray-400 mt-1">Click a user to watch their recordings</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-400">Loading from GCS...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid gap-4">
            {devices.map((device) => {
              const label =
                labelMap[device.deviceId] ||
                FALLBACK_LABELS[device.deviceId] ||
                device.deviceId;
              const isActive =
                Date.now() - new Date(device.lastActivity).getTime() < 10 * 60 * 1000;

              // Count unviewed chunks for this device
              const allChunkNames = device.sessions.flatMap((s) =>
                s.chunks.map((c) => c.name)
              );
              const unviewedCount = allChunkNames.filter(
                (name) => !viewedChunks.has(name)
              ).length;

              return (
                <div
                  key={device.deviceId}
                  onClick={() => selectDevice(device)}
                  className={`bg-gray-900 rounded-xl border p-5 flex items-center gap-4 text-left transition-colors group cursor-pointer ${
                    unviewedCount > 0
                      ? "border-blue-500/30 hover:border-blue-500/60"
                      : "border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      isActive ? "bg-green-500 animate-pulse" : "bg-gray-600"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className={`text-lg font-semibold group-hover:text-blue-400 transition-colors ${unviewedCount > 0 ? "text-white" : ""}`}>
                        {label}
                      </h2>
                      {isActive && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          LIVE
                        </span>
                      )}
                      {unviewedCount > 0 && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                          {unviewedCount} unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-mono truncate">
                      {device.deviceId}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 text-sm text-gray-400 space-y-1">
                    <p>
                      {device.sessions.length} session{device.sessions.length !== 1 ? "s" : ""} &middot;{" "}
                      {device.totalChunks} chunks
                    </p>
                    <p>
                      {formatBytes(device.totalSize)} &middot; {timeAgo(device.lastActivity)}
                    </p>
                  </div>
                  {unviewedCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Optimistic UI update
                        setViewedChunks((prev) => {
                          const next = new Set(prev);
                          allChunkNames.forEach((name) => next.add(name));
                          return next;
                        });
                        // Persist to DB
                        fetch("/api/session-recordings/mark-all-viewed", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ chunks: allChunkNames }),
                        }).catch((err) => console.error("Failed to mark all read:", err));
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex-shrink-0"
                      title="Mark all chunks as read"
                    >
                      Mark read
                    </button>
                  )}
                  {confirmDelete === device.deviceId ? (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setDeletingDevice(device.deviceId);
                          setConfirmDelete(null);
                          fetch("/api/session-recordings/delete-device", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ deviceId: device.deviceId }),
                          })
                            .then((res) => res.json())
                            .then((data) => {
                              if (data.ok) {
                                setDevices((prev) => prev.filter((d) => d.deviceId !== device.deviceId));
                                setViewedChunks((prev) => {
                                  const next = new Set(prev);
                                  allChunkNames.forEach((name) => next.delete(name));
                                  return next;
                                });
                              }
                            })
                            .catch((err) => console.error("Failed to delete:", err))
                            .finally(() => setDeletingDevice(null));
                        }}
                        className="text-xs px-2 py-1 rounded border border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(device.deviceId);
                      }}
                      disabled={deletingDevice === device.deviceId}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-colors flex-shrink-0 disabled:opacity-50"
                      title="Delete all recordings for this device"
                    >
                      {deletingDevice === device.deviceId ? "Deleting..." : "Delete"}
                    </button>
                  )}
                  <svg
                    className="w-5 h-5 text-gray-600 group-hover:text-gray-300 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
