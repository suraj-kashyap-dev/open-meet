'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

interface UseMediaDevicesResult {
  videoDevices: MediaDeviceOption[];
  audioInputs: MediaDeviceOption[];
  audioOutputs: MediaDeviceOption[];
  stream: MediaStream | null;
  error: string | null;
  selectedVideoId: string | null;
  selectedAudioId: string | null;
  selectVideo: (id: string) => Promise<void>;
  selectAudio: (id: string) => Promise<void>;
  setCameraEnabled: (enabled: boolean) => Promise<void>;
  setMicEnabled: (enabled: boolean) => Promise<void>;
  cameraEnabled: boolean;
  micEnabled: boolean;
  stop: () => void;
}

export function useMediaDevices(): UseMediaDevicesResult {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceOption[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabledState] = useState(true);
  const [micEnabled, setMicEnabledState] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mapDevice = (d: MediaDeviceInfo): MediaDeviceOption => ({
      deviceId: d.deviceId,
      label: d.label || `${d.kind} (${d.deviceId.slice(0, 6)})`,
    });
    setVideoDevices(devices.filter((d) => d.kind === 'videoinput').map(mapDevice));
    setAudioInputs(devices.filter((d) => d.kind === 'audioinput').map(mapDevice));
    setAudioOutputs(devices.filter((d) => d.kind === 'audiooutput').map(mapDevice));
  }, []);

  const acquire = useCallback(
    async (constraints: { videoId?: string; audioId?: string }) => {
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          video: constraints.videoId ? { deviceId: { exact: constraints.videoId } } : true,
          audio: constraints.audioId ? { deviceId: { exact: constraints.audioId } } : true,
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = next;
        setStream(next);
        const v = next.getVideoTracks()[0];
        const a = next.getAudioTracks()[0];
        if (v) {
          setSelectedVideoId(v.getSettings().deviceId ?? null);
        }
        if (a) {
          setSelectedAudioId(a.getSettings().deviceId ?? null);
        }
        await refreshDevices();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [refreshDevices],
  );

  useEffect(() => {
    void acquire({});
    const handler = () => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectVideo = useCallback(
    async (id: string) => {
      await acquire({ videoId: id, audioId: selectedAudioId ?? undefined });
    },
    [acquire, selectedAudioId],
  );

  const selectAudio = useCallback(
    async (id: string) => {
      await acquire({ audioId: id, videoId: selectedVideoId ?? undefined });
    },
    [acquire, selectedVideoId],
  );

  const setCameraEnabled = useCallback(async (enabled: boolean) => {
    setCameraEnabledState(enabled);
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  const setMicEnabled = useCallback(async (enabled: boolean) => {
    setMicEnabledState(enabled);
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  return {
    videoDevices,
    audioInputs,
    audioOutputs,
    stream,
    error,
    selectedVideoId,
    selectedAudioId,
    selectVideo,
    selectAudio,
    setCameraEnabled,
    setMicEnabled,
    cameraEnabled,
    micEnabled,
    stop,
  };
}
