export interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  location?: string;
  description?: string;
  rrule?: string;
}

const ICAL_URL = 'webcal://p136-caldav.icloud.com/published/2/NDExNjYzNzQxNDExNjYzN8Ml25inOVbJG7MIdfUAaDzgKgvioVj3pmQouywCxtFrT7ALr5j-l9F3Qv35nY_fWOFaHAHmT3_h72Qe3PvvI6U';

let cachedEvents: ICalEvent[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const fetchICalEvents = async (): Promise<ICalEvent[]> => {
  const now = Date.now();
  if (cachedEvents && now - cacheTime < CACHE_TTL) {
    return cachedEvents;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ical?url=${encodeURIComponent(ICAL_URL)}`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status}`);
    }

    const result = await response.json();
    cachedEvents = result.events || [];
    cacheTime = now;
    return cachedEvents!;
  } catch (err) {
    console.error('Error fetching iCal events:', err);
    return cachedEvents || [];
  }
};

export const getICalEventsForDate = (events: ICalEvent[], date: Date): ICalEvent[] => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  const checkEnd = new Date(checkDate);
  checkEnd.setDate(checkEnd.getDate() + 1);
  
  return events.filter(e => {
    const start = new Date(e.dtstart);
    const end = e.dtend ? new Date(e.dtend) : new Date(start.getTime() + 3600000);
    // Event overlaps with this date
    return start < checkEnd && end > checkDate;
  });
};

export const getICalEventsForWeek = (events: ICalEvent[], referenceDate: Date): Map<number, ICalEvent[]> => {
  const result = new Map<number, ICalEvent[]>();
  
  // Get start of current week (Monday)
  const startOfWeek = new Date(referenceDate);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dayEvents = getICalEventsForDate(events, d);
    result.set(i, dayEvents);
  }
  
  return result;
};

export const getICalEventsForRange = (events: ICalEvent[], startDate: Date, numDays: number): Map<number, ICalEvent[]> => {
  const result = new Map<number, ICalEvent[]>();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    result.set(i, getICalEventsForDate(events, d));
  }
  
  return result;
};

// Find who has Kalle on a given date based on "x hat Kalle" calendar events
export interface KalleOwnership {
  person: string; // e.g. "Jana" or "Niklas"
  summary: string; // full event summary
  startDate: Date;
  endDate: Date;
}

export const getKalleOwnerForDate = (events: ICalEvent[], date: Date): KalleOwnership | null => {
  const checkDate = new Date(date);
  checkDate.setHours(12, 0, 0, 0); // noon to avoid timezone edge cases
  
  for (const evt of events) {
    const summary = evt.summary || '';
    // Match patterns like "🐶 Jana hat Kalle", "Niklas hat Kalle", "Jana hat Kalle"
    const match = summary.match(/(?:🐶\s*)?(\w+)\s+hat\s+Kalle/i);
    if (!match) continue;
    
    const start = new Date(evt.dtstart);
    const end = evt.dtend ? new Date(evt.dtend) : new Date(start.getTime() + 86400000);
    
    if (checkDate >= start && checkDate < end) {
      return {
        person: match[1],
        summary,
        startDate: start,
        endDate: end,
      };
    }
  }
  return null;
};
