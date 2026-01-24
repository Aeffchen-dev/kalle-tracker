import { supabaseClient as supabase } from "@/lib/supabaseClient";

export type EventType = 'pipi' | 'stuhlgang' | 'phwert' | 'gewicht';

export interface Event {
  id: string;
  type: EventType;
  time: Date;
  ph_value?: string | null;
  weight_value?: number | null;
  logged_by?: string | null;
  synced?: boolean;
}

export interface SaveResult {
  success: boolean;
  savedLocally: boolean;
  error?: string;
}

export interface LoadResult {
  events: Event[];
  fromLocal: boolean;
  syncedCount: number;
  pendingCount: number;
}

const LOCAL_STORAGE_KEY = 'kalle_events_backup';
const PENDING_SYNC_KEY = 'kalle_events_pending';

// Get events from localStorage
const getLocalEvents = (): Event[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((e: any) => ({ ...e, time: new Date(e.time) }));
  } catch (error) {
    console.error('Error loading local events:', error);
    return [];
  }
};

// Save events to localStorage
const saveLocalEvents = (events: Event[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving local events:', error);
  }
};

// Get pending (unsynced) events
const getPendingEvents = (): Event[] => {
  try {
    const data = localStorage.getItem(PENDING_SYNC_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((e: any) => ({ ...e, time: new Date(e.time) }));
  } catch (error) {
    console.error('Error loading pending events:', error);
    return [];
  }
};

// Save pending events
const savePendingEvents = (events: Event[]): void => {
  try {
    if (events.length === 0) {
      localStorage.removeItem(PENDING_SYNC_KEY);
    } else {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(events));
    }
  } catch (error) {
    console.error('Error saving pending events:', error);
  }
};

// Try to sync pending events to the server
export const syncPendingEvents = async (): Promise<number> => {
  const pending = getPendingEvents();
  if (pending.length === 0) return 0;

  console.log(`Syncing ${pending.length} pending events...`);
  
  let syncedCount = 0;
  const stillPending: Event[] = [];

  for (const event of pending) {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          id: event.id,
          type: event.type,
          time: event.time.toISOString(),
          ph_value: event.ph_value || null,
          weight_value: event.weight_value || null
        });

      if (error) {
        // Check if it's a duplicate (already synced)
        if (error.code === '23505') {
          console.log(`Event ${event.id} already exists, removing from pending`);
          syncedCount++;
        } else {
          console.error('Error syncing event:', error);
          stillPending.push(event);
        }
      } else {
        console.log(`Synced event ${event.id}`);
        syncedCount++;
      }
    } catch (err) {
      console.error('Network error syncing event:', err);
      stillPending.push(event);
    }
  }

  savePendingEvents(stillPending);
  
  if (syncedCount > 0) {
    console.log(`Successfully synced ${syncedCount} events`);
  }
  if (stillPending.length > 0) {
    console.log(`${stillPending.length} events still pending`);
  }

  return syncedCount;
};

export const getEvents = async (): Promise<LoadResult> => {
  // First, try to sync any pending events
  const syncedCount = await syncPendingEvents();
  const pendingCount = getPendingCount();

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('time', { ascending: false });
    
    if (error) {
      // Fallback to local events
      return {
        events: getLocalEvents(),
        fromLocal: true,
        syncedCount,
        pendingCount
      };
    }
    
    const events = (data || []).map(e => ({
      id: e.id,
      type: e.type as EventType,
      time: new Date(e.time),
      ph_value: e.ph_value,
      weight_value: e.weight_value,
      logged_by: e.logged_by,
      synced: true
    }));

    // Update local backup
    saveLocalEvents(events);
    
    
    return {
      events,
      fromLocal: false,
      syncedCount,
      pendingCount: getPendingCount()
    };
  } catch (err) {
    // Fallback to local events
    return {
      events: getLocalEvents(),
      fromLocal: true,
      syncedCount,
      pendingCount
    };
  }
};

export const saveEvent = async (type: EventType, time?: Date, ph_value?: string, weight_value?: number): Promise<SaveResult> => {
  const eventId = crypto.randomUUID();
  const eventTime = time || new Date();
  
  const newEvent: Event = {
    id: eventId,
    type,
    time: eventTime,
    ph_value: ph_value || null,
    weight_value: weight_value || null,
    synced: false
  };

  // Always save locally first
  const localEvents = getLocalEvents();
  localEvents.unshift(newEvent);
  saveLocalEvents(localEvents);

  try {
    const { error } = await supabase
      .from('events')
      .insert({ 
        id: eventId,
        type, 
        time: eventTime.toISOString(), 
        ph_value: ph_value || null,
        weight_value: weight_value || null
      });
    
    if (error) {
      console.error('Error saving event to server:', error);
      // Add to pending queue
      const pending = getPendingEvents();
      pending.push(newEvent);
      savePendingEvents(pending);
      console.log('Event saved locally, will sync later');
      return {
        success: false,
        savedLocally: true,
        error: 'Verbindungsfehler - Event lokal gespeichert'
      };
    } else {
      console.log('Event saved successfully');
      // Update local event as synced
      const updated = getLocalEvents().map(e => 
        e.id === eventId ? { ...e, synced: true } : e
      );
      saveLocalEvents(updated);
      return {
        success: true,
        savedLocally: false
      };
    }
  } catch (err) {
    console.error('Network error saving event:', err);
    // Add to pending queue
    const pending = getPendingEvents();
    pending.push(newEvent);
    savePendingEvents(pending);
    console.log('Event saved locally, will sync later');
    return {
      success: false,
      savedLocally: true,
      error: 'Backend nicht erreichbar - Event lokal gespeichert'
    };
  }
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
  // Remove from local storage
  const localEvents = getLocalEvents().filter(e => e.id !== eventId);
  saveLocalEvents(localEvents);

  // Remove from pending if exists
  const pending = getPendingEvents().filter(e => e.id !== eventId);
  savePendingEvents(pending);

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      console.error('Error deleting event from server:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Network error deleting event:', err);
    return false;
  }
};

// Get count of pending events (useful for UI indicator)
export const getPendingCount = (): number => {
  return getPendingEvents().length;
};