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
              className={`flex-1 py-4 px-5 rounded text-[16px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('pipi')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white/60 hover:text-white border border-white/30'
              }`}
            >
              <span>💦</span>
              <span>Pipi</span>
            </button>
            <button
              onClick={() => toggleType('stuhlgang')}
              className={`flex-1 py-4 px-5 rounded text-[16px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('stuhlgang')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white/60 hover:text-white border border-white/30'
              }`}
            >
              <span>💩</span>
              <span>Stuhlgang</span>
            </button>
          </div>
          
          <div>
            <label className="block text-[14px] mb-2 text-white">Uhrzeit</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 p-3 rounded border border-white/30 bg-transparent text-[14px] text-white [&::-webkit-calendar-picker-indicator]:invert"
              style={{ width: 'calc(100% - 32px)' }}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={selectedTypes.size === 0}
            className="w-full h-10 text-[14px] bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-full"
          >
            Speichern
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EventSheet;
