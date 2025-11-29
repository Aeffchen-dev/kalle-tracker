import { useState, useRef, TouchEvent, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, deleteEvent, Event } from '@/lib/cookies';
import { format, subDays, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarView = ({ open, onOpenChange }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const itemTouchStartX = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setEvents(getEvents());
      setSelectedDate(new Date());
      setSwipingId(null);
      setSwipeOffset(0);
    }
  }, [open]);

  const handleDelete = (eventId: string) => {
    deleteEvent(eventId);
    setEvents(getEvents());
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

  const handleItemTouchEnd = (eventId: string) => {
    if (swipeOffset > 60) {
      // Show delete button
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

  const handleTouchEnd = (e: TouchEvent) => {
    if (swipingId) return; // Don't change date when swiping item
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;
    const today = new Date();

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        const nextDay = addDays(selectedDate, 1);
        if (nextDay <= today) {
          setSelectedDate(nextDay);
        }
      } else {
        const prevDay = subDays(selectedDate, 1);
        const sevenDaysAgo = subDays(today, 6);
        if (prevDay >= sevenDaysAgo) {
          setSelectedDate(prevDay);
        }
      }
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-black max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px] text-white">
            {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
          </DrawerTitle>
        </DrawerHeader>
        <div 
          className="p-4 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
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
                  <div key={event.id} className="relative flex rounded-lg">
                    <div
                      className="flex-1 flex items-center justify-between p-3 bg-black border border-white/30 transition-all overflow-hidden"
                      style={{ 
                        marginRight: isActive ? swipeOffset : 0,
                        borderTopLeftRadius: '0.5rem',
                        borderBottomLeftRadius: '0.5rem',
                        borderTopRightRadius: isActive ? 0 : '0.5rem',
                        borderBottomRightRadius: isActive ? 0 : '0.5rem',
                        borderRight: isActive ? 'none' : undefined,
                      }}
                      onTouchStart={(e) => handleItemTouchStart(e, event.id)}
                      onTouchMove={handleItemTouchMove}
                      onTouchEnd={() => handleItemTouchEnd(event.id)}
                    >
                      <span className="text-[14px] text-white whitespace-nowrap">
                        {event.type === 'pipi' ? '💦 Pipi' : '💩 Stuhlgang'}
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
      </DrawerContent>
    </Drawer>
  );
};

export default CalendarView;
