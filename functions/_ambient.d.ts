// Cloudflare Pages Functions 入参类型增强（仅用于类型检查）
import type { D1Database } from '@cloudflare/workers-types';

declare global {
  interface PagesFunctionContext {
    env: { DB: D1Database; [k: string]: unknown };
    request: Request;
    data: { playerId: string; [k: string]: unknown };
    params?: Record<string, string>;
    waitUntil?: (p: Promise<unknown>) => void;
    passThroughOnException?: () => void;
    next?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  }
}

export {};
