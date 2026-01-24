import { useState, useEffect, useRef } from 'react';
import EventSheet from '@/components/EventSheet';
import CalendarView from '@/components/CalendarView';
import TagesplanOverlay from '@/components/TagesplanOverlay';
import AnomalyAlerts from '@/components/AnomalyAlerts';
import GassiSettingsSheet from '@/components/GassiSettingsSheet';
import { getEvents, Event } from '@/lib/events';
import { detectAnomalies, Anomaly } from '@/lib/anomalyDetection';
import { getSettings, getCachedSettings, CountdownMode } from '@/lib/settings';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { initializeNotifications, scheduleWalkReminder, cancelWalkReminders, showNotification, setWeightNotificationClickHandler } from '@/lib/notifications';
import { getNickname, setNickname, hasNickname } from '@/lib/nickname';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import dogInCar from '@/assets/dog-in-car.png';
import dalmatianHeader from '@/assets/dalmatian-header.png';

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
  const [showGassiSettings, setShowGassiSettings] = useState(false);
  const [preselectedEventType, setPreselectedEventType] = useState<'pipi' | 'stuhlgang' | 'phwert' | 'gewicht' | undefined>(undefined);
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
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
        setTimeDisplay(`${minutes.toString().padStart(2, '0')}min`);
      } else {
        setTimeDisplay(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}min`);
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
        setTimeDisplay(`${minutes.toString().padStart(2, '0')}min`);
      } else {
        setTimeDisplay(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}min`);
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
    // Check if nickname is set
    if (!hasNickname()) {
      setShowNicknamePrompt(true);
    }

    // Initialize notifications
    initializeNotifications();
    
    // Set up weight notification click handler
    setWeightNotificationClickHandler(() => {
      setPreselectedEventType('gewicht');
      setEventSheetOpen(true);
    });
    
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
          className={`w-full bg-white/20 backdrop-blur-[8px] rounded-[16px] border border-[#FFFEF5]/40 flex flex-col items-center justify-center py-10 shadow-[0_0_16px_rgba(0,0,0,0.08)] transition-none ${showCard ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} 
          style={{ 
            animationFillMode: 'backwards', 
            WebkitUserSelect: 'none', 
            WebkitTouchCallout: 'none',
            userSelect: 'none',
            touchAction: 'manipulation'
          }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            // Prevent default to stop text selection on long press
            if (e.pointerType === 'touch') {
              longPressTimer.current = setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate(10);
                setShowGassiSettings(true);
              }, 500);
            }
          }}
          onPointerUp={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }}
          onPointerCancel={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }}
          onPointerMove={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }}
        >
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
        onOpenChange={(open) => {
          setEventSheetOpen(open);
          if (!open) setPreselectedEventType(undefined);
        }}
        onEventAdded={() => {
          loadEvents();
          setShowDogAnimation(true);
          setPreselectedEventType(undefined);
          // Force CalendarView remount to ensure drawer is visible
          setTimeout(() => setCalendarKey(k => k + 1), 200);
        }}
        preselectedType={preselectedEventType}
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

      {/* Nickname prompt drawer - must be highest z-index */}
      <Drawer open={showNicknamePrompt} onOpenChange={setShowNicknamePrompt} modal={true}>
        <DrawerContent className="bg-black border-black px-4 pb-8" style={{ zIndex: 9999 }}>
          <DrawerHeader className="pb-4">
            <DrawerTitle className="text-white text-center text-[14px]">Wie heißt du?</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4" data-vaul-no-drag>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="Dein Name"
              className="w-full h-12 bg-transparent border border-white/30 text-white text-center rounded-[4px] text-[14px] placeholder:text-white/50 outline-none focus:border-white/50"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const name = nicknameInput.trim();
                if (name) {
                  setNickname(name);
                  setNicknameInput('');
                  setShowNicknamePrompt(false);
                }
              }}
              disabled={!nicknameInput.trim()}
              className="w-full h-12 text-[14px] bg-white text-black hover:bg-white/90 disabled:bg-white disabled:text-black/50 disabled:opacity-100 rounded-full cursor-pointer"
            >
              Los geht's
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Index;
