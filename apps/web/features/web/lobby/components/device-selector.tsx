'use client';

import { Camera, Mic, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import type { useMediaDevices } from '@/features/web/lobby/hooks/use-media-devices';

type MediaState = ReturnType<typeof useMediaDevices>;

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        <span className="text-muted-foreground/80">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  );
}

const triggerCls = 'w-full [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left';
const itemCls = 'whitespace-normal py-2 pr-3 leading-snug';

export function DeviceSelector({ media }: { media: MediaState }) {
  return (
    <div className="space-y-4">
      <Field icon={<Camera className="h-3.5 w-3.5" />} label="Camera">
        <Select
          value={media.selectedVideoId ?? ''}
          onValueChange={(v) => media.selectVideo(v)}
        >
          <SelectTrigger className={triggerCls}>
            <SelectValue placeholder="Choose camera" />
          </SelectTrigger>
          <SelectContent>
            {media.videoDevices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId} className={itemCls}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field icon={<Mic className="h-3.5 w-3.5" />} label="Microphone">
        <Select
          value={media.selectedAudioId ?? ''}
          onValueChange={(v) => media.selectAudio(v)}
        >
          <SelectTrigger className={triggerCls}>
            <SelectValue placeholder="Choose microphone" />
          </SelectTrigger>
          <SelectContent>
            {media.audioInputs.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId} className={itemCls}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {media.audioOutputs.length > 0 ? (
        <Field icon={<Volume2 className="h-3.5 w-3.5" />} label="Speakers">
          <Select disabled defaultValue={media.audioOutputs[0]?.deviceId}>
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="System default" />
            </SelectTrigger>
            <SelectContent>
              {media.audioOutputs.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId} className={itemCls}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
