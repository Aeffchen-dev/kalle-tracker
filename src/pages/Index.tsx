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
        {/* Large spots - organic blob shapes */}
        <div className="absolute w-12 h-14 bg-[#5c4033] top-[3%] left-[5%] rotate-12" style={{borderRadius: '60% 40% 55% 45% / 55% 60% 40% 45%'}} />
        <div className="absolute w-16 h-12 bg-[#5c4033] top-[8%] left-[70%] -rotate-6" style={{borderRadius: '45% 55% 40% 60% / 50% 45% 55% 50%'}} />
        <div className="absolute w-14 h-16 bg-[#5c4033] top-[18%] left-[35%] rotate-45" style={{borderRadius: '55% 45% 60% 40% / 45% 55% 45% 55%'}} />
        <div className="absolute w-13 h-15 bg-[#5c4033] top-[28%] left-[82%] -rotate-12" style={{borderRadius: '40% 60% 45% 55% / 60% 40% 55% 45%'}} />
        <div className="absolute w-15 h-12 bg-[#5c4033] top-[42%] left-[8%] rotate-30" style={{borderRadius: '50% 50% 45% 55% / 55% 45% 50% 50%'}} />
        <div className="absolute w-12 h-14 bg-[#5c4033] top-[52%] left-[65%] -rotate-20" style={{borderRadius: '65% 35% 50% 50% / 45% 55% 45% 55%'}} />
        <div className="absolute w-16 h-13 bg-[#5c4033] top-[68%] left-[20%] rotate-15" style={{borderRadius: '45% 55% 55% 45% / 50% 50% 50% 50%'}} />
        <div className="absolute w-13 h-16 bg-[#5c4033] top-[78%] left-[75%] -rotate-35" style={{borderRadius: '55% 45% 40% 60% / 60% 40% 55% 45%'}} />
        <div className="absolute w-14 h-12 bg-[#5c4033] top-[88%] left-[45%] rotate-25" style={{borderRadius: '40% 60% 50% 50% / 50% 50% 45% 55%'}} />
        
        {/* Medium spots */}
        <div className="absolute w-10 h-11 bg-[#5c4033] top-[12%] left-[18%] -rotate-15" style={{borderRadius: '55% 45% 60% 40% / 40% 60% 45% 55%'}} />
        <div className="absolute w-11 h-9 bg-[#5c4033] top-[6%] left-[48%] rotate-20" style={{borderRadius: '45% 55% 50% 50% / 55% 45% 55% 45%'}} />
        <div className="absolute w-9 h-11 bg-[#5c4033] top-[22%] left-[88%] -rotate-8" style={{borderRadius: '50% 50% 40% 60% / 60% 40% 50% 50%'}} />
        <div className="absolute w-10 h-9 bg-[#5c4033] top-[35%] left-[55%] rotate-35" style={{borderRadius: '60% 40% 55% 45% / 45% 55% 50% 50%'}} />
        <div className="absolute w-11 h-10 bg-[#5c4033] top-[48%] left-[30%] -rotate-25" style={{borderRadius: '45% 55% 45% 55% / 55% 45% 55% 45%'}} />
        <div className="absolute w-9 h-10 bg-[#5c4033] top-[58%] left-[92%] rotate-10" style={{borderRadius: '55% 45% 50% 50% / 50% 50% 45% 55%'}} />
        <div className="absolute w-10 h-11 bg-[#5c4033] top-[72%] left-[50%] -rotate-40" style={{borderRadius: '40% 60% 55% 45% / 55% 45% 60% 40%'}} />
        <div className="absolute w-11 h-9 bg-[#5c4033] top-[82%] left-[10%] rotate-5" style={{borderRadius: '50% 50% 45% 55% / 45% 55% 50% 50%'}} />
        <div className="absolute w-9 h-10 bg-[#5c4033] top-[95%] left-[85%] -rotate-18" style={{borderRadius: '55% 45% 60% 40% / 50% 50% 45% 55%'}} />
        
        {/* Small spots */}
        <div className="absolute w-7 h-8 bg-[#5c4033] top-[2%] left-[28%] rotate-8" style={{borderRadius: '60% 40% 50% 50% / 50% 50% 55% 45%'}} />
        <div className="absolute w-8 h-7 bg-[#5c4033] top-[15%] left-[60%] -rotate-12" style={{borderRadius: '45% 55% 55% 45% / 55% 45% 50% 50%'}} />
        <div className="absolute w-7 h-7 bg-[#5c4033] top-[25%] left-[3%] rotate-22" style={{borderRadius: '50% 50% 45% 55% / 45% 55% 55% 45%'}} />
        <div className="absolute w-8 h-8 bg-[#5c4033] top-[38%] left-[42%] -rotate-5" style={{borderRadius: '55% 45% 50% 50% / 50% 50% 45% 55%'}} />
        <div className="absolute w-7 h-8 bg-[#5c4033] top-[45%] left-[78%] rotate-15" style={{borderRadius: '45% 55% 60% 40% / 55% 45% 50% 50%'}} />
        <div className="absolute w-8 h-7 bg-[#5c4033] top-[62%] left-[38%] -rotate-28" style={{borderRadius: '50% 50% 45% 55% / 45% 55% 55% 45%'}} />
        <div className="absolute w-7 h-7 bg-[#5c4033] top-[75%] left-[62%] rotate-32" style={{borderRadius: '60% 40% 55% 45% / 50% 50% 50% 50%'}} />
        <div className="absolute w-8 h-8 bg-[#5c4033] top-[85%] left-[28%] -rotate-10" style={{borderRadius: '45% 55% 50% 50% / 55% 45% 45% 55%'}} />
        <div className="absolute w-7 h-8 bg-[#5c4033] top-[92%] left-[68%] rotate-18" style={{borderRadius: '55% 45% 45% 55% / 50% 50% 55% 45%'}} />
        
        {/* Extra small accent spots */}
        <div className="absolute w-4 h-5 bg-[#5c4033] top-[10%] left-[92%]" style={{borderRadius: '50% 50% 45% 55% / 55% 45% 50% 50%'}} />
        <div className="absolute w-5 h-4 bg-[#5c4033] top-[32%] left-[25%]" style={{borderRadius: '45% 55% 50% 50% / 50% 50% 55% 45%'}} />
        <div className="absolute w-4 h-4 bg-[#5c4033] top-[55%] left-[15%]" style={{borderRadius: '55% 45% 55% 45% / 45% 55% 45% 55%'}} />
        <div className="absolute w-5 h-5 bg-[#5c4033] top-[65%] left-[88%]" style={{borderRadius: '50% 50% 50% 50% / 55% 45% 55% 45%'}} />
        <div className="absolute w-4 h-5 bg-[#5c4033] top-[80%] left-[58%]" style={{borderRadius: '45% 55% 45% 55% / 50% 50% 50% 50%'}} />
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
