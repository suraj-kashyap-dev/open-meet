import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp, http, registerUser, resetDb } from '../setup-app';

describe('Uploads (e2e)', () => {
  let app: NestFastifyApplication;
  let cookie: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);

    cookie = (await registerUser(app, { email: 'uploader@example.com', password: 'secretpass1' }))
      .cookie;
  });

  describe('POST /api/uploads', () => {
    it('should store an uploaded file and return an AttachmentDto', async () => {
      const res = await http(app)
        .post('/api/uploads')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('fake-png-bytes'), {
          filename: 'pic.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);

      expect(res.body.success).toBe(true);

      expect(res.body.data.mime).toBe('image/png');

      expect(res.body.data.size).toBe('fake-png-bytes'.length);

      expect(res.body.data.url).toContain('/api/uploads/public/');
    });

    it('should require authentication', async () => {
      const res = await http(app)
        .post('/api/uploads')
        .attach('file', Buffer.from('x'), { filename: 'x.png', contentType: 'image/png' });

      expect(res.status).toBe(401);
    });

    it('should reject a non-multipart request with 400', async () => {
      const res = await http(app)
        .post('/api/uploads')
        .set('Cookie', cookie)
        .send({ not: 'multipart' });

      expect(res.status).toBe(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('GET /api/uploads/public/*', () => {
    it('should serve the stored file publicly with the inferred content type', async () => {
      const upload = await http(app)
        .post('/api/uploads')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('hello-bytes'), {
          filename: 'doc.png',
          contentType: 'image/png',
        });

      const path = String(upload.body.data.url).replace(/^https?:\/\/[^/]+/, '');
      const res = await http(app).get(path);

      expect(res.status).toBe(200);

      expect(res.headers['content-type']).toContain('image/png');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
