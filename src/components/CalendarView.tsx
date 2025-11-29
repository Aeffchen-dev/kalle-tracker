import { useState, useRef, TouchEvent, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, deleteEvent, Event } from '@/lib/events';
import { format, subDays, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface CalendarViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarView = ({ open, onOpenChange }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef<number>(0);
  const itemTouchStartX = useRef<number>(0);

  const loadEvents = async () => {
    const fetchedEvents = await getEvents();
    setEvents(fetchedEvents);
  };

  useEffect(() => {
    if (open) {
      loadEvents();
      setSelectedDate(new Date());
      setSwipingId(null);
      setSwipeOffset(0);
    }
  }, [open]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!open) return;
    
    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  const handleDelete = async (eventId: string) => {
    await deleteEvent(eventId);
    await loadEvents();
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleItemTouchStart = (e: TouchEvent, eventId: string) => {
    e.stopPropagation();
    itemTouchStartX.current = e.touches[0].clientX;
    setSwipingId(eventId);
  };

  const handleItemTouchMove = (e: TouchEvent) => {
    if (!swipingId) return;
    const diff = itemTouchStartX.current - e.touches[0].clientX;
    setSwipeOffset(Math.max(0, Math.min(diff, 80)));
  };

  const handleItemTouchEnd = () => {
    if (swipeOffset > 60) {
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
      setSwipingId(null);
    }
  };
  
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.time);
    return isSameDay(eventDate, selectedDate);
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const changeDate = (direction: 'left' | 'right') => {
    const today = new Date();
    if (direction === 'left') {
      const nextDay = addDays(selectedDate, 1);
      if (nextDay > today) return;
    } else {
      const prevDay = subDays(selectedDate, 1);
      const sevenDaysAgo = subDays(today, 6);
      if (prevDay < sevenDaysAgo) return;
    }
    
    setSlideDirection(direction);
    setTimeout(() => {
      if (direction === 'left') {
        setSelectedDate(addDays(selectedDate, 1));
      } else {
        setSelectedDate(subDays(selectedDate, 1));
      }
      setTimeout(() => setSlideDirection(null), 150);
    }, 150);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (swipingId) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        changeDate('left');
      } else {
        changeDate('right');
      }
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="bg-black border-black max-h-[80vh]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px] text-white">
            {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto overflow-x-hidden">
          <div 
            className={`transition-all duration-150 ${
              slideDirection === 'left' ? 'opacity-0 -translate-x-4' : 
              slideDirection === 'right' ? 'opacity-0 translate-x-4' : 
              'opacity-100 translate-x-0'
            }`}
          >
          {filteredEvents.length === 0 ? (
            <p className="text-center text-[14px] text-white/60">
              Keine Ereignisse
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => {
                const isActive = swipingId === event.id && swipeOffset > 0;
                return (
                  <div key={event.id} className="flex w-full">
                    <div
                      className="flex items-center justify-between p-3 bg-black border border-white/30 transition-all overflow-hidden"
                      style={{ 
                        width: isActive ? `calc(100% - ${swipeOffset}px)` : '100%',
                        borderTopLeftRadius: '0.5rem',
                        borderBottomLeftRadius: '0.5rem',
                        borderTopRightRadius: isActive ? 0 : '0.5rem',
                        borderBottomRightRadius: isActive ? 0 : '0.5rem',
                        borderRight: isActive ? 'none' : undefined,
                      }}
                      onTouchStart={(e) => handleItemTouchStart(e, event.id)}
                      onTouchMove={handleItemTouchMove}
                      onTouchEnd={() => handleItemTouchEnd()}
                    >
                      <span className="text-[14px] text-white whitespace-nowrap flex items-center gap-2">
                        <span>{event.type === 'pipi' ? '💦' : '💩'}</span>
                        <span>{event.type === 'pipi' ? 'Pipi' : 'Stuhlgang'}</span>
                      </span>
                      <span className="text-[14px] text-white whitespace-nowrap">
                        {format(new Date(event.time), 'HH:mm')} Uhr
                      </span>
                    </div>
                    {isActive && (
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="bg-red-500 flex items-center justify-center text-[14px] text-white rounded-r-lg"
                        style={{ width: swipeOffset }}
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-center text-[12px] text-white/40 mt-4">
            ← Wischen für andere Tage →
          </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CalendarView;
