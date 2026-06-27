import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EncryptionMiddleware.name);
  private _key: string | null = null;

  private get key(): string {
    if (this._key) return this._key;
    const envKey = process.env.INTER_SYSTEM_ENCRYPTION_KEY;
    if (!envKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('INTER_SYSTEM_ENCRYPTION_KEY is required in production');
      }
      this.logger.warn('INTER_SYSTEM_ENCRYPTION_KEY not set — using development fallback key');
      this._key = 'task-manager-inter-system-key-32ch';
    } else {
      this._key = envKey;
    }
    return this._key;
  }

  use(req: any, _res: any, next: () => void) {
    const enc = req.headers['x-encrypted-body'];
    if (enc) {
      try { req.decryptedPayload = JSON.parse(CryptoJS.AES.decrypt(enc, this.key).toString(CryptoJS.enc.Utf8)); }
      catch { return _res.status(400).json({ error: 'Decryption failed' }); }
    }
    next();
  }
}

export function encryptPayload(data: unknown): string {
  const envKey = process.env.INTER_SYSTEM_ENCRYPTION_KEY;
  const key = envKey || (process.env.NODE_ENV !== 'production' ? 'task-manager-inter-system-key-32ch' : '');
  if (!key) throw new Error('INTER_SYSTEM_ENCRYPTION_KEY is required in production');
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

export function createInternalHeaders(): Record<string, string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
  return { 'Content-Type': 'application/json', 'x-bwenge-internal': jwtSecret };
}
