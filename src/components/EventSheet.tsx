import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { saveEvent, setCountdownTarget, Event } from '@/lib/cookies';

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventAdded: () => void;
}

const EventSheet = ({ open, onOpenChange, onEventAdded }: EventSheetProps) => {
  const [selectedType, setSelectedType] = useState<'pipi' | 'stuhlgang'>('pipi');
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  const handleSubmit = () => {
    const [hours, minutes] = time.split(':').map(Number);
    const eventTime = new Date();
    eventTime.setHours(hours, minutes, 0, 0);

    const event: Event = {
      id: Date.now().toString(),
      type: selectedType,
      time: eventTime,
    };

    saveEvent(event);

    // Set new countdown target (e.g., 4 hours from event)
    const nextTarget = new Date(eventTime);
    nextTarget.setHours(nextTarget.getHours() + 4);
    setCountdownTarget(nextTarget);

    onEventAdded();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background">
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px]">Ereignis hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedType('pipi')}
              className={`flex-1 p-4 rounded-lg border-2 text-[14px] transition-all ${
                selectedType === 'pipi'
                  ? 'border-foreground bg-foreground/10'
                  : 'border-foreground/30'
              }`}
            >
              💦 Pipi
            </button>
            <button
              onClick={() => setSelectedType('stuhlgang')}
              className={`flex-1 p-4 rounded-lg border-2 text-[14px] transition-all ${
                selectedType === 'stuhlgang'
                  ? 'border-foreground bg-foreground/10'
                  : 'border-foreground/30'
              }`}
            >
              💩 Stuhlgang
            </button>
          </div>
          
          <div>
            <label className="block text-[14px] mb-2">Uhrzeit</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 rounded-lg border-2 border-foreground bg-transparent text-[14px]"
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full text-[14px]"
          >
            Speichern
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EventSheet;
