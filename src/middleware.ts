import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './lib/auth';
import { policies } from './lib/rate-limit';
import {
  getIp, isBanned, banIp,
  isSecurityScanner, isHarvesterBot, isRealBrowser,
  isHoneypotPath, hasMaliciousPayload,
} from './lib/bot-detection';

const PUBLIC_PATHS = ['/admin/login', '/api/auth/login', '/api/public/'];

// ── Response helpers ──────────────────────────────────────────────────────────

function block403() {
  return new NextResponse(null, { status: 403 });
}

function block404() {
  return new NextResponse(null, { status: 404 });
}

function tooManyRequests(resetIn: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many requests. Please slow down and try again.' },
    {
      status: 429,
      headers: { 'Retry-After': String(resetIn), 'X-RateLimit-Remaining': '0' },
    }
  );
}

// ── CORS ──────────────────────────────────────────────────────────────────────

function setCorsHeaders(res: NextResponse, origin: string | null): void {
  res.headers.set('Access-Control-Allow-Origin', origin ?? '*');
  if (origin) {
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getIp(req);
  const ua = req.headers.get('user-agent') ?? '';
  const url = req.nextUrl;
  const origin = req.headers.get('origin');
  const isPublicApi = pathname.startsWith('/api/public/');

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS' && isPublicApi) {
    const res = new NextResponse(null, { status: 204 });
    setCorsHeaders(res, origin);
    return res;
  }

  let response: NextResponse;

  // ── Layer 1: Banned IPs ───────────────────────────────────────────────────
  if (isBanned(ip)) {
    response = block403();

  // ── Layer 2: Honeypot paths ───────────────────────────────────────────────
  } else if (isHoneypotPath(pathname)) {
    banIp(ip, `honeypot-path:${pathname}`);
    response = block404();

  // ── Layer 3: Malicious query strings ──────────────────────────────────────
  } else if (hasMaliciousPayload(url)) {
    banIp(ip, 'malicious-payload');
    response = block403();

  // ── Layer 4: Security scanner UAs ─────────────────────────────────────────
  } else if (isSecurityScanner(ua)) {
    banIp(ip, `scanner-ua:${ua.slice(0, 60)}`);
    response = block403();

  // ── Layer 5: Harvester / AI crawler UAs ───────────────────────────────────
  } else if ((pathname.startsWith('/api/') || pathname.startsWith('/admin')) && isHarvesterBot(ua)) {
    response = block403();

  // ── Layer 6: Admin panel — require real browser ───────────────────────────
  } else if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !isRealBrowser(ua)) {
    response = block403();

  } else {
    // ── Layer 7: Rate limiting ──────────────────────────────────────────────
    let rateResponse: NextResponse | null = null;
    if (pathname.startsWith('/api/public/auth/')) {
      const r = policies.auth(ip);
      if (!r.allowed) rateResponse = tooManyRequests(r.resetInSeconds);
    } else if (pathname.startsWith('/api/public/')) {
      const r = policies.public(ip);
      if (!r.allowed) rateResponse = tooManyRequests(r.resetInSeconds);
    } else if (pathname.startsWith('/api/') || pathname.startsWith('/admin')) {
      const r = policies.admin(ip);
      if (!r.allowed) rateResponse = tooManyRequests(r.resetInSeconds);
    }

    if (rateResponse) {
      response = rateResponse;
    } else {
      // ── Layer 8: Auth guard ───────────────────────────────────────────────
      const isAdmin = pathname.startsWith('/admin');
      const isProtectedApi = pathname.startsWith('/api/')
        && !pathname.startsWith('/api/auth/login');

      if (!isAdmin && !isProtectedApi) {
        response = NextResponse.next();
      } else if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        response = NextResponse.next();
      } else {
        const session = await getSessionFromRequest(req);
        if (!session) {
          if (isAdmin) {
            response = NextResponse.redirect(new URL('/admin/login', req.url));
          } else {
            response = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
          }
        } else {
          response = NextResponse.next();
          response.headers.set('x-user-id', session.id);
          response.headers.set('x-user-role', session.role);
          response.headers.set('x-site-id', session.siteId);
        }
      }
    }
  }

  // ── Apply CORS to all public API responses ────────────────────────────────
  if (isPublicApi) setCorsHeaders(response, origin);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/:path*'],
};
