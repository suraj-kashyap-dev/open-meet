'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { Switch } from '@open-meet/ui/switch';

const MAX_OPTIONS = 10;

export function PollComposer({
  open,
  onOpenChange,
  onCreate,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (poll: { question: string; options: string[]; multiple: boolean }) => void;
  pending?: boolean;
}) {
  const t = useTranslations('chat');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiple, setMultiple] = useState(false);

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultiple(false);
  };

  const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= 2;

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    onCreate({ question: question.trim(), options: trimmedOptions, multiple });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('poll.create')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="poll-question">{t('poll.question')}</Label>
            <Input
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              placeholder={t('poll.question-placeholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('poll.options')}</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, i) => (i === index ? e.target.value : o)))
                  }
                  maxLength={200}
                  placeholder={t('poll.option-placeholder', { index: index + 1 })}
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={t('poll.remove-option')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}

            {options.length < MAX_OPTIONS ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOptions((prev) => [...prev, ''])}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('poll.add-option')}
              </Button>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">{t('poll.allow-multiple')}</span>
            <Switch checked={multiple} onCheckedChange={setMultiple} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('poll.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || pending}>
            {t('poll.create-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
