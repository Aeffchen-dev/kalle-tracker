import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getSettings, updateSettings, CountdownMode } from '@/lib/settings';

interface GassiSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChanged?: () => void;
}

const GassiSettingsSheet = ({ open, onOpenChange, onSettingsChanged }: GassiSettingsSheetProps) => {
  const [morningTime, setMorningTime] = useState('08:00');
  const [intervalHours, setIntervalHours] = useState(4);
  const [sleepStart, setSleepStart] = useState(22);
  const [sleepEnd, setSleepEnd] = useState(7);
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('count_up');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getSettings().then((settings) => {
        setMorningTime(settings.morning_walk_time);
        setIntervalHours(settings.walk_interval_hours);
        setSleepStart(settings.sleep_start_hour);
        setSleepEnd(settings.sleep_end_hour);
        setCountdownMode(settings.countdown_mode);
        setIsLoading(false);
      });
    }
  }, [open]);

  const handleIntervalChange = async (newInterval: number) => {
    setIntervalHours(newInterval);
    await updateSettings({ walk_interval_hours: newInterval });
    onSettingsChanged?.();
  };

  const handleMorningTimeChange = async (newTime: string) => {
    setMorningTime(newTime);
    await updateSettings({ morning_walk_time: newTime });
    onSettingsChanged?.();
  };

  const handleSleepStartChange = async (hour: number) => {
    setSleepStart(hour);
    await updateSettings({ sleep_start_hour: hour });
    onSettingsChanged?.();
  };

  const handleSleepEndChange = async (hour: number) => {
    setSleepEnd(hour);
    await updateSettings({ sleep_end_hour: hour });
    onSettingsChanged?.();
  };

  const handleCountdownModeChange = async (mode: CountdownMode) => {
    setCountdownMode(mode);
    await updateSettings({ countdown_mode: mode });
    onSettingsChanged?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-none px-4 pb-8">
        <DrawerHeader className="pb-6">
          <DrawerTitle className="text-center text-[14px] text-white">Einstellungen</DrawerTitle>
        </DrawerHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-12 w-full bg-white/10 rounded-[4px] animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Countdown Mode Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Countdown</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCountdownModeChange('count_up')}
                  className={`h-12 rounded-[4px] text-[14px] transition-all ${
                    countdownMode === 'count_up'
                      ? 'bg-white text-black'
                      : 'bg-transparent border border-white/30 text-white'
                  }`}
                >
                  Hochzählen
                </button>
                <button
                  onClick={() => handleCountdownModeChange('count_down')}
                  className={`h-12 rounded-[4px] text-[14px] transition-all ${
                    countdownMode === 'count_down'
                      ? 'bg-white text-black'
                      : 'bg-transparent border border-white/30 text-white'
                  }`}
                >
                  Runterzählen
                </button>
              </div>
            </div>

            {/* Walk Interval Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Erinnerung nach</span>
              <label className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] cursor-pointer relative">
                <span className="text-[14px] text-white w-[2ch] text-right">{intervalHours}</span>
                <span className="text-[14px] text-white ml-1">Stunden</span>
                <select
                  value={intervalHours}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h} className="bg-black text-white">{h}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Morning Walk Time Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Morgen-Spaziergang</span>
              <label className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] cursor-pointer relative">
                <input
                  type="time"
                  value={morningTime}
                  onChange={(e) => handleMorningTimeChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="text-[14px] text-white">{morningTime}</span>
                <span className="text-[14px] text-white ml-1">Uhr</span>
              </label>
            </div>

            {/* Sleep Time Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Schlafenszeit</span>
              <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] gap-1">
                <select
                  value={sleepStart}
                  onChange={(e) => handleSleepStartChange(parseFloat(e.target.value))}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer w-[5ch]"
                >
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? '00' : '30';
                    const value = hour + (i % 2 === 0 ? 0 : 0.5);
                    return (
                      <option key={i} value={value} className="bg-black text-white">
                        {hour.toString().padStart(2, '0')}:{minute}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[14px] text-white">bis</span>
                <select
                  value={sleepEnd}
                  onChange={(e) => handleSleepEndChange(parseFloat(e.target.value))}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer w-[5ch]"
                >
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? '00' : '30';
                    const value = hour + (i % 2 === 0 ? 0 : 0.5);
                    return (
                      <option key={i} value={value} className="bg-black text-white">
                        {hour.toString().padStart(2, '0')}:{minute}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[14px] text-white">Uhr</span>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default GassiSettingsSheet;
