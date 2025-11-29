import { useState, useRef, TouchEvent, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, Event } from '@/lib/cookies';
import { format, subDays, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarView = ({ open, onOpenChange }: CalendarViewProps) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<Event[]>([]);
  const touchStartX = useRef<number>(0);

  // Re-fetch events when drawer opens
  useEffect(() => {
    if (open) {
      setEvents(getEvents());
      setSelectedDate(new Date());
    }
  }, [open]);
  
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.time);
    return eventDate.toDateString() === selectedDate.toDateString();
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - go to next day (but not beyond today)
        const nextDay = addDays(selectedDate, 1);
        if (nextDay <= today) {
          setSelectedDate(nextDay);
        }
      } else {
        // Swipe right - go to previous day (up to 7 days back)
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
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/30"
                >
                  <span className="text-[14px] text-white">
                    {event.type === 'pipi' ? '💦 Pipi' : '💩 Stuhlgang'}
                  </span>
                  <span className="text-[14px] text-white">
                    {format(new Date(event.time), 'HH:mm')} Uhr
                  </span>
                </div>
              ))}
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
