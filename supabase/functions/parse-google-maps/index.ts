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

    // Extract coordinates - multiple patterns
    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
    }

    // Also try data= pattern: !3d<lat>!4d<lng>
    if (!latitude) {
      const dataMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dataMatch) {
        latitude = parseFloat(dataMatch[1]);
        longitude = parseFloat(dataMatch[2]);
      }
    }

    // Also try ?q=lat,lng or ll=lat,lng
    if (!latitude) {
      const qMatch = finalUrl.match(/[?&](?:q|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        latitude = parseFloat(qMatch[1]);
        longitude = parseFloat(qMatch[2]);
      }
    }

    // If we have an address name but no coordinates, try geocoding via Nominatim
    if (!latitude && name) {
      try {
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'KalleApp/1.0' } }
        );
        const geoData = await geoResp.json();
        if (geoData && geoData.length > 0) {
          latitude = parseFloat(geoData[0].lat);
          longitude = parseFloat(geoData[0].lon);
        }
      } catch (e) {
        console.error('Geocoding failed:', e);
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

      // Extract coords from page content if not found in URL
      if (!latitude) {
        // Try !3d!4d pattern in page content
        const dataCoordMatch = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
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
