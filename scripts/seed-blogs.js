const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SITE_ID = 'cmp41xocd00001k5ucummooz4';

const categories = [
  { name: 'Tech Reviews', slug: 'tech-reviews', description: 'In-depth reviews of the latest gadgets' },
  { name: 'Buying Guides', slug: 'buying-guides', description: 'Smart buying advice for Pakistani consumers' },
  { name: 'Deals & Offers', slug: 'deals-offers', description: 'Best deals and limited-time offers' },
  { name: 'Home & Lifestyle', slug: 'home-lifestyle', description: 'Tips for a smarter home' },
];

const blogs = [
  {
    title: 'Best Smartphones Under Rs 50,000 in Pakistan (2026)',
    slug: 'best-smartphones-under-50000-pakistan-2026',
    excerpt: 'Looking for a powerful smartphone without breaking the bank? We\'ve rounded up the best phones available in Pakistan under Rs 50,000.',
    content: `<h2>The Best Budget Smartphones in Pakistan</h2><p>The Pakistani smartphone market has never been more competitive. With dozens of brands vying for your attention, finding the right phone at the right price can be overwhelming. We've tested the top contenders so you don't have to.</p><h2>1. Tecno Camon 40 Pro</h2><p>The Tecno Camon 40 Pro continues to impress with its 50MP AI camera and 6.78-inch AMOLED display. Running on Android 14 with 8GB RAM and 256GB storage, it handles multitasking effortlessly.</p><ul><li>Display: 6.78" AMOLED, 120Hz</li><li>Camera: 50MP + 13MP + 2MP</li><li>Battery: 5000mAh with 45W fast charging</li><li>Price: Rs 47,999</li></ul><h2>2. Infinix Note 50 Pro</h2><p>Infinix's Note 50 Pro packs a massive 5200mAh battery with 45W charging. The 108MP camera is a highlight, producing sharp daylight images with good dynamic range.</p><ul><li>Display: 6.78" AMOLED, 120Hz</li><li>Camera: 108MP main</li><li>Battery: 5200mAh</li><li>Price: Rs 44,999</li></ul><h2>Our Verdict</h2><p>For most buyers, the Tecno Camon 40 Pro offers the best overall package. If camera quality is your priority, the Infinix Note 50 Pro's 108MP sensor is hard to beat at this price point.</p>`,
    authorName: 'Ali Hassan',
    readingTime: 6,
    isFeatured: true,
    categorySlug: 'tech-reviews',
    thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    featuredImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
  },
  {
    title: 'How to Choose the Right Air Conditioner for Your Home',
    slug: 'how-to-choose-right-air-conditioner-pakistan',
    excerpt: 'With summer temperatures soaring past 45°C in parts of Pakistan, picking the right AC is crucial. Here\'s everything you need to know.',
    content: `<h2>AC Buying Guide for Pakistani Homes</h2><p>Buying an air conditioner is a major investment. The wrong choice can mean higher electricity bills, inadequate cooling, or costly repairs. This guide will walk you through everything you need to consider.</p><h2>Inverter vs Non-Inverter</h2><p>The most important decision is whether to go inverter or non-inverter. Inverter ACs adjust their compressor speed based on room temperature, consuming significantly less electricity over time.</p><ul><li><strong>Inverter AC:</strong> Higher upfront cost, 30-50% lower electricity bills, longer lifespan</li><li><strong>Non-Inverter AC:</strong> Cheaper to buy, higher running costs, louder operation</li></ul><h2>Choosing the Right Tonnage</h2><p>Tonnage refers to cooling capacity. Getting this wrong is the most common mistake buyers make.</p><ul><li>Up to 150 sq ft: 1 Ton</li><li>150–250 sq ft: 1.5 Ton</li><li>250–400 sq ft: 2 Ton</li></ul><h2>Top Brands Available in Pakistan</h2><p>Dawlance, PEL, Haier, Gree, and Kenwood are the most popular and widely serviced brands in Pakistan. All offer solid warranty support and nationwide service networks.</p><h2>Final Recommendation</h2><p>For most Pakistani households, a 1.5-ton inverter AC from Dawlance or Gree offers the best combination of price, efficiency, and after-sales support.</p>`,
    authorName: 'Sara Khan',
    readingTime: 8,
    isFeatured: true,
    categorySlug: 'buying-guides',
    thumbnail: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',
    featuredImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&q=80',
  },
  {
    title: 'Top 10 Kitchen Appliances That Will Transform Your Cooking',
    slug: 'top-kitchen-appliances-transform-cooking-pakistan',
    excerpt: 'Upgrade your kitchen with these must-have appliances. From air fryers to smart kettles, these gadgets make cooking faster and more enjoyable.',
    content: `<h2>Must-Have Kitchen Appliances in 2026</h2><p>Modern kitchen appliances can save hours in the kitchen every week. Here are the appliances that our team uses daily and can't imagine cooking without.</p><h2>1. Air Fryer</h2><p>The air fryer revolution has reached Pakistan. Using hot air circulation, air fryers produce crispy results with 80% less oil than traditional frying. Dawlance and Anex both offer reliable models starting from Rs 8,000.</p><h2>2. Automatic Electric Kettle</h2><p>A quality electric kettle boils water in under 2 minutes — far faster than a stove. The Philips Daily Collection Kettle at Rs 4,500 is our top pick for reliability and build quality.</p><h2>3. Hand Blender</h2><p>For soups, smoothies, and sauces, nothing beats a hand blender for convenience. The Braun MultiQuick series is excellent, though the Westpoint WF-304 offers 80% of the performance at half the price.</p><h2>4. Food Processor</h2><p>Chopping vegetables, kneading dough, grating cheese — a food processor does it all. Philips models are widely available and have excellent service centres across Pakistan.</p><blockquote>Pro tip: Buy appliances from brands with local service centres. A cheap appliance with no local repair support will cost you more in the long run.</blockquote><h2>Where to Buy</h2><p>PakDealsHub stocks all of these appliances at competitive prices with free delivery on orders above Rs 2,000. Check our Kitchen Appliances section for the latest deals.</p>`,
    authorName: 'Usman Tariq',
    readingTime: 5,
    isFeatured: false,
    categorySlug: 'home-lifestyle',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    featuredImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
  },
  {
    title: 'Eid Special Deals: The Biggest Sales of the Year Are Here',
    slug: 'eid-special-deals-biggest-sales-2026',
    excerpt: 'Eid ul Adha is just around the corner and PakDealsHub has launched its biggest sale of 2026. Here\'s everything on offer.',
    content: `<h2>Eid ul Adha 2026 Sale — Up to 50% Off</h2><p>Eid is the biggest shopping season in Pakistan, and this year we're going bigger than ever. From electronics to home appliances, fashion to kitchenware — everything is on sale.</p><h2>Electronics Deals</h2><ul><li>Samsung 55" 4K TV — was Rs 120,000, now Rs 84,999 (29% off)</li><li>Tecno Camon 40 Pro — was Rs 52,000, now Rs 44,999 (14% off)</li><li>Sony WH-1000XM5 Headphones — was Rs 65,000, now Rs 48,999 (25% off)</li></ul><h2>Home Appliances</h2><ul><li>Dawlance 1.5 Ton Inverter AC — was Rs 85,000, now Rs 68,999 (19% off)</li><li>PEL Double Door Refrigerator — was Rs 95,000, now Rs 74,999 (21% off)</li><li>Anex Microwave Oven — was Rs 18,000, now Rs 12,999 (28% off)</li></ul><h2>How to Claim Deals</h2><p>All deals are available directly on the PakDealsHub app. No coupon code needed — prices are already reduced. Free delivery on all orders above Rs 2,000 during the Eid sale period.</p><p>Sale ends midnight, 10th June 2026. Stock is limited, so don't wait!</p>`,
    authorName: 'Fatima Malik',
    readingTime: 4,
    isFeatured: false,
    categorySlug: 'deals-offers',
    thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    featuredImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
  },
  {
    title: 'Laptop Buying Guide: Which One Should You Buy in 2026?',
    slug: 'laptop-buying-guide-pakistan-2026',
    excerpt: 'From student laptops to professional workstations, we break down the best laptops available in Pakistan across every budget.',
    content: `<h2>The Complete Laptop Buying Guide for Pakistan</h2><p>Buying a laptop is a significant investment. Whether you're a student, a professional, or a gamer, this guide will help you make the right choice.</p><h2>What to Look For</h2><p>Before diving into specific models, here are the specs that matter most:</p><ul><li><strong>Processor:</strong> Intel Core i5/i7 (12th gen+) or AMD Ryzen 5/7 for general use</li><li><strong>RAM:</strong> 8GB minimum, 16GB recommended for multitasking</li><li><strong>Storage:</strong> 512GB SSD — avoid HDD laptops in 2026</li><li><strong>Battery:</strong> 6+ hours real-world for students</li><li><strong>Display:</strong> IPS panel preferred over TN for better colours</li></ul><h2>Best Under Rs 80,000</h2><p>The Acer Aspire 5 with Intel Core i5-1235U, 8GB RAM, and 512GB SSD offers exceptional value. It's widely available in Pakistan and has good after-sales support from Acer's service network.</p><h2>Best Under Rs 150,000</h2><p>Dell Inspiron 15 with Core i7 and 16GB RAM is our pick in this range. The build quality and keyboard are excellent for professionals who type a lot.</p><h2>For Gaming</h2><p>If gaming is a priority, look for dedicated NVIDIA RTX 4060 or better. The Acer Nitro series offers a good balance of performance and price in Pakistan.</p><h2>Where to Buy</h2><p>Always buy from authorised dealers or trusted e-commerce platforms to ensure warranty validity. PakDealsHub works with authorised brand distributors for all laptop sales.</p>`,
    authorName: 'Ali Hassan',
    readingTime: 9,
    isFeatured: false,
    categorySlug: 'buying-guides',
    thumbnail: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    featuredImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
  },
  {
    title: 'Review: Sony WH-1000XM5 — The Best ANC Headphones Available in Pakistan',
    slug: 'sony-wh-1000xm5-review-pakistan',
    excerpt: 'After two weeks of daily use, here\'s our full verdict on the Sony WH-1000XM5 noise-cancelling headphones.',
    content: `<h2>Sony WH-1000XM5 Review</h2><p>Sony's flagship noise-cancelling headphones have been the benchmark for years. The WH-1000XM5 raises the bar once again with a redesigned earcup, improved ANC processor, and longer battery life. But at Rs 65,000+, are they worth it in Pakistan?</p><h2>Design & Build</h2><p>The XM5 features a completely new design compared to the XM4. The headband is now a single, clean arc with no folding joints — which means they don't fold flat. This is a tradeoff: better aesthetics, slightly less portable.</p><h2>Noise Cancellation</h2><p>With eight microphones and two processors dedicated to ANC, the XM5 delivers the best noise cancellation we've tested. Airline cabin noise, traffic, and office chatter virtually disappear. The Speak-to-Chat feature automatically pauses music when you start talking.</p><h2>Sound Quality</h2><p>The 30mm drivers produce warm, detailed sound with deep bass that doesn't feel bloated. The LDAC codec support allows for high-resolution audio streaming when paired with compatible Android phones.</p><h2>Battery Life</h2><p>Sony claims 30 hours of ANC-on playback. In our testing, we consistently hit 27-28 hours — excellent for frequent travellers.</p><h2>Verdict</h2><p>The Sony WH-1000XM5 is the best over-ear ANC headphone money can buy. If you travel frequently or work in noisy environments, the investment pays for itself. For casual listeners, the XM4 (now discounted) offers 90% of the experience at a lower price.</p><ul><li>✅ Best-in-class ANC</li><li>✅ Excellent sound quality</li><li>✅ 30-hour battery</li><li>❌ Doesn't fold flat</li><li>❌ Premium price</li></ul>`,
    authorName: 'Usman Tariq',
    readingTime: 7,
    isFeatured: true,
    categorySlug: 'tech-reviews',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    featuredImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80',
  },
];

async function main() {
  console.log('Seeding blog categories…');
  const catMap = new Map();
  for (const cat of categories) {
    const c = await prisma.blogCategory.upsert({
      where: { slug_siteId: { slug: cat.slug, siteId: SITE_ID } },
      create: { ...cat, isActive: true, siteId: SITE_ID },
      update: { name: cat.name },
    });
    catMap.set(cat.slug, c.id);
    console.log('  ✓', cat.name);
  }

  console.log('\nSeeding blog posts…');
  for (const blog of blogs) {
    const { categorySlug, ...data } = blog;
    await prisma.blog.upsert({
      where: { slug_siteId: { slug: data.slug, siteId: SITE_ID } },
      create: {
        ...data,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        blogCategoryId: catMap.get(categorySlug),
        siteId: SITE_ID,
      },
      update: { title: data.title },
    });
    console.log('  ✓', data.title.slice(0, 60));
  }
  console.log('\n✅ Blog seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
