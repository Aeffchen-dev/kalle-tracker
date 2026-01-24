import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getSettings, updateSettings } from '@/lib/settings';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getSettings().then((settings) => {
        setMorningTime(settings.morning_walk_time);
        setIntervalHours(settings.walk_interval_hours);
        setSleepStart(settings.sleep_start_hour);
        setSleepEnd(settings.sleep_end_hour);
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-none px-4 pb-8">
        <DrawerHeader className="pb-6">
          <DrawerTitle className="text-[18px] font-semibold text-center text-white">Einstellungen</DrawerTitle>
        </DrawerHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-12 w-full bg-white/10 rounded-[4px] animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Walk Interval Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Erinnerung nach</span>
              <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px]">
                <span className="text-[14px] text-white w-[2ch] text-right">{intervalHours}</span>
                <select
                  value={intervalHours}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  className="bg-transparent text-white text-[14px] border-none outline-none cursor-pointer opacity-0 absolute"
                  style={{ width: '2ch' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h} className="bg-black text-white">{h}</option>
                  ))}
                </select>
                <span className="text-[14px] text-white ml-1">Stunden</span>
              </div>
            </div>

            {/* Morning Walk Time Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Morgen-Spaziergang</span>
              <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px]">
                <input
                  type="time"
                  value={morningTime}
                  onChange={(e) => handleMorningTimeChange(e.target.value)}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none [color-scheme:dark] w-[5ch]"
                />
                <span className="text-[14px] text-white ml-1">Uhr</span>
              </div>
            </div>

            {/* Sleep Time Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Schlafenszeit</span>
              <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px]">
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
                <span className="text-[14px] text-white mx-2">bis</span>
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
                <span className="text-[14px] text-white ml-1">Uhr</span>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default GassiSettingsSheet;
