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
  const [selectedTypes, setSelectedTypes] = useState<Set<'pipi' | 'stuhlgang'>>(new Set(['pipi']));
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
    
    const [hours, minutes] = time.split(':').map(Number);
    const eventTime = new Date();
    eventTime.setHours(hours, minutes, 0, 0);

    // Save an event for each selected type
    selectedTypes.forEach(type => {
      const event: Event = {
        id: `${Date.now()}-${type}`,
        type,
        time: eventTime,
      };
      saveEvent(event);
    });

    onEventAdded();
    onOpenChange(false);
    
    // Reset selections
    setSelectedTypes(new Set(['pipi']));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-black">
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px] text-white">Ereignis hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4 overflow-hidden">
          <div className="flex gap-3">
            <button
              onClick={() => toggleType('pipi')}
              className={`flex-1 p-4 rounded-lg border text-[14px] transition-all text-white ${
                selectedTypes.has('pipi')
                  ? 'border-white bg-white/10'
                  : 'border-white/30'
              }`}
            >
              💦 Pipi
            </button>
            <button
              onClick={() => toggleType('stuhlgang')}
              className={`flex-1 p-4 rounded-lg border text-[14px] transition-all text-white ${
                selectedTypes.has('stuhlgang')
                  ? 'border-white bg-white/10'
                  : 'border-white/30'
              }`}
            >
              💩 Stuhlgang
            </button>
          </div>
          
          <div className="w-full">
            <label className="block text-[14px] mb-2 text-white">Uhrzeit</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: '100%' }}
              className="p-3 rounded-lg border border-white bg-transparent text-[14px] text-white [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={selectedTypes.size === 0}
            className="w-full text-[14px] bg-white text-black hover:bg-white/90 disabled:opacity-50"
          >
            Speichern
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EventSheet;
