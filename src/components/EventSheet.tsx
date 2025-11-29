import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { saveEvent } from '@/lib/events';

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventAdded: () => void;
}

const EventSheet = ({ open, onOpenChange, onEventAdded }: EventSheetProps) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<'pipi' | 'stuhlgang'>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    // Use current time so counter starts from 0
    const eventDate = new Date();
    
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
      <DrawerContent className="bg-black border-black">
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px] text-white">Ereignis hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4 overflow-x-hidden">
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

          <Button
            onClick={handleSubmit}
            disabled={selectedTypes.size === 0 || isSubmitting}
            className="w-full h-12 text-[14px] bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-full"
          >
            {isSubmitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EventSheet;
