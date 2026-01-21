import { useState, useRef, TouchEvent, useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, deleteEvent, Event, getPendingCount } from '@/lib/events';
import { format, subDays, addDays, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { ArrowLeft, ArrowRight, TrendingUp, CalendarIcon, CloudOff } from 'lucide-react';
import TrendAnalysis, { isWeightOutOfBounds } from './TrendAnalysis';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

type SnapPoint = number | string;

interface CalendarViewProps {
  eventSheetOpen?: boolean;
}

const CalendarView = ({ eventSheetOpen = false }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SnapPoint | null>(0.2);
  const [showTrends, setShowTrends] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const { toast } = useToast();
  
  const toggleSnapPoint = () => {
    setSnap(snap === 0.2 ? 0.9 : 0.2);
  };
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Day swipe refs
  const daySwipeStartX = useRef<number>(0);
  const daySwipeEndX = useRef<number>(0);
  const daySwipeStartY = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean>(false);
  const swipeDecided = useRef<boolean>(false);
  
  // Long press refs
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef<boolean>(false);

  const loadEvents = async () => {
    const result = await getEvents();
    setEvents(result.events);
    setIsOffline(result.fromLocal);
    setPendingCount(result.pendingCount);
    
    if (result.fromLocal) {
      toast({
        title: "Offline-Modus",
        description: "Backend nicht erreichbar. Zeige lokale Daten.",
        variant: "destructive",
      });
    } else if (result.syncedCount > 0) {
      toast({
        title: "Synchronisiert",
        description: `${result.syncedCount} Event(s) erfolgreich synchronisiert.`,
      });
    }
  };

  useEffect(() => {
    loadEvents();
    setSelectedDate(new Date());
  }, []);

  // Scroll to top when switching views
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [showTrends]);

  // Subscribe to realtime updates
  useEffect(() => {
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
  }, []);

  const handleDelete = async (eventId: string) => {
    await deleteEvent(eventId);
    await loadEvents();
    setActiveEventId(null);
  };

  // Long press handlers
  const handleLongPressStart = (eventId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      // Toggle: if already showing delete, hide it; otherwise show it
      if (activeEventId === eventId) {
        setActiveEventId(null);
      } else {
        setActiveEventId(eventId);
      }
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLongPressMove = () => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Day swipe handlers (for the content area)
  const handleDaySwipeStart = (e: TouchEvent) => {
    daySwipeStartX.current = e.touches[0].clientX;
    daySwipeStartY.current = e.touches[0].clientY;
    daySwipeEndX.current = e.touches[0].clientX;
    isHorizontalSwipe.current = false;
    swipeDecided.current = false;
    setSwipeOffset(0);
  };

  const handleDaySwipeMove = (e: TouchEvent) => {
    daySwipeEndX.current = e.touches[0].clientX;
    const diffX = daySwipeEndX.current - daySwipeStartX.current;
    const diffY = Math.abs(e.touches[0].clientY - daySwipeStartY.current);
    
    // Decide direction once
    if (!swipeDecided.current && (Math.abs(diffX) > 10 || diffY > 10)) {
      swipeDecided.current = true;
      isHorizontalSwipe.current = Math.abs(diffX) > diffY * 1.5;
    }
    
    // Update visual offset for horizontal swipes
    if (isHorizontalSwipe.current) {
      // Limit the offset and add resistance at edges
      const maxOffset = 100;
      const resistedOffset = diffX * 0.4;
      setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, resistedOffset)));
    }
    
    // Cancel long press on any movement
    handleLongPressMove();
  };

  const handleDaySwipeEnd = () => {
    const diff = daySwipeStartX.current - daySwipeEndX.current;
    const minSwipeDistance = 50;
    
    if (isHorizontalSwipe.current && Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && canGoNext) {
        // Swipe left - next day (more recent)
        changeDate('left');
      } else if (diff < 0 && canGoPrev) {
        // Swipe right - previous day (older)
        changeDate('right');
      }
    }
    
    // Reset offset with animation
    setSwipeOffset(0);
    daySwipeStartX.current = 0;
    daySwipeEndX.current = 0;
  };

  const handleItemClick = (eventId: string) => {
    // If long press was triggered, don't toggle on click
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    // Hide delete if showing
    if (activeEventId === eventId) {
      setActiveEventId(null);
    }
  };
  
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.time);
    return isSameDay(eventDate, selectedDate);
  }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const today = new Date();
  const sevenDaysAgo = subDays(today, 6);
  
  const canGoNext = addDays(selectedDate, 1) <= today;
  const canGoPrev = subDays(selectedDate, 1) >= sevenDaysAgo;

  // Calculate which days have entries for the calendar
  const daysWithEntries = useMemo(() => {
    return events.map(event => startOfDay(new Date(event.time)));
  }, [events]);

  const [calendarOpen, setCalendarOpen] = useState(false);

  const changeDate = (direction: 'left' | 'right') => {
    if (direction === 'left' && !canGoNext) return;
    if (direction === 'right' && !canGoPrev) return;
    
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

  // Handle clicks outside the drawer to snap to default
  const handleOutsideClick = () => {
    if (snap === 0.9) {
      setSnap(0.2);
    }
  };

  return (
    <>
      {/* Invisible overlay to catch clicks outside drawer when expanded */}
      {snap === 0.9 && !eventSheetOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleOutsideClick}
        />
      )}
      <Drawer 
        open={true} 
        dismissible={false}
        modal={false}
        snapPoints={[0.2, 0.9]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
      <DrawerContent className="bg-black border-black flex flex-col h-full">
        <DrawerHeader 
          className="sticky top-0 bg-black z-10 pb-4 cursor-pointer" 
          onClick={toggleSnapPoint}
        >
          <div className="flex items-center justify-between">
            {showTrends ? (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTrends(false); }} 
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <ArrowLeft size={24} className="text-white" />
                </button>
                <DrawerTitle className="text-center text-[14px] text-white leading-6">
                  Trend-Analyse
                </DrawerTitle>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTrends(false); }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <TrendingUp size={20} className="text-[#5AD940]" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 w-[56px]">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {canGoPrev ? (
                      <button onClick={(e) => { e.stopPropagation(); changeDate('right'); }} className="flex items-center justify-center">
                        <ArrowLeft size={24} className="text-white" />
                      </button>
                    ) : (
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
                            <CalendarIcon size={20} className="text-white" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black border-white/30" align="start" onClick={(e) => e.stopPropagation()}>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setSelectedDate(date);
                                setCalendarOpen(false);
                              }
                            }}
                            disabled={(date) => date > today}
                            modifiers={{ hasEntry: daysWithEntries }}
                            modifiersClassNames={{ 
                              hasEntry: 'has-entry'
                            }}
                            className="pointer-events-auto bg-black text-white [&_.has-entry]:after:content-[''] [&_.has-entry]:after:absolute [&_.has-entry]:after:bottom-1 [&_.has-entry]:after:left-1/2 [&_.has-entry]:after:-translate-x-1/2 [&_.has-entry]:after:w-1 [&_.has-entry]:after:h-1 [&_.has-entry]:after:bg-[#5AD940] [&_.has-entry]:after:rounded-full [&_.has-entry]:relative [&_button]:text-white [&_.rdp-head_cell]:text-white/60 [&_.rdp-caption]:text-white [&_.rdp-nav_button]:text-white [&_.rdp-nav_button]:hover:bg-white/20 [&_.rdp-day_selected]:bg-[#5AD940] [&_.rdp-day_selected]:text-black"
                            locale={de}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                <DrawerTitle className="text-center text-[14px] text-white leading-6 flex-1">
                  {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                </DrawerTitle>
                <div className="flex items-center gap-2 w-[56px] justify-end">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {canGoNext && (
                      <button onClick={(e) => { e.stopPropagation(); changeDate('left'); }} className="flex items-center justify-center">
                        <ArrowRight size={24} className="text-white" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowTrends(true); setSnap(0.9); }} 
                    className="w-6 h-6 flex items-center justify-center"
                  >
                    <TrendingUp size={20} className="text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        </DrawerHeader>
        <div 
          ref={scrollContainerRef} 
          className="px-4 pb-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0"
          data-vaul-no-drag
          onTouchStart={(e) => !showTrends && handleDaySwipeStart(e)}
          onTouchMove={(e) => !showTrends && handleDaySwipeMove(e)}
          onTouchEnd={() => !showTrends && handleDaySwipeEnd()}
        >
          {showTrends ? (
            <div data-vaul-no-drag>
              <TrendAnalysis events={events} />
            </div>
          ) : (
            <div 
              className={`min-h-full ${
                slideDirection === 'left' ? 'opacity-0 -translate-x-4 transition-all duration-150' : 
                slideDirection === 'right' ? 'opacity-0 translate-x-4 transition-all duration-150' : 
                swipeOffset === 0 ? 'opacity-100 translate-x-0 transition-all duration-200' : 'opacity-100'
              }`}
              style={{ 
                transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
                opacity: swipeOffset !== 0 ? 1 - Math.abs(swipeOffset) / 200 : undefined
              }}
            >
              {filteredEvents.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <p className="text-center text-[14px] text-white/60">
                    Keine Einträge
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-20">
                  {filteredEvents.map((event) => {
                    const isActive = activeEventId === event.id;
                    return (
                      <div key={event.id} className="flex w-full gap-2">
                        <div
                          className="flex-1 flex items-center justify-between p-3 bg-black border border-white/30 rounded-lg overflow-hidden cursor-pointer select-none"
                          onClick={() => handleItemClick(event.id)}
                          onTouchStart={() => handleLongPressStart(event.id)}
                          onTouchMove={handleLongPressMove}
                          onTouchEnd={handleLongPressEnd}
                          onMouseDown={() => handleLongPressStart(event.id)}
                          onMouseMove={handleLongPressMove}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                        >
                          <span className="text-[14px] text-white whitespace-nowrap flex items-center gap-2">
                            <span>{event.type === 'pipi' ? '💦' : event.type === 'stuhlgang' ? '💩' : event.type === 'phwert' ? '🧪' : '🏋️'}</span>
                            <span>
                              {event.type === 'pipi' && 'Pipi'}
                              {event.type === 'stuhlgang' && 'Stuhlgang'}
                              {event.type === 'gewicht' && (
                                <>
                                  Gewicht: <span className={event.weight_value && isWeightOutOfBounds(Number(event.weight_value), new Date(event.time)) ? 'text-red-500' : ''}>{event.weight_value ? `${event.weight_value} kg` : '-'}</span>
                                </>
                              )}
                              {event.type === 'phwert' && (
                                <>
                                  pH-Wert: <span className={['5,6', '5,9', '6,2', '7,4', '7,7', '8,0'].includes(event.ph_value || '') ? 'text-red-500' : 'text-white'}>{event.ph_value || '-'}</span>
                                </>
                              )}
                            </span>
                          </span>
                          <span className="text-[14px] text-white whitespace-nowrap">
                            {format(new Date(event.time), 'HH:mm')} Uhr
                          </span>
                        </div>
                        {isActive && (
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="bg-red-500 flex items-center justify-center text-[14px] text-white rounded-lg px-4 animate-fade-in"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
};

export default CalendarView;