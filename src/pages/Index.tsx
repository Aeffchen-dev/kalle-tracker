import { useState, useEffect, useCallback } from 'react';
import EventSheet from '@/components/EventSheet';
import CalendarView from '@/components/CalendarView';
import { getEvents } from '@/lib/cookies';

const Index = () => {
  const [timeDisplay, setTimeDisplay] = useState('00.00');
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const updateCountdown = useCallback(() => {
    const events = getEvents();
    
    if (events.length === 0) {
      setTimeDisplay('00.00.00');
      return;
    }

    // Find the most recent event
    const sortedEvents = [...events].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    const lastEvent = sortedEvents[0];
    const lastEventTime = new Date(lastEvent.time);

    const now = new Date();
    const elapsed = now.getTime() - lastEventTime.getTime();
    
    // If elapsed is negative or very small, show 00.00.00
    if (elapsed <= 0) {
      setTimeDisplay('00.00.00');
      return;
    }
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    setTimeDisplay(`${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  const handleEventAdded = () => {
    // Small delay to ensure storage is updated
    setTimeout(updateCountdown, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Dalmatian spots pattern */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute w-8 h-10 bg-[#3d2b1f] rounded-full top-[5%] left-[8%]" />
        <div className="absolute w-10 h-8 bg-[#3d2b1f] rounded-full top-[3%] left-[75%]" />
        <div className="absolute w-12 h-9 bg-[#3d2b1f] rounded-full top-[15%] left-[45%]" />
        <div className="absolute w-7 h-11 bg-[#3d2b1f] rounded-full top-[20%] left-[85%]" />
        <div className="absolute w-9 h-7 bg-[#3d2b1f] rounded-full top-[35%] left-[12%]" />
        <div className="absolute w-11 h-8 bg-[#3d2b1f] rounded-full top-[45%] left-[60%]" />
        <div className="absolute w-8 h-6 bg-[#3d2b1f] rounded-full top-[55%] left-[25%]" />
        <div className="absolute w-6 h-9 bg-[#3d2b1f] rounded-full top-[65%] left-[80%]" />
        <div className="absolute w-10 h-7 bg-[#3d2b1f] rounded-full top-[75%] left-[5%]" />
        <div className="absolute w-7 h-10 bg-[#3d2b1f] rounded-full top-[85%] left-[55%]" />
        <div className="absolute w-9 h-8 bg-[#3d2b1f] rounded-full top-[92%] left-[30%]" />
        <div className="absolute w-8 h-7 bg-[#3d2b1f] rounded-full top-[88%] left-[90%]" />
      </div>
      
      {/* Header */}
      <header className="p-4 flex justify-between items-center relative z-10">
        <span className="text-[14px] uppercase">Kalle</span>
        <h1 className="text-[14px] uppercase">Tracker</h1>
      </header>

      {/* Main countdown area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="text-[40px] leading-none">
          {timeDisplay}
        </div>
        <button
          onClick={() => setEventSheetOpen(true)}
          className="mt-4 text-[14px]"
        >
          Ereignis hinzufügen
        </button>
      </main>

      {/* Footer link */}
      <footer className="p-4 relative z-10">
        <button
          onClick={() => setCalendarOpen(true)}
          className="w-full text-center text-[14px]"
        >
          Kalender ansehen
        </button>
      </footer>

      {/* Sheets */}
      <EventSheet
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        onEventAdded={handleEventAdded}
      />
      <CalendarView
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
      />
    </div>
  );
};

export default Index;
