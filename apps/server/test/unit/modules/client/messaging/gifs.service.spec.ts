import { afterEach, describe, expect, it, vi } from 'vitest';

import { GifsService } from '@/modules/client/messaging/services/gifs.service';

function makeConfig(key: string | undefined) {
  return { get: vi.fn().mockReturnValue(key) } as never;
}

describe('GifsService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search()', () => {
    it('should return an empty list without calling Tenor when no API key is configured', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const service = new GifsService(makeConfig(undefined));

      const result = await service.search('cats');

      expect(result).toEqual({ items: [] });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should default the query to trending when none is provided', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue({ ok: true, json: async () => ({ results: [] }) } as Response);
      const service = new GifsService(makeConfig('k'));

      await service.search(undefined);

      const url = fetchSpy.mock.calls[0]?.[0] as string;

      expect(url).toContain('q=trending');

      expect(url).toContain('key=k');
    });

    it('should default a whitespace-only query to trending', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue({ ok: true, json: async () => ({ results: [] }) } as Response);
      const service = new GifsService(makeConfig('k'));

      await service.search('   ');

      const url = fetchSpy.mock.calls[0]?.[0] as string;

      expect(url).toContain('q=trending');
    });

    it('should map Tenor results preferring the gif format with tinygif preview', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'g1',
              media_formats: {
                gif: { url: 'https://gif/full.gif', dims: [200, 100] },
                tinygif: { url: 'https://gif/tiny.gif', dims: [50, 25] },
              },
            },
          ],
        }),
      } as Response);
      const service = new GifsService(makeConfig('k'));

      const result = await service.search('dog');

      expect(result.items).toEqual([
        {
          id: 'g1',
          url: 'https://gif/full.gif',
          previewUrl: 'https://gif/tiny.gif',
          width: 200,
          height: 100,
        },
      ]);
    });

    it('should fall back to tinygif when no gif format is present', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { id: 'g2', media_formats: { tinygif: { url: 'https://t.gif', dims: [10, 20] } } },
          ],
        }),
      } as Response);
      const service = new GifsService(makeConfig('k'));

      const result = await service.search('dog');

      expect(result.items).toEqual([
        { id: 'g2', url: 'https://t.gif', previewUrl: 'https://t.gif', width: 10, height: 20 },
      ]);
    });

    it('should drop results that have no usable url', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ id: 'g3', media_formats: {} }] }),
      } as Response);
      const service = new GifsService(makeConfig('k'));

      const result = await service.search('dog');

      expect(result.items).toEqual([]);
    });

    it('should return an empty list when Tenor responds with a non-ok status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
      const service = new GifsService(makeConfig('k'));

      await expect(service.search('dog')).resolves.toEqual({ items: [] });
    });

    it('should swallow fetch errors and return an empty list', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
      const service = new GifsService(makeConfig('k'));

      await expect(service.search('dog')).resolves.toEqual({ items: [] });
    });
  });
});
