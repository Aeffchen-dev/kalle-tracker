import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-black rounded-t-[20px] border-none px-4 pb-8">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-[18px] font-semibold text-center text-white">Einstellungen</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-3">
          {/* Walk Interval Setting */}
          <div className="flex items-center justify-center h-12 bg-transparent border border-white/30 rounded-[4px]">
            <span className="text-[14px] text-white mr-4">Erinnerung nach</span>
            <select
              value={intervalHours}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
              className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
            >
              {[2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h} className="bg-black text-white">{h}</option>
              ))}
            </select>
            <span className="text-[14px] text-white ml-1">Stunden</span>
          </div>

          {/* Morning Walk Time Setting */}
          <div className="flex items-center justify-center h-12 bg-transparent border border-white/30 rounded-[4px]">
            <span className="text-[14px] text-white mr-4">Morgen-Spaziergang</span>
            <input
              type="time"
              value={morningTime}
              onChange={(e) => handleMorningTimeChange(e.target.value)}
              className="bg-transparent text-white text-[14px] text-center border-none outline-none [color-scheme:dark]"
            />
            <span className="text-[14px] text-white ml-1">Uhr</span>
          </div>

          {/* Sleep Time Setting */}
          <div className="flex items-center justify-center h-12 bg-transparent border border-white/30 rounded-[4px]">
            <span className="text-[14px] text-white mr-4">Schlafenszeit</span>
            <select
              value={sleepStart}
              onChange={(e) => handleSleepStartChange(parseInt(e.target.value, 10))}
              className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i} className="bg-black text-white">
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <span className="text-[14px] text-white mx-2">bis</span>
            <select
              value={sleepEnd}
              onChange={(e) => handleSleepEndChange(parseInt(e.target.value, 10))}
              className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i} className="bg-black text-white">
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GassiSettingsSheet;