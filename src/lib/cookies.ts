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
    console.log('Event saved:', event);
    console.log('All events now:', events);
  } catch (error) {
    console.error('Error saving event:', error);
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
