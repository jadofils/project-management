import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

// Render free tier sleeps after 15 minutes of inactivity.
// Self-ping every 14 minutes keeps the server awake.
// If a ping fails, retry every 5 seconds until it succeeds.
const PING_EVERY_MS  = 14 * 60 * 1000; // 14 minutes
const RETRY_EVERY_MS =  5 * 1000;       // 5 seconds

@Injectable()
export class KeepAliveService implements OnApplicationBootstrap {
  private readonly log = new Logger('KeepAlive');
  private healthUrl = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  onApplicationBootstrap() {
    // Render injects RENDER_EXTERNAL_URL automatically; fall back to SELF_URL
    const base =
      process.env.RENDER_EXTERNAL_URL ||
      process.env.SELF_URL ||
      `http://localhost:${process.env.PORT || 4001}`;

    this.healthUrl = `${base.replace(/\/$/, '')}/api/health`;

    // Start first ping 1 minute after boot (give DB/TypeORM time to settle)
    this.timer = setTimeout(() => this.ping(), 60_000);
    this.log.log(`Keep-alive armed → will ping ${this.healthUrl} every 14 min`);
  }

  private async ping() {
    try {
      const res = await fetch(this.healthUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        this.log.log(`Ping OK [${res.status}] — next ping in 14 min`);
        this.timer = setTimeout(() => this.ping(), PING_EVERY_MS);
      } else {
        this.log.warn(`Ping returned ${res.status} — retrying in 5 s`);
        this.timer = setTimeout(() => this.ping(), RETRY_EVERY_MS);
      }
    } catch (err: any) {
      this.log.warn(`Ping failed (${err.message}) — retrying in 5 s`);
      this.timer = setTimeout(() => this.ping(), RETRY_EVERY_MS);
    }
  }
}
