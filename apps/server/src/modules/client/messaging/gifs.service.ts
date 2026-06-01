import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiEnv } from '@open-meet/config';
import type { GifSearchResultDto } from '@open-meet/types';

interface TenorMediaFormat {
  url: string;
  dims?: [number, number];
}

interface TenorResult {
  id: string;
  media_formats?: { gif?: TenorMediaFormat; tinygif?: TenorMediaFormat };
}

/**
 * Proxies GIF search to Tenor. Disabled (returns empty) unless `TENOR_API_KEY`
 * is configured - the FE hides the picker via the `gifsEnabled` config flag.
 */
@Injectable()
export class GifsService {
  private readonly logger = new Logger(GifsService.name);
  private readonly key: string | undefined;

  constructor(config: ConfigService<ApiEnv, true>) {
    this.key = config.get('TENOR_API_KEY');
  }

  async search(query: string | undefined): Promise<GifSearchResultDto> {
    if (!this.key) {
      return { items: [] };
    }

    const q = (query ?? '').trim() || 'trending';
    const url = `https://tenor.googleapis.com/v2/search?key=${encodeURIComponent(
      this.key,
    )}&q=${encodeURIComponent(q)}&limit=24&media_filter=gif,tinygif`;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        return { items: [] };
      }

      const data = (await res.json()) as { results?: TenorResult[] };

      const items = (data.results ?? [])
        .map((r) => {
          const gif = r.media_formats?.gif;
          const tiny = r.media_formats?.tinygif;
          const main = gif ?? tiny;
          return {
            id: r.id,
            url: main?.url ?? '',
            previewUrl: tiny?.url ?? main?.url ?? '',
            width: main?.dims?.[0] ?? 0,
            height: main?.dims?.[1] ?? 0,
          };
        })
        .filter((g) => g.url.length > 0);

      return { items };
    } catch (err) {
      this.logger.warn(`Tenor search failed: ${(err as Error).message}`);
      return { items: [] };
    }
  }
}
