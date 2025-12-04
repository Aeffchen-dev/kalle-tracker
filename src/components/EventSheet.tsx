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

const PH_VALUES_ROW1 = ['5,6', '5,9', '6,2', '6,5', '6,8'];
const PH_VALUES_ROW2 = ['7,0', '7,2', '7,4', '7,7', '8,0'];

// Module-level variable to persist across component remounts
let lastSavedWasGewichtOnly = false;

const EventSheet = ({ open, onOpenChange, onEventAdded }: EventSheetProps) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<'pipi' | 'stuhlgang' | 'phwert' | 'gewicht'>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [selectedPh, setSelectedPh] = useState<string | null>(null);
  const [weightValue, setWeightValue] = useState<string>('');

  // Reset time to current when sheet opens (unless last save was gewicht-only)
  useEffect(() => {
    if (open) {
      if (!lastSavedWasGewichtOnly) {
        setSelectedTime(format(new Date(), 'HH:mm'));
      }
      setSelectedPh(null);
      setWeightValue('');
      lastSavedWasGewichtOnly = false;
    }
  }, [open]);

  const toggleType = (type: 'pipi' | 'stuhlgang' | 'phwert' | 'gewicht') => {
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
      // Only include pH value for phwert type
      const phValue = type === 'phwert' ? selectedPh : undefined;
      const weight = type === 'gewicht' ? (weightValue ? parseFloat(weightValue.replace(',', '.')) : undefined) : undefined;
      await saveEvent(type, eventDate, phValue || undefined, weight);
    }

    // Track if only gewicht was saved (to preserve time on next open)
    lastSavedWasGewichtOnly = selectedTypes.size === 1 && selectedTypes.has('gewicht');

    onEventAdded();
    onOpenChange(false);
    
    // Reset selections
    setSelectedTypes(new Set());
    setSelectedPh(null);
    setWeightValue('');
    setIsSubmitting(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-black border-black overflow-hidden">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-center text-[14px] text-white">Ereignis hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toggleType('pipi')}
              className={`h-10 px-5 rounded text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
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
              className={`h-10 px-5 rounded text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('stuhlgang')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white hover:text-white border border-white/30'
              }`}
            >
              <span>💩</span>
              <span>Stuhlgang</span>
            </button>
            <button
              onClick={() => toggleType('phwert')}
              className={`h-10 px-5 rounded text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('phwert')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white hover:text-white border border-white/30'
              }`}
            >
              <span>🧪</span>
              <span>pH-Wert</span>
            </button>
            <button
              onClick={() => toggleType('gewicht')}
              className={`h-10 px-5 rounded text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('gewicht')
                  ? 'bg-white text-black border border-white'
                  : 'bg-transparent text-white hover:text-white border border-white/30'
              }`}
            >
              <span>🏋️</span>
              <span>Gewicht</span>
            </button>
          </div>

          {/* pH Value Selection - only show when phwert is selected */}
          {selectedTypes.has('phwert') && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {PH_VALUES_ROW1.map((ph, index) => {
                  const isRed = index < 3; // first 3 values
                  return (
                    <button
                      key={ph}
                      onClick={() => setSelectedPh(selectedPh === ph ? null : ph)}
                      className={`flex-1 h-10 rounded text-[14px] font-medium transition-all duration-200 ${
                        selectedPh === ph
                          ? 'bg-white text-black border border-white'
                          : `bg-transparent ${isRed ? 'text-red-500' : 'text-white'} border border-white/30`
                      }`}
                    >
                      {ph}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {PH_VALUES_ROW2.map((ph, index) => {
                  const isRed = index >= 2; // last 3 values
                  return (
                    <button
                      key={ph}
                      onClick={() => setSelectedPh(selectedPh === ph ? null : ph)}
                      className={`flex-1 h-10 rounded text-[14px] font-medium transition-all duration-200 ${
                        selectedPh === ph
                          ? 'bg-white text-black border border-white'
                          : `bg-transparent ${isRed ? 'text-red-500' : 'text-white'} border border-white/30`
                      }`}
                    >
                      {ph}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weight Input - only show when gewicht is selected */}
          {selectedTypes.has('gewicht') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="Gewicht eingeben"
                  className="box-border h-12 px-3 bg-transparent border border-white/30 text-white text-[14px] rounded-[4px] text-center placeholder:text-white/50 flex-1"
                />
                <span className="text-[14px] text-white">kg</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-[14px] text-white">Uhrzeit:</span>
            <div className="relative">
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="box-border w-full h-12 px-3 pr-12 bg-transparent border border-white/30 text-white text-[14px] rounded-[4px] text-center [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-white pointer-events-none">Uhr</span>
            </div>
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
