import { useState, useEffect, useRef } from 'react';
import EventSheet from '@/components/EventSheet';
import CalendarView from '@/components/CalendarView';
import TagesplanOverlay from '@/components/TagesplanOverlay';
import { getEvents, Event } from '@/lib/events';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import dogInCar from '@/assets/dog-in-car.png';
import dalmatianHeader from '@/assets/dalmatian-header.png';
import { useToast } from '@/hooks/use-toast';


const Index = () => {
  const [timeDisplay, setTimeDisplay] = useState('00min');
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [showDogAnimation, setShowDogAnimation] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  
  const [imageLoaded, setImageLoaded] = useState(true); // Start true since static loader already showed it
  const [isLoading, setIsLoading] = useState(true);
  const [showCard, setShowCard] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTagesplan, setShowTagesplan] = useState(false);
  const eventsRef = useRef<Event[]>([]);

  // Remove static loader on mount to prevent flicker
  useEffect(() => {
    const staticLoader = document.getElementById('static-loader');
    if (staticLoader) {
      staticLoader.remove();
    }
  }, []);

  const calculateTimeDisplay = () => {
    const eventList = eventsRef.current;
    // Only count pipi and stuhlgang for the countdown, not gewicht/phwert
    const relevantEvents = eventList.filter(e => e.type === 'pipi' || e.type === 'stuhlgang');
    
    if (relevantEvents.length === 0) {
      setTimeDisplay('00min');
      return;
    }

    const sortedEvents = [...relevantEvents].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    const lastEvent = sortedEvents[0];
    const lastEventTime = new Date(lastEvent.time);

    const now = new Date();
    const elapsed = now.getTime() - lastEventTime.getTime();
    
    if (elapsed <= 0) {
      setTimeDisplay('00min');
      return;
    }
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      setTimeDisplay(`${minutes.toString().padStart(2, '0')}min`);
    } else {
      setTimeDisplay(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}min`);
    }
  };

  const loadEvents = async () => {
    const result = await getEvents();
    eventsRef.current = result.events;
    calculateTimeDisplay();
  };

  // Loading animation sequence (min 1s loading after image loads)
  useEffect(() => {
    if (!imageLoaded) return;
    
    const timer1 = setTimeout(() => {
      setIsLoading(false);
      setShowCard(true);
    }, 1000);

    const timer2 = setTimeout(() => {
      setShowCalendar(true);
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [imageLoaded]);

  // Initial load and realtime subscription
  useEffect(() => {
    loadEvents();
    
    const channel = supabase
      .channel('events-changes')
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

  // Timer interval - runs every second
  useEffect(() => {
    const interval = setInterval(() => {
      calculateTimeDisplay();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-transparent relative pb-[env(safe-area-inset-bottom)]">
      

      {/* Header */}
      <header className={`p-4 flex justify-between items-start relative z-10 transition-opacity duration-500 ${showCard ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={() => {
            setShowDogAnimation(true);
          }}
          className="cursor-pointer -mt-2 -ml-[18px] relative"
        >
          <img 
            src={dalmatianHeader} 
            alt="Kalle" 
            className="h-[100px] w-auto relative z-10"
          />
        </button>
        <button 
          onClick={() => setShowTagesplan(true)}
          className="text-[14px] bg-white/20 backdrop-blur-[8px] text-black border border-[#FFFEF5]/40 rounded-full py-[2px] px-[8px] cursor-pointer mt-2"
        >
          Tagesplan
        </button>
      </header>

      {/* Main countdown area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pb-[calc(20vh+40px)] px-4">
        <div className={`w-full bg-white/20 backdrop-blur-[8px] rounded-[16px] border border-[#FFFEF5]/40 flex flex-col items-center justify-center py-10 shadow-[0_0_16px_rgba(0,0,0,0.08)] transition-none ${showCard ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} style={{ animationFillMode: 'backwards' }}>
          <p className="text-[14px] mb-2">Ich war zuletzt draußen vor</p>
          <button 
            onClick={() => setEventSheetOpen(true)}
            className="text-[48px] md:text-[64px] leading-none cursor-pointer tabular-nums"
          >
            {timeDisplay}
          </button>
          <button
            onClick={() => setEventSheetOpen(true)}
            className="mt-4 text-[14px] h-10 px-6 rounded-[999px] bg-[#5AD940] text-black flex items-center justify-center"
          >
            Eintrag hinzufügen
          </button>
        </div>
      </main>

      {/* Always visible calendar sheet - hidden when Tagesplan is open */}
      {showCalendar && !showTagesplan && <CalendarView key={calendarKey} eventSheetOpen={eventSheetOpen} />}

      {/* Dog animation */}
      {showDogAnimation && (
        <img
          src={dogInCar}
          alt="Dog in car"
          className="fixed z-50 h-[133px] w-auto pointer-events-none animate-dog-ride"
          style={{ bottom: 'calc(20vh - 30px)' }}
          onAnimationEnd={() => setShowDogAnimation(false)}
        />
      )}

      {/* Event sheet opens on top */}
      <EventSheet
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        onEventAdded={() => {
          loadEvents();
          setShowDogAnimation(true);
          // Force CalendarView remount to ensure drawer is visible
          setTimeout(() => setCalendarKey(k => k + 1), 200);
        }}
      />

      {/* Tagesplan overlay */}
      <TagesplanOverlay 
        isOpen={showTagesplan} 
        onClose={() => setShowTagesplan(false)} 
      />
    </div>
  );
};

export default Index;
