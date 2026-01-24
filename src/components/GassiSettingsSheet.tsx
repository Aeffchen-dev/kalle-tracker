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
        <SheetHeader className="pb-4">
          <SheetTitle className="text-[18px] font-semibold text-center text-white">Gassi Einstellungen</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {/* Walk Interval Setting */}
          <div className="bg-white/10 rounded-[16px] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-white">Erinnerung nach</p>
                <p className="text-[12px] text-white/60">Stunden seit letztem Spaziergang</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={intervalHours}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  className="bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-[14px] text-white"
                >
                  {[2, 3, 4, 5, 6].map((h) => (
                    <option key={h} value={h} className="bg-black text-white">{h}h</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Morning Walk Time Setting */}
          <div className="bg-white/10 rounded-[16px] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-white">Morgen-Spaziergang</p>
                <p className="text-[12px] text-white/60">Erster Spaziergang nach der Nacht</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={morningTime}
                  onChange={(e) => handleMorningTimeChange(e.target.value)}
                  className="bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-[14px] text-white [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Sleep Time Setting */}
          <div className="bg-white/10 rounded-[16px] p-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium text-white">Schlafenszeit</p>
                <p className="text-[12px] text-white/60">Keine Erinnerungen während dieser Zeit</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-white/70">Von</span>
                <select
                  value={sleepStart}
                  onChange={(e) => handleSleepStartChange(parseInt(e.target.value, 10))}
                  className="bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-[14px] text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i} className="bg-black text-white">
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <span className="text-[14px] text-white/70">bis</span>
                <select
                  value={sleepEnd}
                  onChange={(e) => handleSleepEndChange(parseInt(e.target.value, 10))}
                  className="bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-[14px] text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i} className="bg-black text-white">
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
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