'use client';

import { Camera, Mic } from 'lucide-react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { useMediaDevices } from '@/hooks/use-media-devices';

type MediaState = ReturnType<typeof useMediaDevices>;

export function DeviceSelector({ media }: { media: MediaState }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Camera className="h-3.5 w-3.5" />
          Camera
        </Label>
        <Select
          value={media.selectedVideoId ?? undefined}
          onValueChange={(v) => media.selectVideo(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose camera" />
          </SelectTrigger>
          <SelectContent>
            {media.videoDevices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Mic className="h-3.5 w-3.5" />
          Microphone
        </Label>
        <Select
          value={media.selectedAudioId ?? undefined}
          onValueChange={(v) => media.selectAudio(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose microphone" />
          </SelectTrigger>
          <SelectContent>
            {media.audioInputs.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
