import { supabase } from "@/integrations/supabase/client";

export interface Event {
  id: string;
  type: 'pipi' | 'stuhlgang';
  time: Date;
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
    time: new Date(e.time)
  }));
};

export const saveEvent = async (type: 'pipi' | 'stuhlgang'): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .insert({ type, time: new Date().toISOString() });
  
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
