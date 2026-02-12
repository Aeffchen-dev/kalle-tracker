import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  location?: string;
  description?: string;
  rrule?: string;
}

function parseICalDate(value: string): string {
  // Handle formats: 20250212T140000Z, 20250212T140000, 20250212
  const clean = value.replace(/^[A-Z]+[;=].*:/, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`;
  }
  const match = clean.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
  }
  return clean;
}

function unfoldLines(raw: string): string[] {
  // iCal uses line folding: continuation lines start with a space or tab
  return raw.replace(/\r\n[ \t]/g, '').replace(/\r/g, '').split('\n');
}

function parseICal(raw: string): ICalEvent[] {
  const lines = unfoldLines(raw);
  const events: ICalEvent[] = [];
  let current: Partial<ICalEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      if (current.summary && current.dtstart) {
        events.push(current as ICalEvent);
      }
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).split(';')[0].toUpperCase();
      const value = line.slice(colonIdx + 1);
      
      switch (key) {
        case 'UID': current.uid = value; break;
        case 'SUMMARY': current.summary = value; break;
        case 'DTSTART': current.dtstart = parseICalDate(line.slice(line.indexOf(':') + 1)); break;
        case 'DTEND': current.dtend = parseICalDate(line.slice(line.indexOf(':') + 1)); break;
        case 'LOCATION': current.location = value; break;
        case 'DESCRIPTION': current.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ','); break;
        case 'RRULE': current.rrule = value; break;
      }
    }
  }

  return events;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const calUrl = url.searchParams.get('url');
    
    if (!calUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert webcal:// to https://
    const fetchUrl = calUrl.replace(/^webcal:\/\//, 'https://');
    
    const response = await fetch(fetchUrl, {
      headers: { 'Accept': 'text/calendar' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const raw = await response.text();
    const events = parseICal(raw);

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching iCal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
