import { supabaseClient as supabase } from "@/lib/supabaseClient";

export interface Event {
  id: string;
  type: 'pipi' | 'stuhlgang';
  time: Date;
  ph_value?: string | null;
  meal_timing?: string | null;
}

export const getEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('time', { ascending: false });
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return data.map(e => ({
    id: e.id,
    type: e.type as 'pipi' | 'stuhlgang',
    time: new Date(e.time),
    ph_value: e.ph_value,
    meal_timing: e.meal_timing
  }));
};

export const saveEvent = async (type: 'pipi' | 'stuhlgang', time?: Date, ph_value?: string, meal_timing?: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .insert({ type, time: (time || new Date()).toISOString(), ph_value: ph_value || null, meal_timing: meal_timing || null });
  
  if (error) {
    console.error('Error saving event:', error);
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  
  if (error) {
    console.error('Error deleting event:', error);
  }
};
