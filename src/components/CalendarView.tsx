import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getEvents, Event } from '@/lib/cookies';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarView = ({ open, onOpenChange }: CalendarViewProps) => {
  const events = getEvents();
  const today = new Date();
  
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.time);
    return eventDate.toDateString() === today.toDateString();
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="text-center text-[14px]">
            {format(today, 'EEEE, d. MMMM yyyy', { locale: de })}
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          {todayEvents.length === 0 ? (
            <p className="text-center text-[14px] text-muted-foreground">
              Keine Ereignisse heute
            </p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-foreground/30"
                >
                  <span className="text-[14px]">
                    {event.type === 'pipi' ? '💦 Pipi' : '💩 Stuhlgang'}
                  </span>
                  <span className="text-[14px]">
                    {format(new Date(event.time), 'HH:mm')} Uhr
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CalendarView;
