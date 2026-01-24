import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { 
  getMorningWalkTime, setMorningWalkTime, 
  getWalkIntervalHours, setWalkIntervalHours,
  getSleepStartHour, setSleepStartHour,
  getSleepEndHour, setSleepEndHour
} from '@/lib/cookies';

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

  useEffect(() => {
    if (open) {
      setMorningTime(getMorningWalkTime());
      setIntervalHours(getWalkIntervalHours());
      setSleepStart(getSleepStartHour());
      setSleepEnd(getSleepEndHour());
    }
  }, [open]);

  const handleIntervalChange = (newInterval: number) => {
    setIntervalHours(newInterval);
    setWalkIntervalHours(newInterval);
    onSettingsChanged?.();
  };

  const handleMorningTimeChange = (newTime: string) => {
    setMorningTime(newTime);
    setMorningWalkTime(newTime);
    onSettingsChanged?.();
  };

  const handleSleepStartChange = (hour: number) => {
    setSleepStart(hour);
    setSleepStartHour(hour);
    onSettingsChanged?.();
  };

  const handleSleepEndChange = (hour: number) => {
    setSleepEnd(hour);
    setSleepEndHour(hour);
    onSettingsChanged?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-none px-4 pb-8">
        <DrawerHeader className="pb-6">
          <DrawerTitle className="text-[18px] font-semibold text-center text-white">Einstellungen</DrawerTitle>
        </DrawerHeader>
        
        <div className="space-y-4">
          {/* Walk Interval Setting */}
          <div className="space-y-2">
            <span className="text-[14px] text-white">Erinnerung nach</span>
            <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px]">
              <select
                value={intervalHours}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h} className="bg-black text-white">{h}</option>
                ))}
              </select>
              <span className="text-[14px] text-white ml-2">Stunden</span>
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
                className="bg-transparent text-white text-[14px] text-center border-none outline-none [color-scheme:dark]"
              />
              <span className="text-[14px] text-white ml-2">Uhr</span>
            </div>
          </div>

          {/* Sleep Time Setting */}
          <div className="space-y-2">
            <span className="text-[14px] text-white">Schlafenszeit</span>
            <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] gap-3">
              <select
                value={sleepStart}
                onChange={(e) => handleSleepStartChange(parseFloat(e.target.value))}
                className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
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
                className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
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
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GassiSettingsSheet;
