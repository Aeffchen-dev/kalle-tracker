import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import EventSheet from '@/components/EventSheet';
import CalendarView from '@/components/CalendarView';
import TagesplanOverlay from '@/components/TagesplanOverlay';
import AnomalyAlerts from '@/components/AnomalyAlerts';
import GassiSettingsSheet from '@/components/GassiSettingsSheet';
import { getEvents, Event } from '@/lib/events';
import { detectAnomalies, Anomaly } from '@/lib/anomalyDetection';
import { getSettings, getCachedSettings, CountdownMode } from '@/lib/settings';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { initializeNotifications, scheduleWalkReminder, cancelWalkReminders, showNotification } from '@/lib/notifications';
import dogInCar from '@/assets/dog-in-car.png';
import dalmatianHeader from '@/assets/dalmatian-header.png';

const Index = () => {
  const [timeDisplay, setTimeDisplay] = useState('00min');
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('count_up');
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [showDogAnimation, setShowDogAnimation] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  
  const [imageLoaded, setImageLoaded] = useState(true); // Start true since static loader already showed it
  const [isLoading, setIsLoading] = useState(true);
  const [showCard, setShowCard] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTagesplan, setShowTagesplan] = useState(false);
  const [showGassiSettings, setShowGassiSettings] = useState(false);
  const eventsRef = useRef<Event[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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
    
    const settings = getCachedSettings();
    setCountdownMode(settings.countdown_mode);
    
    if (settings.countdown_mode === 'count_down') {
      // Count down from walk interval
      const targetTime = new Date(lastEventTime.getTime() + settings.walk_interval_hours * 60 * 60 * 1000);
      const remaining = targetTime.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setTimeDisplay('00min');
        return;
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours === 0) {
        setTimeDisplay(`${minutes}min`);
      } else {
        setTimeDisplay(`${hours}h ${minutes}min`);
      }
    } else {
      // Count up from last entry (default)
      const elapsed = now.getTime() - lastEventTime.getTime();
      
      if (elapsed <= 0) {
        setTimeDisplay('00min');
        return;
      }
      
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours === 0) {
        setTimeDisplay(`${minutes}min`);
      } else {
        setTimeDisplay(`${hours}h ${minutes}min`);
      }
    }
  };

  const loadEvents = async () => {
    const result = await getEvents();
    eventsRef.current = result.events;
    calculateTimeDisplay();
    // Detect anomalies
    const detected = detectAnomalies(result.events);
    const filteredAnomalies = detected.filter(a => !dismissedAnomalies.has(a.id));
    setAnomalies(filteredAnomalies);
    
    // Schedule native notifications for walk reminders
    const walkReminder = filteredAnomalies.find(a => a.type === 'upcoming_break');
    if (walkReminder) {
      // Parse time from description (e.g., "Nächster Spaziergang um ca. 14:30 Uhr")
      const timeMatch = walkReminder.description.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
        
        // If time is in the past, schedule for tomorrow
        if (reminderTime <= now) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        await scheduleWalkReminder(reminderTime, walkReminder.title, walkReminder.description);
      }
    } else {
      // No walk reminder needed, cancel any scheduled
      await cancelWalkReminders();
    }
  };

  const handleDismissAnomaly = (id: string) => {
    setDismissedAnomalies(prev => new Set([...prev, id]));
    setAnomalies(prev => prev.filter(a => a.id !== id));
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
    // Initialize notifications
    initializeNotifications();
    
    // Load settings first, then events
    getSettings().then(() => loadEvents());
    
    const eventsChannel = supabase
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

    const settingsChannel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings'
        },
        () => {
          getSettings().then(() => loadEvents());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(settingsChannel);
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
            const hour = new Date().getHours();
            
            // Time-based greetings
            const morningPhrases = [
              'Guten Morgen!',
              'Aufstehen!',
              'Frühstück?',
              'Erst mal raus...',
            ];
            
            const afternoonPhrases = [
              'Mittagsschlaf?',
              'Noch ein Spaziergang?',
              'Langeweile...',
              'Spielen!',
            ];
            
            const eveningPhrases = [
              'Gute Nacht!',
              'Müde...',
              'Kuscheln?',
              'Letzte Runde?',
            ];
            
            // General phrases (any time)
            const generalPhrases = [
              'Wuff!',
              'Gassi?',
              'Leckerli!',
              'Bauch kraulen?',
              'Spielen!',
              'Hunger!',
              'Wasser?',
              'Kuscheln!',
              'Raus!',
              'Hallo!',
              'Was gibts?',
              'Langeweile...',
              'Stöckchen?',
              'Ball!',
              'Schnüffeln!',
            ];
            
            let phrases: string[];
            if (hour >= 5 && hour < 10) {
              phrases = [...morningPhrases, ...generalPhrases];
            } else if (hour >= 10 && hour < 18) {
              phrases = [...afternoonPhrases, ...generalPhrases];
            } else {
              phrases = [...eveningPhrases, ...generalPhrases];
            }
            
            const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
            setSpeechBubble(randomPhrase);
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
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pb-[calc(20vh+40px)] px-4 gap-3">
        <div 
          className={`w-full bg-white/20 backdrop-blur-[8px] rounded-[16px] border border-[#FFFEF5]/40 flex flex-col items-center justify-center py-10 shadow-[0_0_16px_rgba(0,0,0,0.08)] transition-none select-none relative ${showCard ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} 
          style={{ animationFillMode: 'backwards', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={(e) => {
            e.preventDefault();
            longPressTimer.current = setTimeout(() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setShowGassiSettings(true);
            }, 500);
          }}
          onTouchEnd={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }}
          onTouchMove={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }}
        >
          <button
            onClick={() => setShowGassiSettings(true)}
            className="absolute top-1 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Einstellungen"
          >
            <MoreHorizontal className="w-6 h-6 text-black" />
          </button>
          <p className="text-[14px] mb-2">
            {countdownMode === 'count_down' ? 'Kalle muss raus in' : 'Kalle war zuletzt draußen vor'}
          </p>
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
        
        {/* Anomaly alerts - only show if there are alerts */}
        {anomalies.length > 0 && showCard && (
          <div className={`w-full animate-fade-in-up`} style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
            <AnomalyAlerts 
              anomalies={anomalies} 
              onDismiss={handleDismissAnomaly}
              onGassiSettingsTap={() => setShowGassiSettings(true)}
            />
          </div>
        )}
      </main>

      {/* Always visible calendar sheet - hidden when Tagesplan is open */}
      {showCalendar && !showTagesplan && <CalendarView key={calendarKey} eventSheetOpen={eventSheetOpen} />}

      {/* Dog animation with speech bubble */}
      {showDogAnimation && (
        <div 
          className="fixed z-50 pointer-events-none animate-dog-ride"
          style={{ bottom: 'calc(20vh - 30px)' }}
          onAnimationEnd={() => {
            setShowDogAnimation(false);
            setSpeechBubble(null);
          }}
        >
          <img
            src={dogInCar}
            alt="Dog in car"
            className="h-[133px] w-auto"
          />
          {/* Speech bubble following the dog */}
          {speechBubble && (
            <div className="absolute left-[120px] top-[15px] bg-black text-white text-[10px] px-2 py-1.5 rounded-md whitespace-nowrap">
              {speechBubble}
              <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-black" />
            </div>
          )}
        </div>
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

      {/* Gassi settings sheet */}
      <GassiSettingsSheet 
        open={showGassiSettings} 
        onOpenChange={setShowGassiSettings}
        onSettingsChanged={() => loadEvents()}
      />
    </div>
  );
};

export default Index;
