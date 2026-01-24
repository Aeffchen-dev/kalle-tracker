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
      <SheetContent side="bottom" className="bg-black rounded-t-[20px] border-none px-4 pb-8" hideOverlay onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="pb-6">
          <SheetTitle className="text-[18px] font-semibold text-center text-white">Einstellungen</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {/* Walk Interval Setting */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-white">Erinnerung nach</span>
            <div className="flex items-center h-12 bg-transparent border border-white/30 rounded-[4px] px-3">
              <select
                value={intervalHours}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h} className="bg-black text-white">{h}</option>
                ))}
              </select>
              <span className="text-[14px] text-white ml-1">Stunden</span>
            </div>
          </div>

          {/* Morning Walk Time Setting */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-white">Morgen-Spaziergang</span>
            <div className="flex items-center h-12 bg-transparent border border-white/30 rounded-[4px] px-3">
              <input
                type="time"
                value={morningTime}
                onChange={(e) => handleMorningTimeChange(e.target.value)}
                className="bg-transparent text-white text-[14px] text-center border-none outline-none [color-scheme:dark]"
              />
              <span className="text-[14px] text-white ml-1">Uhr</span>
            </div>
          </div>

          {/* Sleep Time Setting */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-white">Schlafenszeit</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center h-12 bg-transparent border border-white/30 rounded-[4px] px-3">
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
              </div>
              <span className="text-[14px] text-white">bis</span>
              <div className="flex items-center h-12 bg-transparent border border-white/30 rounded-[4px] px-3">
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
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GassiSettingsSheet;