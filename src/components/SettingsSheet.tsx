import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getMorningWalkTime, setMorningWalkTime } from '@/lib/cookies';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChanged?: () => void;
}

const SettingsSheet = ({ open, onOpenChange, onSettingsChanged }: SettingsSheetProps) => {
  const [morningTime, setMorningTime] = useState('08:00');

  useEffect(() => {
    if (open) {
      setMorningTime(getMorningWalkTime());
    }
  }, [open]);

  const handleTimeChange = (newTime: string) => {
    setMorningTime(newTime);
    setMorningWalkTime(newTime);
    onSettingsChanged?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#FFFEF5] rounded-t-[20px] border-none px-4 pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-[18px] font-semibold text-center">Einstellungen</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6">
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