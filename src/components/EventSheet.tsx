import { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveEvent, SaveResult } from '@/lib/events';
import { format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventAdded: () => void;
}

const PH_VALUES_ROW1 = ['5,6', '5,9', '6,2', '6,5', '6,8'];
const PH_VALUES_ROW2 = ['7,0', '7,2', '7,4', '7,7', '8,0'];

const EventSheet = ({ open, onOpenChange, onEventAdded }: EventSheetProps) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<'pipi' | 'stuhlgang' | 'phwert' | 'gewicht'>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [selectedPh, setSelectedPh] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [weightValue, setWeightValue] = useState<string>('');
  const wasOpen = useRef(false);
  const { toast } = useToast();

  // Reset time when sheet opens, reset all fields when closing
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    const justClosed = !open && wasOpen.current;
    wasOpen.current = open;
    
    if (justOpened) {
      const preserved = sessionStorage.getItem('preservedTime');
      console.log('Sheet opened, preserved time:', preserved);
      
      if (preserved) {
        setSelectedTime(preserved);
        sessionStorage.removeItem('preservedTime');
      } else {
        setSelectedTime(format(new Date(), 'HH:mm'));
      }
      setSelectedDate(new Date());
      setSelectedPh(null);
      setWeightValue('');
    }
    
    if (justClosed) {
      // Reset all form fields when modal closes
      setSelectedTypes(new Set());
      setSelectedDate(new Date());
      setSelectedPh(null);
      setWeightValue('');
      setSelectedTime(format(new Date(), 'HH:mm'));
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
    
    // Create date with selected date and time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const eventDate = new Date(selectedDate);
    eventDate.setHours(hours, minutes, 0, 0);
    
    let hasError = false;
    let savedLocally = false;
    
    // Save an event for each selected type
    for (const type of selectedTypes) {
      // Only include pH value for phwert type
      const phValue = type === 'phwert' ? selectedPh : undefined;
      const weight = type === 'gewicht' ? (weightValue ? parseFloat(weightValue.replace(',', '.')) : undefined) : undefined;
      const result: SaveResult = await saveEvent(type, eventDate, phValue || undefined, weight);
      
      if (!result.success) {
        hasError = true;
        if (result.savedLocally) {
          savedLocally = true;
        }
      }
    }

    // Show toast based on result
    if (hasError && savedLocally) {
      toast({
        title: "Offline gespeichert",
        description: "Backend nicht erreichbar. Event wird später synchronisiert.",
        variant: "destructive",
      });
    } else if (hasError) {
      toast({
        title: "Fehler",
        description: "Event konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }

    // Preserve time ONLY if gewicht was the only type saved
    const onlyGewichtSaved = selectedTypes.size === 1 && selectedTypes.has('gewicht');
    console.log('Saving, types:', Array.from(selectedTypes), 'onlyGewicht:', onlyGewichtSaved);
    
    if (onlyGewichtSaved) {
      sessionStorage.setItem('preservedTime', selectedTime);
      console.log('Preserved time:', selectedTime);
    } else {
      sessionStorage.removeItem('preservedTime');
      console.log('Cleared preserved time');
    }

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
          <DrawerTitle className="text-center text-[14px] text-white">Eintrag hinzufügen</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toggleType('pipi')}
              className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('pipi')
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <span>💦</span>
              <span>Pipi</span>
            </button>
            <button
              onClick={() => toggleType('stuhlgang')}
              className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('stuhlgang')
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <span>💩</span>
              <span>Stuhlgang</span>
            </button>
            <button
              onClick={() => toggleType('phwert')}
              className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('phwert')
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <span>🧪</span>
              <span>pH-Wert</span>
            </button>
            <button
              onClick={() => toggleType('gewicht')}
              className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedTypes.has('gewicht')
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
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
              <div className="flex items-center justify-center h-12 bg-transparent border border-white/30 rounded-[4px]" style={{ width: 'calc(100vw - 32px)' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="32"
                  className="bg-transparent text-white text-[16px] text-center border-none outline-none focus:ring-0 focus:outline-none placeholder:text-white/50 w-16 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[14px] text-white ml-4">kg</span>
              </div>
            </div>
          )}

          {/* Time and Date Selection - Combined */}
          <div>
            <label className="flex items-center h-12 bg-transparent border border-white/30 rounded-[4px] cursor-pointer relative" style={{ width: 'calc(100vw - 32px)' }}>
              {/* Left-aligned calendar icon and date */}
              <div className="absolute left-3 flex items-center gap-2">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center text-white/70 hover:text-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CalendarIcon size={18} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-black border-white/20" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto bg-black text-white")}
                    />
                  </PopoverContent>
                </Popover>
                {!isSameDay(selectedDate, new Date()) && (
                  <span className="text-[14px] text-white">
                    {format(selectedDate, 'dd.MM.')}
                  </span>
                )}
              </div>
              {/* Centered time */}
              <div className="flex-1 flex items-center justify-center">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none w-[70px] md:[&::-webkit-calendar-picker-indicator]:filter md:[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 md:[&::-webkit-calendar-picker-indicator]:static md:[&::-webkit-calendar-picker-indicator]:w-auto md:[&::-webkit-calendar-picker-indicator]:h-auto md:[&::-webkit-calendar-picker-indicator]:opacity-100 md:[&::-webkit-calendar-picker-indicator]:ml-2"
                />
                <span className="text-[14px] text-white">Uhr</span>
              </div>
            </label>
          </div>

          <div className="pb-4">
            <Button
              onClick={handleSubmit}
              disabled={
                selectedTypes.size === 0 || 
                isSubmitting || 
                (selectedTypes.has('phwert') && !selectedPh) ||
                (selectedTypes.has('gewicht') && !weightValue.trim())
              }
              className="w-full h-12 text-[14px] bg-white text-black hover:bg-white/90 disabled:bg-white disabled:text-black/50 disabled:opacity-100 rounded-full"
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
