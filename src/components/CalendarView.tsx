import { useState, useRef, TouchEvent, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, deleteEvent, Event } from '@/lib/events';
import { format, subDays, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type SnapPoint = number | string;

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false);
  const [swipeStartOffset, setSwipeStartOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SnapPoint | null>(0.2);
  
  const toggleSnapPoint = () => {
    setSnap(snap === 0.2 ? 0.9 : 0.2);
  };
  const itemTouchStartX = useRef<number>(0);
  const itemTouchStartY = useRef<number>(0);
  const swipeDecided = useRef<boolean>(false);
  const touchJustEnded = useRef<boolean>(false);
  const wasActiveOnTouchStart = useRef<boolean>(false);

  const loadEvents = async () => {
    const fetchedEvents = await getEvents();
    setEvents(fetchedEvents);
  };

  useEffect(() => {
    loadEvents();
    setSelectedDate(new Date());
  }, []);

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
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleItemTouchStart = (e: TouchEvent, eventId: string) => {
    itemTouchStartX.current = e.touches[0].clientX;
    itemTouchStartY.current = e.touches[0].clientY;
    swipeDecided.current = false;
    setIsHorizontalSwipe(false);
    // Store if this item was already active (showing delete)
    wasActiveOnTouchStart.current = activeEventId === eventId;
    setSwipeStartOffset(wasActiveOnTouchStart.current ? 80 : 0);
    setSwipingId(eventId);
    setIsAnimating(false);
  };

  const handleItemTouchMove = (e: TouchEvent) => {
    if (!swipingId) return;
    
    const diffX = itemTouchStartX.current - e.touches[0].clientX;
    const diffY = Math.abs(e.touches[0].clientY - itemTouchStartY.current);
    
    // Decide direction once after minimum movement
    if (!swipeDecided.current && (Math.abs(diffX) > 10 || diffY > 10)) {
      swipeDecided.current = true;
      const isHorizontal = Math.abs(diffX) > diffY * 1.5;
      setIsHorizontalSwipe(isHorizontal);
      if (!isHorizontal) {
        setSwipingId(null);
        return;
      }
    }
    
    if (!isHorizontalSwipe && swipeDecided.current) return;
    
    e.preventDefault();
    const newOffset = swipeStartOffset + diffX;
    setSwipeOffset(Math.max(0, Math.min(newOffset, 80)));
    setActiveEventId(swipingId);
  };

  const handleItemTouchEnd = () => {
    touchJustEnded.current = true;
    setTimeout(() => { touchJustEnded.current = false; }, 300);
    
    setIsAnimating(true);
    if (swipeOffset > 60) {
      setSwipeOffset(80);
      setActiveEventId(swipingId);
    } else if (swipeDecided.current) {
      setSwipeOffset(0);
      setTimeout(() => {
        setActiveEventId(null);
        setSwipingId(null);
        setIsAnimating(false);
      }, 200);
    } else {
      // Tap on touch device - toggle delete using ref
      if (wasActiveOnTouchStart.current) {
        // Was already showing, hide it
        setSwipeOffset(0);
        setTimeout(() => {
          setActiveEventId(null);
          setSwipingId(null);
          setIsAnimating(false);
        }, 200);
      } else {
        // Show delete
        setActiveEventId(swipingId);
        setSwipeOffset(80);
        setTimeout(() => setIsAnimating(false), 200);
      }
    }
    setIsHorizontalSwipe(false);
    swipeDecided.current = false;
  };

  const handleItemClick = (eventId: string) => {
    console.log('click - eventId:', eventId, 'activeEventId:', activeEventId, 'touchJustEnded:', touchJustEnded.current);
    // Prevent click if touch just ended (mobile devices fire both)
    if (touchJustEnded.current) {
      console.log('click blocked - touchJustEnded');
      return;
    }
    
    setIsAnimating(true);
    // Toggle: if already showing delete for this item, hide it
    if (activeEventId === eventId) {
      console.log('click - hiding delete');
      setSwipeOffset(0);
      setTimeout(() => {
        setActiveEventId(null);
        setSwipingId(null);
        setIsAnimating(false);
      }, 200);
    } else {
      console.log('click - showing delete');
      // Show delete (also closes any other open item)
      setActiveEventId(eventId);
      setSwipingId(eventId);
      setSwipeOffset(80);
      setTimeout(() => setIsAnimating(false), 200);
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

  return (
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
            <div className="w-6 h-6 flex items-center justify-center">
              {canGoPrev && (
                <button onClick={(e) => { e.stopPropagation(); changeDate('right'); }} className="flex items-center justify-center">
                  <ArrowLeft size={24} className="text-white" />
                </button>
              )}
            </div>
            <DrawerTitle className="text-center text-[14px] text-white leading-6">
              {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
            </DrawerTitle>
            <div className="w-6 h-6 flex items-center justify-center">
              {canGoNext && (
                <button onClick={(e) => { e.stopPropagation(); changeDate('left'); }} className="flex items-center justify-center">
                  <ArrowRight size={24} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          <div 
            className={`transition-all duration-150 ${
              slideDirection === 'left' ? 'opacity-0 -translate-x-4' : 
              slideDirection === 'right' ? 'opacity-0 translate-x-4' : 
              'opacity-100 translate-x-0'
            }`}
          >
          {filteredEvents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <p className="text-center text-[14px] text-white/60">
                Keine Einträge
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-20">
              {filteredEvents.map((event) => {
                const isActive = activeEventId === event.id;
                const showDelete = isActive && (swipeOffset > 0 || isAnimating);
                return (
                  <div key={event.id} className="flex w-full">
                    <div
                      className={`flex items-center justify-between p-3 bg-black border border-white/30 overflow-hidden cursor-pointer ${isAnimating ? 'transition-all duration-200' : ''}`}
                      style={{ 
                        width: showDelete ? `calc(100% - ${swipeOffset}px)` : '100%',
                        borderTopLeftRadius: '0.5rem',
                        borderBottomLeftRadius: '0.5rem',
                        borderTopRightRadius: showDelete ? 0 : '0.5rem',
                        borderBottomRightRadius: showDelete ? 0 : '0.5rem',
                        borderRight: showDelete ? 'none' : undefined,
                      }}
                      onClick={() => handleItemClick(event.id)}
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
                    {showDelete && (
                      <button
                        onClick={() => handleDelete(event.id)}
                        className={`bg-red-500 flex items-center justify-center text-[14px] text-white rounded-r-lg overflow-hidden ${isAnimating ? 'transition-all duration-200' : ''}`}
                        style={{ width: swipeOffset }}
                      >
                        {swipeOffset > 50 && 'Löschen'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CalendarView;