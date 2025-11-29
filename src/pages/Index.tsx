import { useState, useEffect } from 'react';
import EventSheet from '@/components/EventSheet';
import CalendarView from '@/components/CalendarView';
import { getCountdownTarget, setCountdownTarget } from '@/lib/cookies';

const Index = () => {
  const [timeDisplay, setTimeDisplay] = useState('00.00');
  const [isCountingUp, setIsCountingUp] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const updateCountdown = () => {
    const target = getCountdownTarget();
    
    if (!target) {
      // Set initial countdown to 4 hours from now
      const initialTarget = new Date();
      initialTarget.setHours(initialTarget.getHours() + 4);
      setCountdownTarget(initialTarget);
      return;
    }

    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      // Count up
      setIsCountingUp(true);
      const elapsed = Math.abs(diff);
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      setTimeDisplay(`${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`);
    } else {
      // Count down
      setIsCountingUp(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeDisplay(`${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`);
    }
  };

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEventAdded = () => {
    updateCountdown();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <h1 className="text-center text-[14px]">Kalle 🐶 Tracking</h1>
      </header>

      {/* Main countdown area */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="text-[40px] leading-none">
          {isCountingUp ? '+' : ''}{timeDisplay}
        </div>
        <button
          onClick={() => setEventSheetOpen(true)}
          className="mt-4 text-[14px] underline underline-offset-2"
        >
          Ereignis hinzufügen
        </button>
      </main>

      {/* Footer link */}
      <footer className="p-4">
        <button
          onClick={() => setCalendarOpen(true)}
          className="w-full text-center text-[14px] underline underline-offset-2"
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
