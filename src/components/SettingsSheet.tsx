import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getMorningWalkTime, setMorningWalkTime, getWalkIntervalHours, setWalkIntervalHours } from '@/lib/cookies';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChanged?: () => void;
}

const SettingsSheet = ({ open, onOpenChange, onSettingsChanged }: SettingsSheetProps) => {
  const [morningTime, setMorningTime] = useState('08:00');
  const [intervalHours, setIntervalHours] = useState(4);

  useEffect(() => {
    if (open) {
      setMorningTime(getMorningWalkTime());
      setIntervalHours(getWalkIntervalHours());
    }
  }, [open]);

  const handleTimeChange = (newTime: string) => {
    setMorningTime(newTime);
    setMorningWalkTime(newTime);
    onSettingsChanged?.();
  };

  const handleIntervalChange = (newInterval: number) => {
    setIntervalHours(newInterval);
    setWalkIntervalHours(newInterval);
    onSettingsChanged?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#FFFEF5] rounded-t-[20px] border-none px-4 pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-[18px] font-semibold text-center">Einstellungen</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {/* Walk Interval Setting */}
          <div className="bg-white/40 backdrop-blur-[8px] rounded-[16px] border border-[#FFFEF5]/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-black">Gassi-Erinnerung</p>
                <p className="text-[12px] text-black/60">Nach wie vielen Stunden erinnern</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={intervalHours}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  className="bg-white/60 border border-black/10 rounded-lg px-3 py-2 text-[14px] text-black"
                >
                  {[2, 3, 4, 5, 6].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-[14px] text-black/70">Stunden</span>
              </div>
            </div>
          </div>

          {/* Morning Walk Time Setting */}
          <div className="bg-white/40 backdrop-blur-[8px] rounded-[16px] border border-[#FFFEF5]/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-black">Morgen-Spaziergang</p>
                <p className="text-[12px] text-black/60">Erster Spaziergang nach der Nacht</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={morningTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="bg-white/60 border border-black/10 rounded-lg px-3 py-2 text-[14px] text-black"
                />
                <span className="text-[14px] text-black/70">Uhr</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsSheet;