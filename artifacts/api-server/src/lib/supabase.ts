/**
 * Supabase client helpers for the Express API server.
 *
 * - `createSupabaseContext` from @supabase/server — creates a request-scoped
 *   supabase client with auth verification (works with Web API Request objects).
 * - `supabaseAdmin` — a service-role client that bypasses RLS for server-side ops.
 *
 * Environment variables required:
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { createSupabaseContext } from "@supabase/server";
import type { Request, Response, NextFunction } from "express";

// ──────────────────────────────────────────────────────────────────────────────
// Lazy env var accessors — validated at call time so the server can boot
// even if Supabase vars aren't set yet, with a clear error at usage time.
// ──────────────────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val || val === `your_${key.toLowerCase()}_here`) {
    throw new Error(
      `[Supabase] Missing env var: ${key}. ` +
      `Please restore your Supabase project and set this value in .env`
    );
  }
  return val;
}

const SUPABASE_URL = () => getEnv("SUPABASE_URL");
const SUPABASE_PUBLISHABLE_KEY = () => getEnv("SUPABASE_PUBLISHABLE_KEY");
const SUPABASE_SECRET_KEY = () => getEnv("SUPABASE_SECRET_KEY");

// ──────────────────────────────────────────────────────────────────────────────
// Admin client factory — service-role key, bypasses RLS. Use only server-side.
// Called lazily so the module can be imported without Supabase vars set yet.
// ──────────────────────────────────────────────────────────────────────────────

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(SUPABASE_URL(), SUPABASE_SECRET_KEY(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

// ──────────────────────────────────────────────────────────────────────────────
// Express middleware factory using @supabase/server's createSupabaseContext.
//
// Bridges Express (Node IncomingMessage) to the Web API Request standard that
// @supabase/server expects. Attaches ctx.supabase and ctx.supabaseAdmin to
// the Express request object under `req.supabaseCtx`.
//
// Auth modes:
//   "user"        — requires a valid user JWT in Authorization header
//   "publishable" — requires publishable key (anon access)
//   "secret"      — requires secret key (admin access)
//   "none"        — no auth check
// ──────────────────────────────────────────────────────────────────────────────

type AuthMode = "user" | "publishable" | "secret" | "none";

export function withSupabaseMiddleware(auth: AuthMode = "none") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Reconstruct a Web API Request from the Express request
      const protocol = (req.headers["x-forwarded-proto"] as string) || "http";
      const host = req.headers.host || "localhost";
      const url = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, value);
          }
        }
      }

      const webRequest = new Request(url, {
        method: req.method,
        headers,
      });

      const { data: ctx, error } = await createSupabaseContext(webRequest, {
        auth,
        env: {
          url: SUPABASE_URL(),
          publishableKeys: { default: SUPABASE_PUBLISHABLE_KEY() },
          secretKeys: { default: SUPABASE_SECRET_KEY() },
        },
      });

      if (error) {
        res.status(error.status ?? 401).json({ error: error.message });
        return;
      }

      // Attach to request for use in route handlers
      (req as Request & { supabaseCtx: typeof ctx }).supabaseCtx = ctx;
      next();
    } catch (err) {
      next(err);
    }
  };
}
