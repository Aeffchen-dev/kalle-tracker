import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { MoreHorizontal } from 'lucide-react';
import rainIcon from '@/assets/rain-umbrella.png';
import knittedHat from '@/assets/winter-clothes-icon.png';
import umbrellaIcon from '@/assets/rain-umbrella-icon.png';
import thermometerIcon from '@/assets/thermometer-icon.png';
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

const weatherCodeToEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 67) return '🌧️';
  if (code <= 75) return '❄️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '❄️';
  if (code <= 99) return '⛈️';
  return '🌡️';
};

const weatherCodeToLabel = (code: number): string => {
  if (code === 0) return 'Sonnig';
  if (code <= 3) return 'Bewölkt';
  if (code <= 48) return 'Nebel';
  if (code <= 55) return 'Nieselregen';
  if (code <= 65) return 'Regen';
  if (code <= 67) return 'Gefrierender Regen';
  if (code <= 75) return 'Schnee';
  if (code <= 77) return 'Schneegriesel';
  if (code <= 82) return 'Regenschauer';
  if (code <= 86) return 'Schneeschauer';
  if (code <= 99) return 'Gewitter';
  return 'Unbekannt';
};

const isRainCode = (code: number): boolean => {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
};

type DayForecast = {
  date: string;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  precipProbability: number;
  precipSum: number;
};

const Index = () => {
  const [timeDisplay, setTimeDisplay] = useState('00min');
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('count_up');
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [showDogAnimation, setShowDogAnimation] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  
  const [imageLoaded, setImageLoaded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showCard, setShowCard] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTagesplan, setShowTagesplan] = useState(false);
  const [showGassiSettings, setShowGassiSettings] = useState(false);
  const eventsRef = useRef<Event[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [weatherEmoji, setWeatherEmoji] = useState('🌡️');
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [currentWeatherCode, setCurrentWeatherCode] = useState<number | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [showWeather, setShowWeather] = useState(false);

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

    // Fetch weather for current location
    const fetchWeather = (lat: number, lon: number) => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=14`)
        .then(r => r.json())
        .then(data => {
          if (data.current) {
            setWeatherTemp(Math.round(data.current.temperature_2m));
            setWeatherEmoji(weatherCodeToEmoji(data.current.weather_code));
            setCurrentWeatherCode(data.current.weather_code);
          }
          if (data.daily) {
            const days: DayForecast[] = data.daily.time.map((date: string, i: number) => ({
              date,
              tempMin: Math.round(data.daily.temperature_2m_min[i]),
              tempMax: Math.round(data.daily.temperature_2m_max[i]),
              weatherCode: data.daily.weather_code[i],
              precipProbability: Math.round(data.daily.precipitation_probability_max?.[i] ?? 0),
              precipSum: Math.round((data.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
            }));
            setForecast(days);
          }
        })
        .catch(() => {});
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(52.52, 13.41) // Fallback: Berlin
      );
    } else {
      fetchWeather(52.52, 13.41);
    }
    
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
    <div className="min-h-dvh flex flex-col bg-transparent relative">
      

      {/* Header */}
      <header className={`pt-[12px] px-4 pb-4 flex justify-between items-start relative z-10 transition-opacity duration-500 md:px-[2.5vw] md:pt-[1.7vw] md:pb-[1.7vw] lg:px-[2vw] lg:pt-[1.4vw] lg:pb-[1.4vw] ${showCard ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-start gap-2 md:gap-[0.85vw] lg:gap-[0.7vw]">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-[14px] md:text-[1.9vw] lg:text-[1.5vw] bg-white/20 backdrop-blur-[8px] text-black border border-[#FFFEF5]/40 rounded-full py-[4px] px-[12px] md:py-[0.68vw] md:px-[1.7vw] lg:py-[0.5vw] lg:px-[1.4vw] cursor-pointer mt-2 md:mt-[0.85vw] lg:mt-[0.7vw]"
          >
            <span className="flex items-center gap-1.5 md:gap-[0.85vw] lg:gap-[0.7vw]"><span className="text-[20px] md:text-[2.55vw] lg:text-[2vw]">🐶</span> <span>Kalle</span></span>
          </button>
          {weatherTemp !== null && (
            <button 
              onClick={() => setShowWeather(true)}
              className="text-[14px] md:text-[1.9vw] lg:text-[1.5vw] bg-white/20 backdrop-blur-[8px] text-black border border-[#FFFEF5]/40 rounded-full py-[4px] px-[12px] md:py-[0.68vw] md:px-[1.7vw] lg:py-[0.5vw] lg:px-[1.4vw] cursor-pointer mt-2 md:mt-[0.85vw] lg:mt-[0.7vw]"
            >
              <span className="flex items-center gap-1.5 md:gap-[0.85vw] lg:gap-[0.7vw]"><span className="text-[20px] md:text-[2.55vw] lg:text-[2vw]">{weatherEmoji}</span> <span>{weatherTemp}°</span>{weatherTemp !== null && weatherTemp > 29 ? <img src={thermometerIcon} alt="heat" className="w-[12px] h-[12px] md:w-[1.4vw] md:h-[1.4vw] lg:w-[1.1vw] lg:h-[1.1vw] -ml-[4px]" /> : weatherTemp !== null && weatherTemp <= 7 ? <img src={knittedHat} alt="cold" className="w-[12px] h-[12px] md:w-[1.4vw] md:h-[1.4vw] lg:w-[1.1vw] lg:h-[1.1vw] -ml-[4px]" /> : currentWeatherCode !== null && isRainCode(currentWeatherCode) && <img src={umbrellaIcon} alt="rain" className="w-[11px] h-[11px] md:w-[1.4vw] md:h-[1.4vw] lg:w-[1.1vw] lg:h-[1.1vw] -ml-[2px]" />}</span>
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowTagesplan(true)}
          className="text-[14px] md:text-[1.9vw] lg:text-[1.5vw] bg-white/20 backdrop-blur-[8px] text-black border border-[#FFFEF5]/40 rounded-full py-[10px] px-[17px] md:py-[1vw] md:px-[1.7vw] lg:py-[0.78vw] lg:px-[1.4vw] cursor-pointer mt-2 md:mt-[0.85vw] lg:mt-[0.7vw]"
        >
          Info
        </button>
      </header>

      {/* Main countdown area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 pb-[calc(20vh+40px)] px-4 gap-3 mx-auto w-full md:max-w-[60vw] lg:max-w-[50vw]">
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

      {/* Weather forecast drawer */}
      <Drawer open={showWeather} onOpenChange={setShowWeather}>
        <DrawerContent className="bg-spot rounded-t-[24px] border-0 max-h-[95dvh] z-[60] lg:max-w-[80vw] lg:mx-auto">
          <div className="pt-4 px-4 pb-4">
            <h2 className="text-white text-[14px] leading-6 font-semibold text-center">
              Wettervorhersage
            </h2>
          </div>
          <div className="pl-2 pr-4 pb-20 overflow-y-auto flex flex-col gap-2">
            <div className="flex flex-col gap-2">
            {forecast.filter(day => new Date(day.date + 'T00:00:00') >= new Date(format(new Date(), 'yyyy-MM-dd') + 'T00:00:00')).slice(0, 7).map((day) => {
               const date = new Date(day.date + 'T00:00:00');
               const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <React.Fragment key={day.date}>
                 {(() => {
                   const hasHeat = weatherTemp !== null && weatherTemp > 29;
                    const hasInfoBox = isToday && (hasHeat || weatherTemp !== null && weatherTemp <= 7 || currentWeatherCode !== null && isRainCode(currentWeatherCode));
                    const hasCold = weatherTemp !== null && weatherTemp <= 7;
                    const hasRain = currentWeatherCode !== null && isRainCode(currentWeatherCode);
                    const infoBoxCount = (hasHeat ? 1 : 0) + (hasCold ? 1 : 0) + (hasRain ? 1 : 0);
                   return (<>
                 <div className={`rounded-lg pl-0 pr-[16px] p-3 bg-white/[0.06] ${hasInfoBox ? 'rounded-b-none' : ''}`}>
                  <div className="flex items-center">
                    <span className="w-[36px] shrink-0 flex items-center justify-center mr-2 text-[12px] leading-[20px] text-white/50">
                      {format(date, 'EEE', { locale: de })}
                    </span>
                    <span className="text-[20px] shrink-0 mr-2 leading-[20px]">{isToday && currentWeatherCode !== null ? weatherCodeToEmoji(currentWeatherCode) : weatherCodeToEmoji(day.weatherCode)}</span>
                    <span className="text-white text-[14px] leading-[20px] w-[118px] shrink-0 truncate">{isToday && currentWeatherCode !== null ? weatherCodeToLabel(currentWeatherCode) : weatherCodeToLabel(day.weatherCode)}</span>
                    <span className="flex-1 flex justify-center shrink-0">
                      {day.precipSum > 0.5 ? (
                        <span className="text-white/50 text-[14px] leading-[20px] inline-flex items-center"><img src={rainIcon} alt="rain" className="w-[14px] h-[14px] invert opacity-50 -ml-[4px] mr-[4px] -translate-x-[2px]" />{String(day.precipSum).replace('.', ',')} l</span>
                      ) : <span className="text-white/50 text-[14px] leading-[20px] invisible">— 00%</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      {isToday && weatherTemp !== null ? (() => {
                        const closerToMax = Math.abs(weatherTemp - day.tempMax) <= Math.abs(weatherTemp - day.tempMin);
                        return closerToMax ? (
                          <>
                            <span className="text-white text-[14px] leading-[20px]">{weatherTemp}°</span>
                            <span className="text-white/50 text-[14px] leading-[20px] ml-[8px]">{day.tempMin}°</span>
                          </>
                        ) : (
                          <>
                            <span className="text-white text-[14px] leading-[20px]">{day.tempMax}°</span>
                            <span className="text-white/50 text-[14px] leading-[20px] ml-[8px]">{weatherTemp}°</span>
                          </>
                        );
                      })() : (
                        <>
                          <span className="text-white text-[14px] leading-[20px]">{day.tempMax}°</span>
                          <span className="text-white/50 text-[14px] leading-[20px] ml-[8px]">{day.tempMin}°</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {hasInfoBox && (
                  <div className="flex flex-col gap-px -mt-[7px]">
                    {hasHeat && (() => {
                      const isFirst = true;
                      const isLast = !hasCold && !hasRain;
                      return (
                        <div className={`rounded-lg h-[24px] bg-white/[0.09] flex items-center gap-3 px-3 rounded-t-none ${!isLast ? 'rounded-b-none' : ''}`}>
                          <img src={thermometerIcon} alt="heat" className="w-[14px] h-[14px] shrink-0 invert opacity-50" />
                          <span className="text-white/50 text-[10px] leading-[20px]">Vermeide rausgehen bei Hitze und denk an Wasser</span>
                        </div>
                      );
                    })()}
                    {hasCold && (() => {
                      const isLast = !hasRain;
                      return (
                        <div className={`rounded-lg h-[24px] bg-white/[0.09] flex items-center gap-3 px-3 rounded-t-none ${!isLast ? 'rounded-b-none' : ''}`}>
                          <img src={knittedHat} alt="cold" className="w-[14px] h-[14px] shrink-0 invert opacity-50" />
                          <span className="text-white/50 text-[10px] leading-[20px]">Unter 7° braucht Kalle eine Jacke</span>
                        </div>
                      );
                    })()}
                    {hasRain && (
                      <div className={`rounded-lg h-[24px] bg-white/[0.09] flex items-center gap-3 px-3 rounded-t-none`}>
                        <img src={umbrellaIcon} alt="rain" className="w-[12px] h-[12px] shrink-0 invert opacity-50" />
                        <span className="text-white/50 text-[10px] leading-[20px]">Nimm lieber einen Schirm mit</span>
                      </div>
                    )}
                  </div>
                )}
                </>);
                 })()}
                </React.Fragment>
              );
            })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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
