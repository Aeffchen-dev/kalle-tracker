import { useMemo, memo, useRef, useState, useEffect } from 'react';
import { Event } from '@/lib/events';
import { format, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Area, AreaChart } from 'recharts';

interface TrendAnalysisProps {
  events: Event[];
}

interface ChartData {
  date: string;
  value: number;
}

const useContainerWidth = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return { containerRef, width };
};

const StatCard = memo(({ 
  emoji, 
  label, 
  value, 
  unit, 
  subtext,
  color 
}: { 
  emoji: string; 
  label: string; 
  value: string | number | null; 
  unit: string;
  subtext?: string;
  color: string;
}) => (
  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">{emoji}</span>
      <span className="text-[11px] text-white/50 uppercase tracking-wide">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-semibold" style={{ color }}>{value ?? '-'}</span>
      <span className="text-[12px] text-white/40">{unit}</span>
    </div>
    {subtext && <p className="text-[10px] text-white/30 mt-1">{subtext}</p>}
  </div>
));

StatCard.displayName = 'StatCard';

const WeightChart = memo(({ data, avgValue, color, width }: { data: ChartData[]; avgValue: number | null; color: string; width: number }) => {
  if (data.length < 2 || width === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="h-[180px] w-full overflow-hidden" data-vaul-no-drag>
      <AreaChart 
        width={width} 
        height={180} 
        data={data} 
        margin={{ top: 10, right: 10, bottom: 25, left: 0 }}
      >
        <defs>
          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="date" 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} 
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          dy={8}
        />
        <YAxis 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} 
          axisLine={false}
          tickLine={false}
          width={40}
          domain={[minValue - 2, maxValue + 2]}
          tickFormatter={(v) => `${v}kg`}
        />
        {avgValue && (
          <ReferenceLine 
            y={avgValue} 
            stroke="rgba(255,255,255,0.25)" 
            strokeDasharray="4 4" 
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#weightGradient)"
          isAnimationActive={false}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
        />
      </AreaChart>
    </div>
  );
});

WeightChart.displayName = 'WeightChart';

const PhChart = memo(({ data, avgValue, color, width }: { data: ChartData[]; avgValue: number | null; color: string; width: number }) => {
  if (data.length < 2 || width === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="h-[180px] w-full overflow-hidden" data-vaul-no-drag>
      <LineChart 
        width={width} 
        height={180} 
        data={data} 
        margin={{ top: 10, right: 10, bottom: 25, left: 0 }}
      >
        <XAxis 
          dataKey="date" 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} 
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          dy={8}
        />
        <YAxis 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} 
          axisLine={false}
          tickLine={false}
          width={35}
          domain={[minValue - 0.5, maxValue + 0.5]}
          tickFormatter={(v) => v.toFixed(1)}
        />
        {avgValue && (
          <ReferenceLine 
            y={avgValue} 
            stroke="rgba(255,255,255,0.25)" 
            strokeDasharray="4 4"
          />
        )}
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
});

PhChart.displayName = 'PhChart';

const TrendAnalysis = memo(({ events }: TrendAnalysisProps) => {
  const { containerRef, width } = useContainerWidth();
  
  const weightData = useMemo(() => {
    return events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(e => ({
        date: format(new Date(e.time), 'd.M HH:mm', { locale: de }),
        value: Number(e.weight_value),
      }));
  }, [events]);

  const phData = useMemo(() => {
    return events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(e => ({
        date: format(new Date(e.time), 'd.M HH:mm', { locale: de }),
        value: parseFloat(String(e.ph_value).replace(',', '.')),
      }));
  }, [events]);

  const pipiIntervalData = useMemo(() => {
    const pipiEvents = events
      .filter(e => e.type === 'pipi')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    const intervals: ChartData[] = [];
    for (let i = 1; i < pipiEvents.length; i++) {
      const diff = differenceInMinutes(new Date(pipiEvents[i].time), new Date(pipiEvents[i - 1].time));
      intervals.push({
        date: format(new Date(pipiEvents[i].time), 'd.M HH:mm', { locale: de }),
        value: Math.round(diff / 60 * 10) / 10,
      });
    }
    return intervals;
  }, [events]);

  const stuhlgangIntervalData = useMemo(() => {
    const stuhlgangEvents = events
      .filter(e => e.type === 'stuhlgang')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    const intervals: ChartData[] = [];
    for (let i = 1; i < stuhlgangEvents.length; i++) {
      const diff = differenceInMinutes(new Date(stuhlgangEvents[i].time), new Date(stuhlgangEvents[i - 1].time));
      intervals.push({
        date: format(new Date(stuhlgangEvents[i].time), 'd.M HH:mm', { locale: de }),
        value: Math.round(diff / 60 * 10) / 10,
      });
    }
    return intervals;
  }, [events]);

  const weightStats = useMemo(() => {
    if (weightData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const values = weightData.map(d => d.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }, [weightData]);

  const phStats = useMemo(() => {
    if (phData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const values = phData.map(d => d.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }, [phData]);

  const pipiStats = useMemo(() => {
    if (pipiIntervalData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const values = pipiIntervalData.map(d => d.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }, [pipiIntervalData]);

  const stuhlgangStats = useMemo(() => {
    if (stuhlgangIntervalData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const values = stuhlgangIntervalData.map(d => d.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }, [stuhlgangIntervalData]);

  return (
    <div className="pb-20 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard 
          emoji="🏋️" 
          label="Aktuelles Gewicht" 
          value={weightStats.latest} 
          unit="kg"
          subtext={weightStats.avg ? `Ø ${weightStats.avg} kg` : undefined}
          color="#5AD940"
        />
        <StatCard 
          emoji="🧪" 
          label="Letzter pH-Wert" 
          value={phStats.latest} 
          unit=""
          subtext={phStats.avg ? `Ø ${phStats.avg}` : undefined}
          color="#FFD700"
        />
        <StatCard 
          emoji="💦" 
          label="Ø Pipi-Intervall" 
          value={pipiStats.avg} 
          unit="h"
          subtext={pipiStats.min && pipiStats.max ? `${pipiStats.min}h - ${pipiStats.max}h` : undefined}
          color="#00BFFF"
        />
        <StatCard 
          emoji="💩" 
          label="Ø Stuhlgang" 
          value={stuhlgangStats.avg} 
          unit="h"
          subtext={stuhlgangStats.min && stuhlgangStats.max ? `${stuhlgangStats.min}h - ${stuhlgangStats.max}h` : undefined}
          color="#CD853F"
        />
      </div>

      {/* Charts */}
      <div ref={containerRef}>
        <div className="mb-6">
          <h3 className="text-[13px] text-white/60 font-medium mb-3">Gewichtsverlauf</h3>
          <WeightChart data={weightData} avgValue={weightStats.avg} color="#5AD940" width={width} />
        </div>
        <div className="mb-6">
          <h3 className="text-[13px] text-white/60 font-medium mb-3">pH-Wert Verlauf</h3>
          <PhChart data={phData} avgValue={phStats.avg} color="#FFD700" width={width} />
        </div>
      </div>
    </div>
  );
});

TrendAnalysis.displayName = 'TrendAnalysis';

export default TrendAnalysis;
