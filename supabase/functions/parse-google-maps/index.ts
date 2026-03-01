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
        // Use manual redirect following to handle Google's JS-based redirects
        let redirectUrl = finalUrl;
        for (let i = 0; i < 5; i++) {
          const resp = await fetch(redirectUrl, { 
            redirect: 'manual',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          const location = resp.headers.get('location');
          // Consume body to avoid leak
          await resp.text();
          if (location) {
            redirectUrl = location.startsWith('http') ? location : new URL(location, redirectUrl).href;
          } else {
            break;
          }
        }
        if (redirectUrl !== finalUrl) {
          finalUrl = redirectUrl;
        }

        // If still a short link, try fetching the page and looking for canonical/redirect URL
        if (finalUrl.match(/goo\.gl|maps\.app/i)) {
          try {
            const resp = await fetch(finalUrl, {
              redirect: 'follow',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            });
            const pageUrl = resp.url;
            const body = await resp.text();
            
            if (pageUrl && pageUrl !== finalUrl && pageUrl.includes('google.com/maps')) {
              finalUrl = pageUrl;
            } else {
              // Try to find a redirect URL in the HTML content
              const metaRefresh = body.match(/content=["']\d+;\s*url=([^"']+)["']/i);
              if (metaRefresh) {
                finalUrl = metaRefresh[1];
              }
              // Look for canonical link
              const canonical = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
              if (canonical && canonical[1].includes('google.com/maps')) {
                finalUrl = canonical[1];
              }
              // Look for window.location or redirect patterns
              const jsRedirect = body.match(/window\.location\s*=\s*["']([^"']+google\.com\/maps[^"']+)["']/i);
              if (jsRedirect) {
                finalUrl = jsRedirect[1];
              }
            }
          } catch { /* use what we have */ }
        }
      } catch { /* use original */ }
    }

    console.log('Final URL after redirect:', finalUrl);

    let name = '';
    let city = '';
    let latitude: number | null = null;
    let longitude: number | null = null;
    let image_url: string | null = null;

    // Try to extract from URL patterns
    const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      name = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
    }

    // Extract name from ?q= parameter (address-style URLs)
    if (!name) {
      const qParam = finalUrl.match(/[?&]q=([^&]+)/);
      if (qParam) {
        const decoded = decodeURIComponent(qParam[1]).replace(/\+/g, ' ');
        // Only use if it's not just coordinates
        if (!decoded.match(/^-?\d+\.\d+,-?\d+\.\d+$/)) {
          name = decoded;
        }
      }
    }

    // Extract coordinates - prioritize precise !3d!4d (actual place pin) over @lat,lng (viewport center)
    
    // 1. Most precise: !3d<lat>!4d<lng> from data parameters
    const dataMatch = finalUrl.match(/!3d(-?\d+\.\d{4,})!4d(-?\d+\.\d{4,})/);
    if (dataMatch) {
      latitude = parseFloat(dataMatch[1]);
      longitude = parseFloat(dataMatch[2]);
    }

    // 2. Fallback: @lat,lng from URL (viewport center, less precise)
    if (!latitude) {
      const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        latitude = parseFloat(coordMatch[1]);
        longitude = parseFloat(coordMatch[2]);
      }
    }

    // 3. Fallback: ?q=lat,lng or ll=lat,lng
    if (!latitude) {
      const qMatch = finalUrl.match(/[?&](?:q|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        latitude = parseFloat(qMatch[1]);
        longitude = parseFloat(qMatch[2]);
      }
    }

    // Helper: Haversine distance in meters
    function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371000;
      const toRad = (d: number) => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // If we have coords (from Google Maps) AND a name, refine via Nominatim multi-result matching
    const gmapLat = latitude;
    const gmapLng = longitude;
    
    if (latitude && name) {
      try {
        // Extract the place name part (before comma) for searching
        const searchName = name.includes(',') ? name.split(',')[0].trim() : name;
        const qParam = finalUrl.match(/[?&]q=([^&]+)/);
        const fullQuery = qParam ? decodeURIComponent(qParam[1]).replace(/\+/g, ' ') : name;
        
        // Search with multiple queries and collect all candidates
        const candidates: Array<{lat: number, lon: number, display: string, dist: number}> = [];
        const searchQueries = [fullQuery, searchName];
        // Also try without postal code
        const noPCQuery = fullQuery.replace(/\d{4,5}\s*/g, '').trim();
        if (noPCQuery !== fullQuery) searchQueries.push(noPCQuery);
        
        for (const q of [...new Set(searchQueries)]) {
          try {
            console.log('Precision search:', q);
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&viewbox=${longitude! - 0.1},${latitude! + 0.1},${longitude! + 0.1},${latitude! - 0.1}`,
              { headers: { 'User-Agent': 'KalleApp/1.0' } }
            );
            const data = await resp.json();
            if (Array.isArray(data)) {
              for (const r of data) {
                const lat = parseFloat(r.lat);
                const lon = parseFloat(r.lon);
                const dist = haversine(gmapLat!, gmapLng!, lat, lon);
                candidates.push({ lat, lon, display: r.display_name, dist });
              }
            }
          } catch { /* skip */ }
        }
        
        // Pick the candidate closest to the Google Maps coordinates
        if (candidates.length > 0) {
          candidates.sort((a, b) => a.dist - b.dist);
          const best = candidates[0];
          console.log(`Best match: ${best.display} (${best.dist.toFixed(0)}m from Google pin)`);
          // Only use if within 5km of original (sanity check)
          if (best.dist < 5000) {
            latitude = best.lat;
            longitude = best.lon;
          }
        }
      } catch (e) {
        console.error('Precision matching failed:', e);
      }
    }

    // If no coordinates at all, try geocoding via Nominatim with multi-result precision matching
    if (!latitude && name) {
      const qParam = finalUrl.match(/[?&]q=([^&]+)/);
      const geocodeQuery = qParam ? decodeURIComponent(qParam[1]).replace(/\+/g, ' ') : name;
      
      // Build multiple search queries for better coverage
      const queries = [geocodeQuery];
      const parts = geocodeQuery.split(',').map(p => p.trim());
      
      // Short name only (e.g. "Königsheide" from "Königsheide, Königsheideweg, 12487 Berlin")
      if (parts.length >= 2) {
        const city = parts[parts.length - 1].replace(/^\d{4,5}\s*/, '').trim();
        queries.push(`${parts[0]}, ${city}`); // "Königsheide, Berlin"
        queries.push(parts[0]); // just "Königsheide"
      }
      if (parts.length >= 3) {
        queries.push(parts.slice(1).join(', ')); // street + city without place name
      }
      
      // Collect ALL candidates from ALL queries
      const candidates: Array<{lat: number, lon: number, display: string, type: string, cls: string, importance: number}> = [];
      
      for (const q of [...new Set(queries)]) {
        try {
          console.log('Geocoding attempt:', q);
          const geoResp = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
            { headers: { 'User-Agent': 'KalleApp/1.0' } }
          );
          const geoData = await geoResp.json();
          if (Array.isArray(geoData)) {
            for (const r of geoData) {
              candidates.push({
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
                display: r.display_name || '',
                type: r.type || '',
                cls: r.class || '',
                importance: parseFloat(r.importance) || 0,
              });
            }
          }
        } catch (e) {
          console.error('Geocoding failed:', e);
        }
      }
      
      if (candidates.length > 0) {
        // Prefer natural areas, parks, forests over streets/addresses
        // Score: natural/leisure/landuse types get a boost
        const areaTypes = new Set(['forest', 'park', 'wood', 'nature_reserve', 'dog_park', 'garden', 'meadow', 'heath', 'scrub', 'recreation_ground', 'pitch', 'water', 'lake', 'river']);
        const areaClasses = new Set(['natural', 'leisure', 'landuse', 'waterway', 'amenity']);
        
        const scored = candidates.map(c => {
          let score = c.importance;
          if (areaTypes.has(c.type) || areaClasses.has(c.cls)) score += 0.5;
          // Boost if display name contains the search term
          if (c.display.toLowerCase().includes(parts[0].toLowerCase())) score += 0.3;
          return { ...c, score };
        });
        
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];
        latitude = best.lat;
        longitude = best.lon;
        console.log(`Best geocoding match: ${best.display} (class=${best.cls}, type=${best.type}, score=${best.score.toFixed(2)})`);
      }
    }

    // Fetch the page to get better metadata
    try {
      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
      });
      const html = await response.text();

      // Extract og:title
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
        || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        || '';

      if (ogTitle && ogTitle !== 'Google Maps' && !ogTitle.match(/^Google\s*(Maps|Карты|地图)?$/i)) {
        let cleanTitle = ogTitle
          .replace(/\s*[-–—·]\s*Google\s*(Maps|Карты|地图)?/i, '')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        if (cleanTitle && cleanTitle !== 'Google Maps') {
          name = cleanTitle;
        }
      }

      // Extract og:image for place photo
      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
      
      if (ogImage && !ogImage.includes('maps_results_logo') && !ogImage.includes('google_favicon') && !ogImage.includes('staticmap')) {
        image_url = ogImage;
      }

      // Also try twitter:image
      if (!image_url) {
        const twitterImage = html.match(/<meta[^>]+(?:name|property)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']twitter:image["']/i)?.[1];
        if (twitterImage && !twitterImage.includes('maps_results_logo') && !twitterImage.includes('staticmap')) {
          image_url = twitterImage;
        }
      }

      // Try extracting from lh3/lh5.googleusercontent.com images in the page (Google Maps place photos)
      if (!image_url) {
        const gPhotoMatch = html.match(/https:\/\/lh[35]\.googleusercontent\.com\/[^"'\s<>]+/);
        if (gPhotoMatch) {
          image_url = gPhotoMatch[0];
        }
      }

      // Extract coords from page content if not found in URL — prefer !3d!4d (precise pin)
      if (!latitude) {
        const dataCoordMatch = html.match(/!3d(-?\d+\.\d{4,})!4d(-?\d+\.\d{4,})/);
        if (dataCoordMatch) {
          latitude = parseFloat(dataCoordMatch[1]);
          longitude = parseFloat(dataCoordMatch[2]);
        }
      }

      if (!latitude) {
        const pageCoordMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (pageCoordMatch) {
          latitude = parseFloat(pageCoordMatch[1]);
          longitude = parseFloat(pageCoordMatch[2]);
        }
      }

      // Try JSON-LD
      if (!latitude) {
        const latMatch = html.match(/"latitude"\s*:\s*(-?\d+\.\d+)/);
        const lngMatch = html.match(/"longitude"\s*:\s*(-?\d+\.\d+)/);
        if (latMatch && lngMatch) {
          latitude = parseFloat(latMatch[1]);
          longitude = parseFloat(lngMatch[1]);
        }
      }

      // Try og:description for place info
      if (!latitude) {
        const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
        const descCoords = ogDesc.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (descCoords) {
          latitude = parseFloat(descCoords[1]);
          longitude = parseFloat(descCoords[2]);
        }
      }
    } catch (e) {
      console.error('Error fetching Google Maps page:', e);
    }

    // Extract city from name if it contains commas
    if (name && name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const placeName = parts[0];
        let cityPart = parts[parts.length - 1];
        if (cityPart.match(/^(Germany|Deutschland|Allemagne|Austria|Österreich|Switzerland|Schweiz)$/i)) {
          cityPart = parts.length >= 3 ? parts[parts.length - 2] : '';
        }
        cityPart = cityPart.replace(/^\d{4,5}\s*/, '').trim();
        name = placeName;
        city = cityPart;
      }
    }

    console.log('Result:', { name, city, latitude, longitude, image_url: image_url ? 'present' : 'null' });

    return new Response(
      JSON.stringify({ name, city, latitude, longitude, image_url }),
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
