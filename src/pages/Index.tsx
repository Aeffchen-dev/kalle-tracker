import { useState, useEffect, useRef } from 'react';
import EventSheet from '@/components/EventSheet';
import CalendarView from '@/components/CalendarView';
import { getEvents, Event } from '@/lib/events';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { PawPrint } from 'lucide-react';
import dogOnBike from '@/assets/dog-on-bike.png';

const Index = () => {
  const [timeDisplay, setTimeDisplay] = useState('00.00.00');
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [showDogAnimation, setShowDogAnimation] = useState(false);
  const eventsRef = useRef<Event[]>([]);

  const calculateTimeDisplay = () => {
    const eventList = eventsRef.current;
    if (eventList.length === 0) {
      setTimeDisplay('00.00.00');
      return;
    }

    const sortedEvents = [...eventList].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    const lastEvent = sortedEvents[0];
    const lastEventTime = new Date(lastEvent.time);

    const now = new Date();
    const elapsed = now.getTime() - lastEventTime.getTime();
    
    if (elapsed <= 0) {
      setTimeDisplay('00.00.00');
      return;
    }
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    setTimeDisplay(`${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}`);
  };

  const loadEvents = async () => {
    const fetchedEvents = await getEvents();
    eventsRef.current = fetchedEvents;
    calculateTimeDisplay();
  };

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
    <div className="h-dvh flex flex-col bg-transparent relative overflow-hidden">
      
      {/* Header */}
      <header className="p-4 flex justify-between items-center relative z-10">
        <span className="text-[14px] uppercase flex items-center">
          Kalle
          <span className="relative flex items-center ml-1">
            <PawPrint 
              size={14} 
              className="fill-black"
              style={{ transform: 'rotate(10deg)' }}
            />
          </span>
        </span>
        <h1 className="text-[14px] uppercase">Tracker</h1>
      </header>

      {/* Main countdown area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pb-[20vh] px-4">
        <div className="w-full bg-white/15 backdrop-blur-[4px] rounded-[16px] border border-white/40 flex flex-col items-center justify-center py-12">
          <div className="text-[56px] md:text-[72px] leading-none">
            {timeDisplay}
          </div>
          <button
            onClick={() => setEventSheetOpen(true)}
            className="mt-4 text-[14px] h-10 px-6 rounded-[999px] bg-black text-white flex items-center justify-center"
          >
            Eintrag hinzufügen
          </button>
        </div>
      </main>

      {/* Always visible calendar sheet */}
      <CalendarView />

      {/* Dog animation */}
      {showDogAnimation && (
        <img
          src={dogOnBike}
          alt="Dog on bike"
          className="fixed z-50 h-[120px] w-auto pointer-events-none animate-dog-ride"
          style={{ bottom: '20vh' }}
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
        }}
      />
    </div>
  );
};

export default Index;
