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

const DEFAULT_SETTINGS: Settings = {
  morning_walk_time: '08:00',
  walk_interval_hours: 4,
  sleep_start_hour: 22,
  sleep_end_hour: 7,
  countdown_mode: 'count_up',
  birthday: null,
};

// Cache for settings to avoid repeated fetches
let settingsCache: Settings | null = null;

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
      settingsCache = {
        morning_walk_time: data.morning_walk_time,
        walk_interval_hours: data.walk_interval_hours,
        sleep_start_hour: Number(data.sleep_start_hour),
        sleep_end_hour: Number(data.sleep_end_hour),
        countdown_mode: (data.countdown_mode as CountdownMode) || 'count_up',
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

// Sync getter for use in anomaly detection (uses cache)
export const getCachedSettings = (): Settings => {
  return settingsCache || DEFAULT_SETTINGS;
};

// Initialize cache on module load
getSettings();
