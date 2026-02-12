// fetch-ical edge function

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

  // Expand recurring events
  const expanded = expandRecurringEvents(events);
  return expanded;
}

function expandRecurringEvents(events: ICalEvent[]): ICalEvent[] {
  const result: ICalEvent[] = [];
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 6); // expand 6 months ahead

  for (const event of events) {
    if (!event.rrule) {
      result.push(event);
      continue;
    }

    // Parse RRULE
    const rules: Record<string, string> = {};
    for (const part of event.rrule.split(';')) {
      const [k, v] = part.split('=');
      if (k && v) rules[k] = v;
    }

    const freq = rules['FREQ'];
    const interval = parseInt(rules['INTERVAL'] || '1');
    const until = rules['UNTIL'] ? new Date(parseICalDate(rules['UNTIL'])) : horizon;
    const count = rules['COUNT'] ? parseInt(rules['COUNT']) : undefined;

    const dtstart = new Date(event.dtstart);
    const dtend = new Date(event.dtend || event.dtstart);
    const duration = dtend.getTime() - dtstart.getTime();

    // Push the original event
    result.push(event);

    let current = new Date(dtstart);
    let occurrences = 1;
    const maxOccurrences = count || 100;

    while (occurrences < maxOccurrences) {
      // Advance by interval
      if (freq === 'DAILY') {
        current = new Date(current.getTime() + interval * 86400000);
      } else if (freq === 'WEEKLY') {
        current = new Date(current.getTime() + interval * 7 * 86400000);
      } else if (freq === 'MONTHLY') {
        const next = new Date(current);
        next.setMonth(next.getMonth() + interval);
        current = next;
      } else if (freq === 'YEARLY') {
        const next = new Date(current);
        next.setFullYear(next.getFullYear() + interval);
        current = next;
      } else {
        break;
      }

      if (current > until || current > horizon) break;

      const newEnd = new Date(current.getTime() + duration);
      result.push({
        ...event,
        dtstart: current.toISOString(),
        dtend: newEnd.toISOString(),
        rrule: undefined, // don't mark expanded instances as recurring
      });
      occurrences++;
    }
  }

  return result;
}
Deno.serve(async (req) => {
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
