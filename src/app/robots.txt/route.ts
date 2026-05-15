export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const ROBOTS = `
# PakDealsHub CMS
# Legitimate crawlers respect this file.

User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /trap

# AI training crawlers — not welcome
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: ByteSpider
Disallow: /

User-agent: AmazonBot
Disallow: /

# SEO harvesters
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: PetalBot
Disallow: /
`.trim();

export async function GET() {
  return new NextResponse(ROBOTS, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
