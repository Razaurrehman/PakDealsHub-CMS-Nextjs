/**
 * Crawl surmawala.pk (Shopify store) and insert categories + products
 * into PakDealsHub database.
 *
 * Run:  node scripts/crawl-surmawala.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE = 'https://www.surmawala.pk';
const SITE_ID = 'cmp41xocd00001k5ucummooz4';
const DELAY_MS = 800; // polite delay between requests

// ── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Absolute image URL from Shopify CDN */
function absImg(src) {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return 'https:' + src;
}

/** Parse price string like "42999.00" → number */
function parsePKR(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PakDealsHub-Crawler/1.0)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
  return res.json();
}

// ── fetch all collections ─────────────────────────────────────────────────────

async function fetchCollections() {
  console.log('\n📂  Fetching collections …');
  const data = await fetchJSON(`${BASE}/collections.json?limit=250`);
  const collections = data.collections || [];
  // Filter out meta-collections
  const skip = new Set(['installments', 'dhamakedar-deals', 'brands', 'sale',
    'new-arrivals', 'featured', 'frontpage', 'all']);
  return collections.filter(
    (c) => c.handle && !skip.has(c.handle) && c.products_count > 0
  );
}

// ── fetch products for a collection (paginated) ───────────────────────────────

async function fetchProductsForCollection(handle) {
  const products = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/collections/${handle}/products.json?limit=250&page=${page}`;
    const data = await fetchJSON(url);
    const batch = data.products || [];
    if (batch.length === 0) break;
    products.push(...batch);
    if (batch.length < 250) break;
    page++;
    await sleep(DELAY_MS);
  }
  return products;
}

// ── upsert category ───────────────────────────────────────────────────────────

async function upsertCategory(col, index) {
  const slug = col.handle;
  const name = col.title;
  const description = stripHtml(col.body_html);
  const image = absImg(col.image?.src ?? null);

  const existing = await prisma.category.findUnique({
    where: { slug_siteId: { slug, siteId: SITE_ID } },
  });

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: { name, description, image, isActive: true, sortOrder: index },
    });
  }

  return prisma.category.create({
    data: {
      name,
      slug,
      description,
      image,
      isActive: true,
      sortOrder: index,
      siteId: SITE_ID,
    },
  });
}

// ── extract brand from product title / tags ───────────────────────────────────

const CATEGORY_KEYWORDS = new Set([
  'mobile', 'phones', 'phone', 'laptop', 'laptops', 'tv', 'appliances',
  'electronics', 'devices', 'fashion', 'beauty', 'bikes', 'deals', 'installments',
  'accessories', 'furniture', 'kitchen', 'home', 'lifestyle', 'sports', 'outdoor',
]);

function extractBrand(product) {
  const { title, tags } = product;
  const tagArr = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : (tags || []);

  // Tags that are likely brand names (single word, not a category keyword)
  const brandTag = tagArr.find((t) => {
    const lower = t.toLowerCase();
    return t.length > 1 && !CATEGORY_KEYWORDS.has(lower) && !/\s/.test(t);
  });
  if (brandTag) return brandTag;

  // Fallback: first word of title
  const firstWord = title.trim().split(/\s+/)[0];
  if (firstWord && !CATEGORY_KEYWORDS.has(firstWord.toLowerCase())) return firstWord;

  return null;
}

// ── upsert brand ──────────────────────────────────────────────────────────────

const brandCache = new Map(); // name → Brand record

async function upsertBrand(vendorName) {
  if (!vendorName) return null;
  const name = vendorName.trim();
  if (brandCache.has(name)) return brandCache.get(name);

  const slug = slugify(name);

  const brand = await prisma.brand.upsert({
    where: { slug_siteId: { slug, siteId: SITE_ID } },
    create: { name, slug, isActive: true, siteId: SITE_ID },
    update: { name, isActive: true },
  });

  brandCache.set(name, brand);
  return brand;
}

// ── upsert product ────────────────────────────────────────────────────────────

async function upsertProduct(shopifyProduct, categoryId) {
  const { title, handle, body_html, vendor, images, variants, tags } = shopifyProduct;

  const slug = handle;
  const name = title;
  const description = stripHtml(body_html);
  const shortDesc = description.slice(0, 200) || null;

  // Price from first variant
  const firstVariant = variants?.[0] ?? {};
  const price = parsePKR(firstVariant.price);
  const comparePrice = parsePKR(firstVariant.compare_at_price) || null;

  // Images
  const imgUrls = (images || []).map((i) => absImg(i.src)).filter(Boolean);
  const thumbnail = imgUrls[0] ?? null;

  // Colors from variants option named "Color"
  const colorOption = shopifyProduct.options?.find(
    (o) => o.name?.toLowerCase() === 'color' || o.name?.toLowerCase() === 'colour'
  );
  const colors = colorOption?.values?.filter((v) => v !== 'Default Title') ?? [];

  // Storage / size options
  const storageOption = shopifyProduct.options?.find((o) =>
    ['storage', 'size', 'capacity', 'ram'].includes(o.name?.toLowerCase())
  );
  const storages = storageOption?.values?.filter((v) => v !== 'Default Title') ?? [];

  // Stock: sum all variant inventory (Shopify may not expose inventory without auth, default 10)
  const stock = variants?.reduce((sum, v) => sum + (v.inventory_quantity ?? 0), 0) || 10;

  // Tags array
  const tagArr = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const brandName = extractBrand(shopifyProduct);
  const brand = await upsertBrand(brandName);

  try {
    const existing = await prisma.product.findUnique({
      where: { slug_siteId: { slug, siteId: SITE_ID } },
    });

    const data = {
      name,
      description,
      shortDesc,
      price: price || 0,
      comparePrice,
      images: imgUrls,
      thumbnail,
      stock: stock > 0 ? stock : 10,
      status: 'ACTIVE',
      isFeatured: false,
      isNew: false,
      freeDelivery: false,
      colors,
      storages,
      tags: tagArr,
      categoryId: categoryId ?? null,
      brandId: brand?.id ?? null,
      siteId: SITE_ID,
    };

    if (existing) {
      return prisma.product.update({ where: { id: existing.id }, data });
    }
    return prisma.product.create({ data: { ...data, slug } });
  } catch (err) {
    console.error(`  ✗ product "${name}" → ${err.message}`);
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀  Starting surmawala.pk crawl …\n');

  // 1. Collections → Categories
  const collections = await fetchCollections();
  console.log(`   Found ${collections.length} collections\n`);

  const categoryMap = new Map(); // handle → DB category

  for (let i = 0; i < collections.length; i++) {
    const col = collections[i];
    process.stdout.write(`  📁  [${i + 1}/${collections.length}] ${col.title} … `);
    const cat = await upsertCategory(col, i);
    categoryMap.set(col.handle, cat);
    console.log(`✓  (id: ${cat.id})`);
    await sleep(DELAY_MS);
  }

  // 2. Products per collection
  let totalInserted = 0;
  const seenHandles = new Set(); // avoid duplicate products across collections

  for (const col of collections) {
    console.log(`\n🛒  Crawling products for "${col.title}" …`);
    const cat = categoryMap.get(col.handle);

    let products;
    try {
      products = await fetchProductsForCollection(col.handle);
    } catch (err) {
      console.error(`  ✗ Failed to fetch products: ${err.message}`);
      continue;
    }

    console.log(`   ${products.length} products found`);

    for (let j = 0; j < products.length; j++) {
      const p = products[j];
      if (seenHandles.has(p.handle)) continue; // skip duplicate
      seenHandles.add(p.handle);

      process.stdout.write(`  [${j + 1}/${products.length}] ${p.title.slice(0, 60)} … `);
      const result = await upsertProduct(p, cat.id);
      if (result) {
        totalInserted++;
        console.log('✓');
      }
      await sleep(300);
    }
  }

  console.log(`\n✅  Done!`);
  console.log(`   Categories: ${categoryMap.size}`);
  console.log(`   Products:   ${totalInserted}`);
}

main()
  .catch((err) => {
    console.error('\n💥  Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
