import { useState, useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { getSettings, updateSettings, CountdownMode } from '@/lib/settings';
import { format, parse, isValid, getDaysInMonth } from 'date-fns';
import { de } from 'date-fns/locale';

interface GassiSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChanged?: () => void;
}

const GassiSettingsSheet = ({ open, onOpenChange, onSettingsChanged }: GassiSettingsSheetProps) => {
  const [morningTime, setMorningTime] = useState('08:00');
  const [intervalHours, setIntervalHours] = useState(4);
  const [sleepStart, setSleepStart] = useState(22);
  const [sleepEnd, setSleepEnd] = useState(7);
  const [countdownMode, setCountdownMode] = useState<CountdownMode>('count_up');
  const [birthdayDay, setBirthdayDay] = useState<number | null>(null);
  const [birthdayMonth, setBirthdayMonth] = useState<number | null>(null);
  const [birthdayYear, setBirthdayYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getSettings().then((settings) => {
        setMorningTime(settings.morning_walk_time);
        setIntervalHours(settings.walk_interval_hours);
        setSleepStart(settings.sleep_start_hour);
        setSleepEnd(settings.sleep_end_hour);
        setCountdownMode(settings.countdown_mode);
        if (settings.birthday) {
          const date = parse(settings.birthday, 'yyyy-MM-dd', new Date());
          setBirthdayDay(date.getDate());
          setBirthdayMonth(date.getMonth() + 1);
          setBirthdayYear(date.getFullYear());
        } else {
          setBirthdayDay(null);
          setBirthdayMonth(null);
          setBirthdayYear(null);
        }
        setIsLoading(false);
      });
    }
  }, [open]);

  // Calculate available days based on selected month/year
  const daysInSelectedMonth = useMemo(() => {
    if (birthdayMonth && birthdayYear) {
      return getDaysInMonth(new Date(birthdayYear, birthdayMonth - 1));
    }
    return 31;
  }, [birthdayMonth, birthdayYear]);

  const handleIntervalChange = async (newInterval: number) => {
    setIntervalHours(newInterval);
    await updateSettings({ walk_interval_hours: newInterval });
    onSettingsChanged?.();
  };

  const handleMorningTimeChange = async (newTime: string) => {
    setMorningTime(newTime);
    await updateSettings({ morning_walk_time: newTime });
    onSettingsChanged?.();
  };

  const handleSleepStartChange = async (hour: number) => {
    setSleepStart(hour);
    await updateSettings({ sleep_start_hour: hour });
    onSettingsChanged?.();
  };

  const handleSleepEndChange = async (hour: number) => {
    setSleepEnd(hour);
    await updateSettings({ sleep_end_hour: hour });
    onSettingsChanged?.();
  };

  const handleCountdownModeChange = async (mode: CountdownMode) => {
    setCountdownMode(mode);
    await updateSettings({ countdown_mode: mode });
    onSettingsChanged?.();
  };

  const handleBirthdayPartChange = async (day: number | null, month: number | null, year: number | null) => {
    setBirthdayDay(day);
    setBirthdayMonth(month);
    setBirthdayYear(year);
    
    if (day && month && year) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      await updateSettings({ birthday: dateStr });
      onSettingsChanged?.();
    }
  };

  const months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mär' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Okt' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dez' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} snapPoints={[0.95]}>
      <DrawerContent className="bg-black border-none px-4 pb-8 max-h-[95dvh]">
        <DrawerHeader className="pb-6">
          <DrawerTitle className="text-center text-[14px] text-white">Einstellungen</DrawerTitle>
        </DrawerHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-12 w-full bg-white/10 rounded-[4px] animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Birthday Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Geburtstag</span>
              <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] gap-2">
                <select
                  value={birthdayDay || ''}
                  onChange={(e) => handleBirthdayPartChange(e.target.value ? parseInt(e.target.value) : null, birthdayMonth, birthdayYear)}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
                >
                  <option value="" className="bg-black text-white">TT</option>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d} className="bg-black text-white">
                      {d.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={birthdayMonth || ''}
                  onChange={(e) => {
                    const newMonth = e.target.value ? parseInt(e.target.value) : null;
                    let newDay = birthdayDay;
                    if (newMonth && birthdayYear && birthdayDay) {
                      const maxDays = getDaysInMonth(new Date(birthdayYear, newMonth - 1));
                      if (birthdayDay > maxDays) {
                        newDay = maxDays;
                      }
                    }
                    handleBirthdayPartChange(newDay, newMonth, birthdayYear);
                  }}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
                >
                  <option value="" className="bg-black text-white">MM</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value} className="bg-black text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={birthdayYear || ''}
                  onChange={(e) => {
                    const newYear = e.target.value ? parseInt(e.target.value) : null;
                    let newDay = birthdayDay;
                    if (newYear && birthdayMonth && birthdayDay) {
                      const maxDays = getDaysInMonth(new Date(newYear, birthdayMonth - 1));
                      if (birthdayDay > maxDays) {
                        newDay = maxDays;
                      }
                    }
                    handleBirthdayPartChange(newDay, birthdayMonth, newYear);
                  }}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
                >
                  <option value="" className="bg-black text-white">JJJJ</option>
                  {years.map((y) => (
                    <option key={y} value={y} className="bg-black text-white">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Countdown Mode Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Countdown</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCountdownModeChange('count_up')}
                  className={`h-12 rounded-[4px] text-[14px] transition-all ${
                    countdownMode === 'count_up'
                      ? 'bg-white text-black'
                      : 'bg-transparent border border-white/30 text-white'
                  }`}
                >
                  Hochzählen
                </button>
                <button
                  onClick={() => handleCountdownModeChange('count_down')}
                  className={`h-12 rounded-[4px] text-[14px] transition-all ${
                    countdownMode === 'count_down'
                      ? 'bg-white text-black'
                      : 'bg-transparent border border-white/30 text-white'
                  }`}
                >
                  Runterzählen
                </button>
              </div>
            </div>

            {/* Walk Interval Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Erinnerung nach</span>
              <label className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] cursor-pointer relative">
                <span className="text-[14px] text-white w-[2ch] text-right">{intervalHours}</span>
                <span className="text-[14px] text-white ml-1">Stunden</span>
                <select
                  value={intervalHours}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h} className="bg-black text-white">{h}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Morning Walk Time Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Morgen-Spaziergang</span>
              <label className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px] cursor-pointer relative">
                <input
                  type="time"
                  value={morningTime}
                  onChange={(e) => handleMorningTimeChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="text-[14px] text-white">{morningTime}</span>
                <span className="text-[14px] text-white ml-1">Uhr</span>
              </label>
            </div>

            {/* Sleep Time Setting */}
            <div className="space-y-2">
              <span className="text-[14px] text-white">Schlafenszeit</span>
              <div className="flex items-center justify-center h-12 w-full bg-transparent border border-white/30 rounded-[4px]">
                <select
                  value={sleepStart}
                  onChange={(e) => handleSleepStartChange(parseFloat(e.target.value))}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
                >
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? '00' : '30';
                    const value = hour + (i % 2 === 0 ? 0 : 0.5);
                    return (
                      <option key={i} value={value} className="bg-black text-white">
                        {hour.toString().padStart(2, '0')}:{minute}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[14px] text-white ml-1 mr-1">bis</span>
                <select
                  value={sleepEnd}
                  onChange={(e) => handleSleepEndChange(parseFloat(e.target.value))}
                  className="bg-transparent text-white text-[14px] text-center border-none outline-none cursor-pointer"
                >
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? '00' : '30';
                    const value = hour + (i % 2 === 0 ? 0 : 0.5);
                    return (
                      <option key={i} value={value} className="bg-black text-white">
                        {hour.toString().padStart(2, '0')}:{minute}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[14px] text-white ml-1">Uhr</span>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default GassiSettingsSheet;
