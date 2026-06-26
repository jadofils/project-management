import { Injectable, NestMiddleware } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';
const KEY = process.env.INTER_SYSTEM_ENCRYPTION_KEY || 'task-manager-inter-system-key-32ch';

@Injectable()
export class EncryptionMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const enc = req.headers['x-encrypted-body'];
    if (enc) {
      try { req.decryptedPayload = JSON.parse(CryptoJS.AES.decrypt(enc, KEY).toString(CryptoJS.enc.Utf8)); }
      catch { return _res.status(400).json({ error: 'Decryption failed' }); }
    }
    next();
  }
}

export function encryptPayload(data: unknown): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), KEY).toString();
}

export function createInternalHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'x-bwenge-internal': process.env.JWT_SECRET! };
}
