import { supabaseClient as supabase } from "@/lib/supabaseClient";

export interface Event {
  id: string;
  type: 'pipi' | 'stuhlgang';
  time: Date;
  ph_value?: string | null;
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
    ph_value: e.ph_value
  }));
};

export const saveEvent = async (type: 'pipi' | 'stuhlgang', time?: Date, ph_value?: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .insert({ type, time: (time || new Date()).toISOString(), ph_value: ph_value || null });
  
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
