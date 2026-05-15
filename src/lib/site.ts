import { prisma } from './prisma';

let cachedSiteId: string | null = null;

export async function getDefaultSiteId(): Promise<string> {
  if (cachedSiteId) return cachedSiteId;

  const envId = process.env.DEFAULT_SITE_ID;
  if (envId) { cachedSiteId = envId; return envId; }

  const site = await prisma.site.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!site) throw new Error('No site found. Run prisma db seed first.');

  cachedSiteId = site.id;
  return site.id;
}
