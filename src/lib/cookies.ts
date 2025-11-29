export interface Event {
  id: string;
  type: 'pipi' | 'stuhlgang';
  time: Date;
}

const COOKIE_NAME = 'kalle_events';
const COUNTDOWN_COOKIE = 'kalle_countdown_target';

export const getEvents = (): Event[] => {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`));
  
  if (!cookie) return [];
  
  try {
    const data = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    return data.map((e: any) => ({ ...e, time: new Date(e.time) }));
  } catch {
    return [];
  }
};

export const saveEvent = (event: Event): void => {
  const events = getEvents();
  events.push(event);
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(events))}; expires=${expires.toUTCString()}; path=/`;
};

export const getCountdownTarget = (): Date | null => {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COUNTDOWN_COOKIE}=`));
  
  if (!cookie) return null;
  
  try {
    return new Date(decodeURIComponent(cookie.split('=')[1]));
  } catch {
    return null;
  }
};

export const setCountdownTarget = (target: Date): void => {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COUNTDOWN_COOKIE}=${encodeURIComponent(target.toISOString())}; expires=${expires.toUTCString()}; path=/`;
};
