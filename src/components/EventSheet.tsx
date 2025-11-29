import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { saveEvent, Event } from '@/lib/cookies';

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventAdded: () => void;
}

const EventSheet = ({ open, onOpenChange, onEventAdded }: EventSheetProps) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<'pipi' | 'stuhlgang'>>(new Set());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  const toggleType = (type: 'pipi' | 'stuhlgang') => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    if (selectedTypes.size === 0) return;
    
    // Use current time for countdown reset
    const now = new Date();

    // Save an event for each selected type
    selectedTypes.forEach(type => {
      const event: Event = {
        id: `${Date.now()}-${type}`,
        type,
        time: now, // Always use current time so countdown resets
      };
      saveEvent(event);
    });

    onEventAdded();
    onOpenChange(false);
    
    // Reset selections
    setSelectedTypes(new Set());
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-black">
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px] text-white">Ereignis hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4 overflow-x-hidden">
          <div className="flex gap-3">
            <button
              onClick={() => toggleType('pipi')}
              className={`flex-1 p-5 rounded-2xl border-2 text-[14px] transition-all duration-200 text-white flex items-center justify-between ${
                selectedTypes.has('pipi')
                  ? 'border-white bg-white/15 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
            >
              <span className="text-[16px]">💦 Pipi</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                selectedTypes.has('pipi')
                  ? 'border-white bg-white'
                  : 'border-white/40'
              }`}>
                {selectedTypes.has('pipi') && (
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                )}
              </div>
            </button>
            <button
              onClick={() => toggleType('stuhlgang')}
              className={`flex-1 p-5 rounded-2xl border-2 text-[14px] transition-all duration-200 text-white flex items-center justify-between ${
                selectedTypes.has('stuhlgang')
                  ? 'border-white bg-white/15 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
            >
              <span className="text-[16px]">💩 Stuhlgang</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                selectedTypes.has('stuhlgang')
                  ? 'border-white bg-white'
                  : 'border-white/40'
              }`}>
                {selectedTypes.has('stuhlgang') && (
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                )}
              </div>
            </button>
          </div>
          
          <div>
            <label className="block text-[14px] mb-2 text-white">Uhrzeit</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 rounded-lg border border-white bg-transparent text-[14px] text-white [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={selectedTypes.size === 0}
            className="w-full text-[14px] bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-full"
          >
            Speichern
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EventSheet;
