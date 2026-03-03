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

interface RawEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  location?: string;
  description?: string;
  rrule?: string;
  exdates: string[];
  recurrenceId?: string;
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
  return raw.replace(/\r\n[ \t]/g, '').replace(/\r/g, '').split('\n');
}

function dateKey(isoStr: string): string {
  // Normalize to YYYY-MM-DD for comparison
  return isoStr.slice(0, 10);
}

function parseICal(raw: string): ICalEvent[] {
  const lines = unfoldLines(raw);
  const rawEvents: RawEvent[] = [];
  let current: Partial<RawEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = { exdates: [] };
    } else if (line === 'END:VEVENT' && current) {
      if (current.summary && current.dtstart) {
        rawEvents.push(current as RawEvent);
      }
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.slice(0, colonIdx);
      const key = keyPart.split(';')[0].toUpperCase();
      const value = line.slice(colonIdx + 1);
      
      switch (key) {
        case 'UID': current.uid = value; break;
        case 'SUMMARY': current.summary = value; break;
        case 'DTSTART': current.dtstart = parseICalDate(value); break;
        case 'DTEND': current.dtend = parseICalDate(value); break;
        case 'LOCATION': current.location = value; break;
        case 'DESCRIPTION': current.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ','); break;
        case 'RRULE': current.rrule = value; break;
        case 'EXDATE': {
          // EXDATE can have multiple dates comma-separated
          const dates = value.split(',').map(v => parseICalDate(v.trim()));
          current.exdates!.push(...dates);
          break;
        }
        case 'RECURRENCE-ID': {
          current.recurrenceId = parseICalDate(value);
          break;
        }
      }
    }
  }

  // Separate: base events (with rrule, no recurrence-id) vs override instances
  const baseEvents: RawEvent[] = [];
  const overridesByUid = new Map<string, RawEvent[]>();

  for (const evt of rawEvents) {
    if (evt.recurrenceId) {
      // This is an override of a specific recurrence instance
      const list = overridesByUid.get(evt.uid) || [];
      list.push(evt);
      overridesByUid.set(evt.uid, list);
    } else {
      baseEvents.push(evt);
    }
  }

  // Expand recurring events with EXDATE + RECURRENCE-ID support
  const result: ICalEvent[] = [];
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 6);

  for (const event of baseEvents) {
    if (!event.rrule) {
      result.push(toICalEvent(event));
      continue;
    }

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

    // Build set of excluded dates
    const exdateSet = new Set(event.exdates.map(d => dateKey(d)));

    // Build map of override instances by their original start date
    const overrides = overridesByUid.get(event.uid) || [];
    const overrideMap = new Map<string, RawEvent>();
    for (const ov of overrides) {
      if (ov.recurrenceId) {
        overrideMap.set(dateKey(ov.recurrenceId), ov);
      }
    }

    const maxOccurrences = count || 100;
    let current = new Date(dtstart);
    let occurrences = 0;

    while (occurrences < maxOccurrences) {
      if (current > until || current > horizon) break;

      const dk = dateKey(current.toISOString());

      if (exdateSet.has(dk)) {
        // Skip excluded date
      } else if (overrideMap.has(dk)) {
        // Use the override instance instead
        result.push(toICalEvent(overrideMap.get(dk)!));
      } else {
        // Normal instance
        const newEnd = new Date(current.getTime() + duration);
        result.push({
          uid: event.uid,
          summary: event.summary,
          dtstart: current.toISOString(),
          dtend: newEnd.toISOString(),
          location: event.location,
          description: event.description,
        });
      }

      occurrences++;

      // Advance to next occurrence
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
    }
  }

  return result;
}

function toICalEvent(raw: RawEvent): ICalEvent {
  const evt: ICalEvent = {
    uid: raw.uid,
    summary: raw.summary,
    dtstart: raw.dtstart,
    dtend: raw.dtend,
  };
  if (raw.location) evt.location = raw.location;
  if (raw.description) evt.description = raw.description;
  // Don't include rrule on output - all instances are expanded
  return evt;
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
