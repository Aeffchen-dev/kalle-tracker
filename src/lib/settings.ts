import { supabase } from '@/integrations/supabase/client';

export type CountdownMode = 'count_up' | 'count_down';

export interface Settings {
  morning_walk_time: string;
  walk_interval_hours: number;
  sleep_start_hour: number;
  sleep_end_hour: number;
  countdown_mode: CountdownMode;
  birthday: string | null;
}

// Initialize default settings with localStorage value for countdown_mode
const getDefaultSettings = (): Settings => ({
  morning_walk_time: '08:00',
  walk_interval_hours: 4,
  sleep_start_hour: 22,
  sleep_end_hour: 7,
  countdown_mode: 'count_up',
  birthday: null,
});

const DEFAULT_SETTINGS: Settings = getDefaultSettings();

const COUNTDOWN_MODE_KEY = 'kalle_countdown_mode';

// Cache for settings to avoid repeated fetches
let settingsCache: Settings | null = null;

// Get countdown mode from localStorage for immediate availability
const getLocalCountdownMode = (): CountdownMode => {
  try {
    const stored = localStorage.getItem(COUNTDOWN_MODE_KEY);
    if (stored === 'count_up' || stored === 'count_down') {
      return stored;
    }
  } catch (e) {
    console.error('Error reading countdown mode from localStorage:', e);
  }
  return 'count_up';
};

// Save countdown mode to localStorage
const saveLocalCountdownMode = (mode: CountdownMode): void => {
  try {
    localStorage.setItem(COUNTDOWN_MODE_KEY, mode);
  } catch (e) {
    console.error('Error saving countdown mode to localStorage:', e);
  }
};

export const getSettings = async (): Promise<Settings> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return settingsCache || DEFAULT_SETTINGS;
    }

    if (data) {
      const mode = (data.countdown_mode as CountdownMode) || 'count_up';
      saveLocalCountdownMode(mode);
      settingsCache = {
        morning_walk_time: data.morning_walk_time,
        walk_interval_hours: data.walk_interval_hours,
        sleep_start_hour: Number(data.sleep_start_hour),
        sleep_end_hour: Number(data.sleep_end_hour),
        countdown_mode: mode,
        birthday: data.birthday || null,
      };
      return settingsCache;
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return settingsCache || DEFAULT_SETTINGS;
  }
};

export const updateSettings = async (updates: Partial<Settings>): Promise<void> => {
  try {
    // Save countdown mode to localStorage immediately
    if (updates.countdown_mode) {
      saveLocalCountdownMode(updates.countdown_mode);
    }
    
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 'default',
        ...updates,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating settings:', error);
      return;
    }

    // Update cache
    if (settingsCache) {
      settingsCache = { ...settingsCache, ...updates };
    }
  } catch (error) {
    console.error('Error updating settings:', error);
  }
};

// Sync getter for use in anomaly detection (uses cache, falls back to localStorage for countdown_mode)
export const getCachedSettings = (): Settings => {
  if (settingsCache) {
    return settingsCache;
  }
  // Return defaults but use localStorage for countdown_mode for immediate availability
  return {
    ...DEFAULT_SETTINGS,
    countdown_mode: getLocalCountdownMode(),
  };
};

// Initialize cache on module load
getSettings();
