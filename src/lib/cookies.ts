export interface Event {
  id: string;
  type: 'pipi' | 'stuhlgang';
  time: Date;
}

const STORAGE_KEY = 'kalle_events';

export const getEvents = (): Event[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((e: any) => ({ ...e, time: new Date(e.time) }));
  } catch (error) {
    console.error('Error loading events:', error);
    return [];
  }
};

export const saveEvent = (event: Event): void => {
  try {
    const events = getEvents();
    events.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving event:', error);
  }
};

export const deleteEvent = (eventId: string): void => {
  try {
    const events = getEvents();
    const filtered = events.filter(e => e.id !== eventId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting event:', error);
  }
};

export const getCountdownTarget = (): Date | null => {
  try {
    const data = localStorage.getItem('kalle_countdown_target');
    if (!data) return null;
    return new Date(data);
  } catch {
    return null;
  }
};

export const setCountdownTarget = (target: Date): void => {
  localStorage.setItem('kalle_countdown_target', target.toISOString());
};

// Morning walk time setting (default 08:00)
export const getMorningWalkTime = (): string => {
  try {
    const data = localStorage.getItem('kalle_morning_walk_time');
    return data || '08:00';
  } catch {
    return '08:00';
  }
};

export const setMorningWalkTime = (time: string): void => {
  localStorage.setItem('kalle_morning_walk_time', time);
};

// Walk interval setting in hours (default 4)
export const getWalkIntervalHours = (): number => {
  try {
    const data = localStorage.getItem('kalle_walk_interval_hours');
    return data ? parseInt(data, 10) : 4;
  } catch {
    return 4;
  }
};

export const setWalkIntervalHours = (hours: number): void => {
  localStorage.setItem('kalle_walk_interval_hours', hours.toString());
};

// Sleep time settings (default 22:00 - 07:00)
export const getSleepStartHour = (): number => {
  try {
    const data = localStorage.getItem('kalle_sleep_start_hour');
    return data ? parseInt(data, 10) : 22;
  } catch {
    return 22;
  }
};

export const setSleepStartHour = (hour: number): void => {
  localStorage.setItem('kalle_sleep_start_hour', hour.toString());
};

export const getSleepEndHour = (): number => {
  try {
    const data = localStorage.getItem('kalle_sleep_end_hour');
    return data ? parseInt(data, 10) : 7;
  } catch {
    return 7;
  }
};

export const setSleepEndHour = (hour: number): void => {
  localStorage.setItem('kalle_sleep_end_hour', hour.toString());
};
