import {
  Eye,
  Mail,
  MessageSquare,
  MessageSquareOff,
  Pencil,
  PhoneOff,
  Plus,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Maps a `DatagridActionDto.icon` name to a lucide icon. Spread to extend with custom icons. */
export const ACTION_ICONS: Record<string, LucideIcon> = {
  plus: Plus,
  pencil: Pencil,
  trash: Trash2,
  mail: Mail,
  message: MessageSquare,
  'message-square-off': MessageSquareOff,
  eye: Eye,
  'phone-off': PhoneOff,
};
