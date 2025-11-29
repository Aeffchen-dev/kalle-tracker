import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveEvent } from '@/lib/events';
import { format } from 'date-fns';

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventAdded: () => void;
}

const EventSheet = ({ open, onOpenChange, onEventAdded }: EventSheetProps) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<'pipi' | 'stuhlgang'>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));

  // Reset time to current when sheet opens
  useEffect(() => {
    if (open) {
      setSelectedTime(format(new Date(), 'HH:mm'));
    }
  }, [open]);

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

  const handleSubmit = async () => {
    if (selectedTypes.size === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Create date with selected time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(hours, minutes, 0, 0);
    
    // Save an event for each selected type
    for (const type of selectedTypes) {
      await saveEvent(type, eventDate);
    }

    onEventAdded();
    onOpenChange(false);
    
    // Reset selections
    setSelectedTypes(new Set());
    setIsSubmitting(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-black overflow-hidden">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-center text-[14px] text-white">Ereignis hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-hidden">
          <div className="flex gap-3">
            <button
              onClick={() => toggleType('pipi')}
              className={`flex-1 h-10 px-5 rounded text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('pipi')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white hover:text-white border border-white/30'
              }`}
            >
              <span>💦</span>
              <span>Pipi</span>
            </button>
            <button
              onClick={() => toggleType('stuhlgang')}
              className={`flex-1 h-10 px-5 rounded text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('stuhlgang')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white hover:text-white border border-white/30'
              }`}
            >
              <span>💩</span>
              <span>Stuhlgang</span>
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[14px] text-white">Uhrzeit:</span>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full h-10 bg-transparent border-white/30 text-white text-[14px] rounded-[4px] [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          <div className="pb-4">
            <Button
              onClick={handleSubmit}
              disabled={selectedTypes.size === 0 || isSubmitting}
              className="w-full h-12 text-[14px] bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-full"
            >
              {isSubmitting ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EventSheet;
