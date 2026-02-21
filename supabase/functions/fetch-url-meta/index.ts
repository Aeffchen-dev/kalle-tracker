const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MetaFetcher/1.0)',
        'Accept': 'text/html',
      },
    });

    const html = await response.text();

    // Extract OG title or <title>
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      || '';

    // Extract OG image
    let ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      || '';

    const isGeneric = (url: string) => !url || /logo/i.test(url) || url.endsWith('.svg') || url.endsWith('.ico');

    if (isGeneric(ogImage)) {
      // Try twitter:image
      const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1]
        || '';
      if (twitterImage && !isGeneric(twitterImage)) {
        ogImage = twitterImage;
      }
    }

    if (isGeneric(ogImage)) {
      // Try JSON-LD structured data image, then product img elements
      const productImg = html.match(/"image"\s*:\s*"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i)?.[1]
        || html.match(/"image"\s*:\s*\[\s*"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i)?.[1]
        || html.match(/<img[^>]+class=["'][^"']*product[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1]
        || html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*product[^"']*["']/i)?.[1]
        || '';
      if (productImg) {
        ogImage = productImg;
      }
    }

    // Clear if still generic
    if (isGeneric(ogImage)) ogImage = '';

    // Extract OG site name or derive from hostname
    const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1]
      || '';

    let shop = ogSiteName;
    if (!shop) {
      try {
        const hostname = new URL(formattedUrl).hostname.replace(/^www\./, '');
        // Capitalize first letter of domain name (before TLD)
        const parts = hostname.split('.');
        shop = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      } catch { /* ignore */ }
    }

    // Clean up title - remove shop name suffix if present
    let name = ogTitle.trim();
    if (shop && name.endsWith(` - ${shop}`)) {
      name = name.replace(` - ${shop}`, '');
    }
    if (shop && name.endsWith(` | ${shop}`)) {
      name = name.replace(` | ${shop}`, '');
    }

    return new Response(
      JSON.stringify({ name, shop, image: ogImage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch metadata' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
