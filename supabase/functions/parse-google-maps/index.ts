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

    let finalUrl = url.trim();
    
    // Follow redirects for short links (maps.app.goo.gl, goo.gl/maps)
    if (finalUrl.match(/goo\.gl|maps\.app/i)) {
      try {
        const resp = await fetch(finalUrl, { redirect: 'follow' });
        finalUrl = resp.url;
      } catch { /* use original */ }
    }

    let name = '';
    let city = '';
    let latitude: number | null = null;
    let longitude: number | null = null;

    // Try to extract from URL patterns
    // Pattern: /place/Place+Name/@lat,lng
    const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      name = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
    }

    // Extract coordinates
    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
    }

    // Also try ?q=lat,lng or ll=lat,lng
    if (!latitude) {
      const qMatch = finalUrl.match(/[?&](?:q|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        latitude = parseFloat(qMatch[1]);
        longitude = parseFloat(qMatch[2]);
      }
    }

    // Fetch the page to get better metadata
    try {
      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MetaFetcher/1.0)',
          'Accept': 'text/html',
        },
      });
      const html = await response.text();

      // Extract og:title which usually has "Place Name - Google Maps"
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
        || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        || '';

      if (ogTitle) {
        // Clean up "Place Name - Google Maps" pattern
        let cleanTitle = ogTitle.replace(/\s*[-–—]\s*Google\s*(Maps|Карты|地图)?/i, '').trim();
        // If title has address info like "Place, Street, City", extract name and city
        if (cleanTitle && !name) {
          name = cleanTitle;
        } else if (cleanTitle && name) {
          // Use the richer title if available
          name = cleanTitle;
        }
      }

      // Try to extract coords from page content if not found in URL
      if (!latitude) {
        const pageCoordMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (pageCoordMatch) {
          latitude = parseFloat(pageCoordMatch[1]);
          longitude = parseFloat(pageCoordMatch[2]);
        }
      }

      // Try to extract from JSON-LD or embedded data
      if (!latitude) {
        const latMatch = html.match(/"latitude"\s*:\s*(-?\d+\.\d+)/);
        const lngMatch = html.match(/"longitude"\s*:\s*(-?\d+\.\d+)/);
        if (latMatch && lngMatch) {
          latitude = parseFloat(latMatch[1]);
          longitude = parseFloat(lngMatch[1]);
        }
      }
    } catch (e) {
      console.error('Error fetching Google Maps page:', e);
    }

    // Extract city from name if it contains commas (e.g. "Place Name, Street, 12345 City")
    if (name && name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // Name is first part, city is last meaningful part
        const placeName = parts[0];
        // Find city: usually last part, may have postal code
        let cityPart = parts[parts.length - 1];
        // Remove country if it's the last part (e.g. "Germany", "Deutschland")
        if (cityPart.match(/^(Germany|Deutschland|Allemagne|Austria|Österreich|Switzerland|Schweiz)$/i)) {
          cityPart = parts.length >= 3 ? parts[parts.length - 2] : '';
        }
        // Remove postal code prefix
        cityPart = cityPart.replace(/^\d{4,5}\s*/, '').trim();
        
        name = placeName;
        city = cityPart;
      }
    }

    return new Response(
      JSON.stringify({ name, city, latitude, longitude }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to parse' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
