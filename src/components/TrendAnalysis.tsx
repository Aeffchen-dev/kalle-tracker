import { useMemo, memo, useRef, useState, useEffect } from 'react';
import { Event } from '@/lib/events';
import { format, differenceInMinutes, subDays, isAfter, differenceInMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Area, AreaChart, ComposedChart, Scatter, ResponsiveContainer } from 'recharts';

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

const Y_AXIS_WIDTH = 45;
const WEIGHT_MONTHS_IN_VIEW = 6;
const PH_MIN_POINT_WIDTH = 150;

const WeightChart = memo(({ data, avgValue, color, width }: { data: ChartData[]; avgValue: number | null; color: string; width: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to show latest data (right side)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  if (data.length < 2 || width === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const domainMin = minValue - 2;
  const domainMax = maxValue + 2;
  
  // Calculate chart width: always fill container, scroll if more than 6 months of data
  const scrollableWidth = width - Y_AXIS_WIDTH;
  const pointWidth = scrollableWidth / Math.min(data.length, WEIGHT_MONTHS_IN_VIEW * 4); // ~4 points per month as baseline
  const chartWidth = data.length <= WEIGHT_MONTHS_IN_VIEW * 4 
    ? scrollableWidth 
    : data.length * pointWidth;

  // Generate Y-axis ticks (rounded to whole numbers)
  const yTicks = [];
  const step = (domainMax - domainMin) / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(Math.round(domainMin + step * i));
  }

  return (
    <div className="flex h-[180px]">
      {/* Sticky Y-Axis */}
      <div className="flex-shrink-0 h-full flex flex-col justify-between py-[10px] pb-[25px]" style={{ width: Y_AXIS_WIDTH }}>
        {yTicks.reverse().map((tick, i) => (
          <span key={i} className="text-[9px] text-white/40">{tick}kg</span>
        ))}
      </div>
      {/* Scrollable Chart */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain'
        }}
      >
        <AreaChart 
          width={chartWidth} 
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
            interval={Math.max(0, Math.floor(data.length / 5) - 1)}
            dy={8}
            tickMargin={4}
          />
          <YAxis 
            hide
            domain={[domainMin, domainMax]}
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
    </div>
  );
});

WeightChart.displayName = 'WeightChart';

const PhChart = memo(({ data, avgValue, color, width }: { data: ChartData[]; avgValue: number | null; color: string; width: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to show last 6 months (right side)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  if (data.length < 2 || width === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const domainMin = minValue - 0.5;
  const domainMax = maxValue + 0.5;
  
  // Calculate chart width: fill container, scroll if many points (1 day = ~150px when scrolling)
  const scrollableWidth = width - Y_AXIS_WIDTH;
  const chartWidth = data.length <= 3 
    ? scrollableWidth 
    : Math.max(scrollableWidth, data.length * PH_MIN_POINT_WIDTH);

  // Generate Y-axis ticks
  const yTicks = [];
  const step = (domainMax - domainMin) / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(Math.round((domainMin + step * i) * 10) / 10);
  }

  return (
    <div className="flex h-[180px]" data-vaul-no-drag>
      {/* Sticky Y-Axis */}
      <div className="flex-shrink-0 h-full flex flex-col justify-between py-[10px] pb-[25px]" style={{ width: Y_AXIS_WIDTH }}>
        {yTicks.reverse().map((tick, i) => (
          <span key={i} className="text-[9px] text-white/40">{tick.toFixed(1)}</span>
        ))}
      </div>
      {/* Scrollable Chart */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
      >
        <LineChart 
          width={chartWidth} 
          height={180} 
          data={data} 
          margin={{ top: 10, right: 10, bottom: 25, left: 0 }}
        >
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} 
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            dy={8}
          />
          <YAxis 
            hide
            domain={[domainMin, domainMax]}
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
    </div>
  );
});

PhChart.displayName = 'PhChart';

// Growth curve constants - Kalle's birthday and target weight
const KALLE_BIRTHDAY = new Date('2025-01-20'); // Kalle's birthday
const TARGET_WEIGHT = 34; // kg at maturity (no decimal)

// Growth curve function - logarithmic growth model
// Based on the reference image: starts at ~7kg at 2 months, reaches ~32kg at 15 months
const getExpectedWeight = (ageInMonths: number): number => {
  if (ageInMonths < 2) return 6;
  if (ageInMonths > 18) return TARGET_WEIGHT;
  
  // Logarithmic growth curve fitting the reference data
  // At 2 months: ~7kg, at 6 months: ~22kg, at 12 months: ~28kg, at 15 months: ~32kg
  const a = 34; // asymptote (target weight)
  const b = 0.25; // growth rate
  const c = 0.5; // x-offset
  
  return a * (1 - Math.exp(-b * (ageInMonths - c)));
};

// Generate growth curve data points with optional weight measurement
const generateGrowthCurveData = (weightMeasurements: GrowthDataPoint[]) => {
  const data = [];
  for (let month = 2; month <= 18; month += 0.5) {
    const expected = getExpectedWeight(month);
    // Find if there's a weight measurement close to this month
    const measurement = weightMeasurements.find(m => Math.abs(m.month - month) < 0.3);
    data.push({
      month,
      expected,
      upperBound: expected * 1.05,
      lowerBound: expected * 0.95,
      weight: measurement?.weight,
      isOutOfBounds: measurement?.isOutOfBounds,
    });
  }
  
  // Also add exact measurement points that might not align with 0.5 increments
  weightMeasurements.forEach(m => {
    const exists = data.some(d => Math.abs(d.month - m.month) < 0.3);
    if (!exists) {
      const expected = getExpectedWeight(m.month);
      data.push({
        month: m.month,
        expected,
        upperBound: expected * 1.05,
        lowerBound: expected * 0.95,
        weight: m.weight,
        isOutOfBounds: m.isOutOfBounds,
      });
    }
  });
  
  return data.sort((a, b) => a.month - b.month);
};

interface GrowthDataPoint {
  month: number;
  weight: number;
  isOutOfBounds: boolean;
}

const GrowthCurveChart = memo(({ events, width }: { events: Event[]; width: number }) => {
  const weightMeasurements = useMemo((): GrowthDataPoint[] => {
    return events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .map(e => {
        const eventDate = new Date(e.time);
        const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + 
          (eventDate.getDate() / 30); // Add partial month
        const weight = Number(e.weight_value);
        const expected = getExpectedWeight(ageInMonths);
        const upperBound = expected * 1.05;
        const lowerBound = expected * 0.95;
        const isOutOfBounds = weight > upperBound || weight < lowerBound;
        
        return {
          month: Math.round(ageInMonths * 10) / 10,
          weight,
          isOutOfBounds,
        };
      })
      .filter(d => d.month >= 2 && d.month <= 18);
  }, [events]);

  const growthCurveData = useMemo(() => generateGrowthCurveData(weightMeasurements), [weightMeasurements]);

  if (width === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Lade...</p>
      </div>
    );
  }

  // Separate data for normal and out-of-bounds points
  const normalPoints = weightMeasurements.filter(p => !p.isOutOfBounds);
  const outOfBoundsPoints = weightMeasurements.filter(p => p.isOutOfBounds);

  return (
    <div data-vaul-no-drag>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
          >
            <XAxis
              dataKey="month"
              type="number"
              domain={[2, 18]}
              ticks={[2, 4, 6, 8, 10, 12, 14, 16, 18]}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
              label={{ value: 'Alter (Monate)', position: 'bottom', offset: 10, fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            />
            <YAxis
              domain={[0, 36]}
              ticks={[0, 10, 20, 30]}
              tickFormatter={(value) => `${value}kg`}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
              width={40}
            />
            {/* Upper bound line (+5%) */}
            <Line
              data={growthCurveData}
              type="monotone"
              dataKey="upperBound"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            {/* Lower bound line (-5%) */}
            <Line
              data={growthCurveData}
              type="monotone"
              dataKey="lowerBound"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            {/* Main growth curve */}
            <Line
              data={growthCurveData}
              type="monotone"
              dataKey="expected"
              stroke="#ffffff"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
            {/* Normal weight points (green) */}
            <Scatter
              data={normalPoints}
              dataKey="weight"
              fill="#5AD940"
              isAnimationActive={false}
            />
            {/* Out of bounds weight points (red) */}
            <Scatter
              data={outOfBoundsPoints}
              dataKey="weight"
              fill="#FF4444"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-white/60 justify-center mt-4 pt-2">
        <div className="flex items-center gap-1">
          <div className="w-4 h-[3px] bg-white rounded"></div>
          <span>Ziel: {TARGET_WEIGHT} kg</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-[1px] bg-white/30"></div>
          <span>±5%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#5AD940]"></div>
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#FF4444]"></div>
          <span>Abweichung</span>
        </div>
      </div>
    </div>
  );
});

GrowthCurveChart.displayName = 'GrowthCurveChart';

const TrendAnalysis = memo(({ events }: TrendAnalysisProps) => {
  const { containerRef, width } = useContainerWidth();
  
  const weightData = useMemo(() => {
    return events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(e => ({
        date: format(new Date(e.time), 'MMM yy', { locale: de }),
        value: Number(e.weight_value),
      }));
  }, [events]);

  const phData = useMemo(() => {
    return events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(e => ({
        date: format(new Date(e.time), 'd.M', { locale: de }),
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

  // Filter events from last 7 days for average calculations
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

  const weightStats = useMemo(() => {
    if (weightData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const allValues = weightData.map(d => d.value);
    
    // Filter weight events from last 7 days for average
    const last7DaysWeights = events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .map(e => Number(e.weight_value));
    
    const avg = last7DaysWeights.length > 0 
      ? Math.round(last7DaysWeights.reduce((a, b) => a + b, 0) / last7DaysWeights.length * 10) / 10
      : null;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
    };
  }, [weightData, events, sevenDaysAgo]);

  const phStats = useMemo(() => {
    if (phData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const allValues = phData.map(d => d.value);
    
    // Filter pH events from last 7 days for average
    const last7DaysPh = events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .map(e => parseFloat(String(e.ph_value).replace(',', '.')));
    
    const avg = last7DaysPh.length > 0 
      ? Math.round(last7DaysPh.reduce((a, b) => a + b, 0) / last7DaysPh.length * 10) / 10
      : null;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
    };
  }, [phData, events, sevenDaysAgo]);

  const pipiStats = useMemo(() => {
    if (pipiIntervalData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const allValues = pipiIntervalData.map(d => d.value);
    
    // Calculate intervals only from last 7 days for average
    const pipiEvents = events
      .filter(e => e.type === 'pipi')
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    const last7DaysIntervals: number[] = [];
    for (let i = 1; i < pipiEvents.length; i++) {
      const diff = differenceInMinutes(new Date(pipiEvents[i].time), new Date(pipiEvents[i - 1].time));
      last7DaysIntervals.push(Math.round(diff / 60 * 10) / 10);
    }
    
    const avg = last7DaysIntervals.length > 0 
      ? Math.round(last7DaysIntervals.reduce((a, b) => a + b, 0) / last7DaysIntervals.length * 10) / 10
      : null;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
    };
  }, [pipiIntervalData, events, sevenDaysAgo]);

  const stuhlgangStats = useMemo(() => {
    if (stuhlgangIntervalData.length === 0) return { avg: null, min: null, max: null, latest: null };
    const allValues = stuhlgangIntervalData.map(d => d.value);
    
    // Calculate intervals only from last 7 days for average
    const stuhlgangEvents = events
      .filter(e => e.type === 'stuhlgang')
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    const last7DaysIntervals: number[] = [];
    for (let i = 1; i < stuhlgangEvents.length; i++) {
      const diff = differenceInMinutes(new Date(stuhlgangEvents[i].time), new Date(stuhlgangEvents[i - 1].time));
      last7DaysIntervals.push(Math.round(diff / 60 * 10) / 10);
    }
    
    const avg = last7DaysIntervals.length > 0 
      ? Math.round(last7DaysIntervals.reduce((a, b) => a + b, 0) / last7DaysIntervals.length * 10) / 10
      : null;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
    };
  }, [stuhlgangIntervalData, events, sevenDaysAgo]);

  return (
    <div className="pb-20 space-y-6" data-vaul-no-drag>
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
      <div ref={containerRef} className="mt-2">
        {/* Growth Curve Chart */}
        <div className="mb-8 relative">
          <h3 className="text-[13px] text-white/60 font-medium mb-3">Wachstumskurve</h3>
          <GrowthCurveChart events={events} width={width} />
        </div>
        
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
