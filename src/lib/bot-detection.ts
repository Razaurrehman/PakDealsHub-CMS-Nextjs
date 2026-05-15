import { NextRequest } from 'next/server';

// ── Known malicious / unwanted User-Agent patterns ───────────────────────────

/** Security scanners & attack tools — block everywhere */
const SCANNER_PATTERNS: RegExp[] = [
  /nikto/i, /nmap/i, /masscan/i, /zgrab/i, /zmap/i,
  /sqlmap/i, /dirbuster/i, /gobuster/i, /dirb\b/i,
  /nuclei/i, /wfuzz/i, /ffuf/i, /hydra/i, /medusa/i,
  /burpsuite/i, /havij/i, /acunetix/i, /nessus/i, /openvas/i,
  /w3af/i, /commix/i, /beef\b/i, /metasploit/i,
];

/** Mass-harvesting scrapers & AI training bots — block on API & admin */
const HARVESTER_PATTERNS: RegExp[] = [
  /scrapy/i, /python-requests\/[0-9]/i, /aiohttp\/[0-9]/i,
  /httpx\/[0-9]/i, /go-http-client\/[0-9]/i,
  /java\/[0-9]/i, /libwww-perl/i, /lwp-trivial/i, /lwp-request/i,
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i,
  /petalbot/i, /bytespider/i, /gptbot/i, /ccbot/i,
  /claudebot/i, /anthropic-ai/i, /amazonbot/i, /applebot-extended/i,
  /omgili/i, /dataforseo/i, /proximic/i, /brandwatch/i,
  /ia_archiver/i, /archive\.org_bot/i,
];

/** Paths that only scanners / bots would probe */
const HONEYPOT_PATHS = new Set([
  '/.env', '/.env.local', '/.env.production', '/.git/config',
  '/wp-admin', '/wp-login.php', '/wordpress', '/wp-content',
  '/phpmyadmin', '/pma', '/mysql', '/adminer',
  '/etc/passwd', '/etc/shadow',
  '/config.php', '/configuration.php', '/settings.php',
  '/backup', '/dump.sql', '/db.sql', '/database.sql',
  '/admin.php', '/panel', '/shell', '/cmd',
  '/actuator', '/actuator/env', '/actuator/heapdump',
  '/console', '/h2-console', '/jolokia',
  '/.aws/credentials', '/.ssh/id_rsa',
  '/server-status', '/server-info',
]);

// ── In-memory banned IP list ──────────────────────────────────────────────────

type BanEntry = { until: number; reason: string };
const bannedIps = new Map<string, BanEntry>();

const HONEYPOT_BAN_MS  = 24 * 60 * 60 * 1000; // 24 h for honeypot hits
const SCANNER_BAN_MS   =  2 * 60 * 60 * 1000; //  2 h for scanner UA

export function banIp(ip: string, reason: string, durationMs = HONEYPOT_BAN_MS) {
  bannedIps.set(ip, { until: Date.now() + durationMs, reason });
}

export function isBanned(ip: string): boolean {
  const entry = bannedIps.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.until) { bannedIps.delete(ip); return false; }
  return true;
}

// ── Detection helpers ─────────────────────────────────────────────────────────

export function getIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export function isSecurityScanner(ua: string): boolean {
  return SCANNER_PATTERNS.some(p => p.test(ua));
}

export function isHarvesterBot(ua: string): boolean {
  return HARVESTER_PATTERNS.some(p => p.test(ua));
}

/** True if UA looks like a real browser (Chrome/Firefox/Safari/Edge/mobile) */
export function isRealBrowser(ua: string): boolean {
  if (!ua.trim()) return false;
  return /mozilla\/[0-9]/i.test(ua) &&
    /webkit|gecko|presto|trident/i.test(ua);
}

/** Suspicious path — only a bot/scanner would request this */
export function isHoneypotPath(pathname: string): boolean {
  // Exact match
  if (HONEYPOT_PATHS.has(pathname)) return true;
  // Prefix patterns
  if (/^\/\.git\//i.test(pathname)) return true;
  if (/^\/\.env/i.test(pathname)) return true;
  if (/\.\.(\/|%2f)/i.test(pathname)) return true; // path traversal
  return false;
}

/** Suspicious query string (SQL injection / XSS probes) */
export function hasMaliciousPayload(url: URL): boolean {
  const raw = url.search.toLowerCase();
  if (!raw) return false;
  return (
    /(\bunion\b.+\bselect\b|\bselect\b.+\bfrom\b)/i.test(raw) ||   // SQL injection
    /<script|javascript:|onerror=/i.test(raw) ||                     // XSS
    /\.\.(\/|%2f|%5c)/i.test(raw) ||                               // path traversal
    /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i.test(raw)   // SQLi tautology
  );
}
