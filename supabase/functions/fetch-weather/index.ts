const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat') || '52.52'; // Berlin default
    const lon = url.searchParams.get('lon') || '13.41';
    const days = url.searchParams.get('days') || '14';

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe/Berlin&forecast_days=${days}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    // Map weather codes to simple categories
    const days_data = data.daily.time.map((date: string, i: number) => ({
      date,
      code: data.daily.weather_code[i],
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      precipProb: data.daily.precipitation_probability_max[i],
    }));

    return new Response(JSON.stringify({ days: days_data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
