import { useMemo, memo, useRef, useState, useEffect } from 'react';
import { Event } from '@/lib/events';
import { format, differenceInMinutes, subDays, isAfter, differenceInMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ZAxis, ReferenceLine, Area, AreaChart, ComposedChart, Scatter, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendAnalysisProps {
  events: Event[];
}

interface ChartData {
  date: string;
  value: number;
  isOutOfBounds?: boolean;
  expectedWeight?: number;
}

interface PhChartData {
  dateLine1: string;
  dateLine2: string;
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
  trend
}: { 
  emoji: string; 
  label: string; 
  value: string | number | null; 
  unit: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">{emoji}</span>
      <span className="text-[11px] text-white/50 uppercase tracking-wide">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-white">{value ?? '-'}</span>
        <span className="text-[12px] text-white/40">{unit}</span>
      </div>
      {trend === 'up' && <TrendingUp size={18} className="text-[#5AD940]" />}
      {trend === 'down' && <TrendingDown size={18} className="text-[#FF4444]" />}
      {trend === 'neutral' && <Minus size={18} className="text-white/40" />}
    </div>
    {subtext && <p className="text-[10px] text-white/30 mt-1">{subtext}</p>}
  </div>
));

StatCard.displayName = 'StatCard';

const Y_AXIS_WIDTH = 40;
const CHART_HEIGHT = 150;
const X_AXIS_HEIGHT = 25;
const PH_X_AXIS_HEIGHT = 35;
const GRID_STROKE = "rgba(255,255,255,0.1)";
const GRID_DASH = "3 3";

const WeightChart = memo(({ data, avgValue, color, width }: { data: ChartData[]; avgValue: number | null; color: string; width: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Calculate chart width based on data points (min 60px per point for readability)
  const scrollableWidth = Math.max(width - Y_AXIS_WIDTH, data.length * 60);
  
  // Scroll to end (most recent data) on mount
  useEffect(() => {
    if (scrollRef.current && data.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length, width]);

  if (data.length < 2 || width === 0) {
    return (
      <div className="h-[185px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  
  // Round to nearest 5 for clean Y-axis ticks
  const domainMin = Math.floor(minValue / 5) * 5;
  const domainMax = Math.ceil(maxValue / 5) * 5;
  
  // Generate ticks
  const yTicks: number[] = [];
  for (let i = domainMin; i <= domainMax; i += 5) {
    yTicks.push(i);
  }

  const totalHeight = CHART_HEIGHT + X_AXIS_HEIGHT;

  return (
    <div className="flex">
      {/* Sticky Y-Axis */}
      <div 
        className="flex-shrink-0 flex flex-col justify-between text-right"
        style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT, paddingTop: 8, paddingBottom: 8, paddingLeft: 0, paddingRight: 4 }}
      >
        {[...yTicks].reverse().map((tick, i) => (
          <span key={i} className="text-[9px] text-white/40 leading-none">{tick}kg</span>
        ))}
      </div>
      {/* Scrollable Chart Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain'
        }}
      >
        <ComposedChart 
          width={scrollableWidth} 
          height={totalHeight} 
          data={data} 
          margin={{ top: 8, right: 0, bottom: X_AXIS_HEIGHT, left: 0 }}
        >
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            horizontal={true} 
            vertical={false} 
            stroke={GRID_STROKE}
            strokeDasharray={GRID_DASH}
          />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} 
            axisLine={false}
            tickLine={false}
            interval={0}
            tickMargin={8}
          />
          <YAxis 
            hide
            domain={[domainMin, domainMax]}
            ticks={yTicks}
          />
          {/* Growth curve reference line - same style as Wachstumskurve */}
          <Line
            type="monotone"
            dataKey="expectedWeight"
            stroke="#ffffff"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
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
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (cx === undefined || cy === undefined) return null;
              const dotColor = payload.isOutOfBounds ? '#FF4444' : '#5AD940';
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={dotColor}
                  fillOpacity={1}
                />
              );
            }}
          />
        </ComposedChart>
      </div>
    </div>
  );
});

WeightChart.displayName = 'WeightChart';

const PhChart = memo(({ data, avgValue, color, width }: { data: PhChartData[]; avgValue: number | null; color: string; width: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Calculate chart width based on data points (min 80px per point for readability)
  const scrollableWidth = Math.max(width - Y_AXIS_WIDTH, data.length * 80);
  
  // Scroll to end (most recent data) on mount
  useEffect(() => {
    if (scrollRef.current && data.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length, width]);

  if (data.length < 2 || width === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const domainMin = Math.floor((minValue - 0.5) * 10) / 10;
  const domainMax = Math.ceil((maxValue + 0.5) * 10) / 10;
  
  // Generate Y-axis ticks
  const yTicks: number[] = [];
  const step = (domainMax - domainMin) / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(Math.round((domainMin + step * i) * 10) / 10);
  }

  // Custom tick component for multiline X-axis labels
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const dataPoint = data[payload.index];
    if (!dataPoint) return null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={10} 
          textAnchor="middle" 
          fill="rgba(255,255,255,0.4)" 
          fontSize={9}
        >
          {dataPoint.dateLine1}
        </text>
        <text 
          x={0} 
          y={0} 
          dy={22} 
          textAnchor="middle" 
          fill="rgba(255,255,255,0.4)" 
          fontSize={9}
        >
          {dataPoint.dateLine2}
        </text>
      </g>
    );
  };

  const totalHeight = CHART_HEIGHT + PH_X_AXIS_HEIGHT;

  return (
    <div className="flex">
      {/* Sticky Y-Axis */}
      <div 
        className="flex-shrink-0 flex flex-col justify-between text-right"
        style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT, paddingTop: 8, paddingBottom: 8, paddingLeft: 0, paddingRight: 4 }}
      >
        {[...yTicks].reverse().map((tick, i) => (
          <span key={i} className="text-[9px] text-white/40 leading-none">{tick.toFixed(1)}</span>
        ))}
      </div>
      {/* Scrollable Chart Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain'
        }}
      >
        <AreaChart 
          width={scrollableWidth} 
          height={totalHeight} 
          data={data} 
          margin={{ top: 8, right: 0, bottom: PH_X_AXIS_HEIGHT, left: 0 }}
        >
          <defs>
            <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            horizontal={true} 
            vertical={false} 
            stroke={GRID_STROKE}
            strokeDasharray={GRID_DASH}
          />
          <XAxis 
            dataKey="dateLine1"
            tick={<CustomXAxisTick />}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis 
            hide
            domain={[domainMin, domainMax]}
            ticks={yTicks}
          />
          {/* pH boundary lines at 6.5 and 7.2 */}
          <ReferenceLine 
            y={6.5} 
            stroke="rgba(255,255,255,0.3)" 
            strokeDasharray="4 4"
            label={{ value: '6.5', position: 'right', fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
          />
          <ReferenceLine 
            y={7.2} 
            stroke="rgba(255,255,255,0.3)" 
            strokeDasharray="4 4"
            label={{ value: '7.2', position: 'right', fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
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
            fill="url(#phGradient)"
            dot={(props: any) => {
              const phValue = props.payload?.value;
              // pH < 6.5 or > 7.2 is red, otherwise green (matching EventSheet)
              const isOutOfRange = phValue < 6.5 || phValue > 7.2;
              const dotColor = isOutOfRange ? '#FF4444' : '#5AD940';
              return (
                <circle 
                  key={props.key}
                  cx={props.cx} 
                  cy={props.cy} 
                  r={4} 
                  fill={dotColor} 
                  fillOpacity={1}
                />
              );
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </div>
    </div>
  );
});

PhChart.displayName = 'PhChart';

// Growth curve constants - Kalle's birthday and target weight
const KALLE_BIRTHDAY = new Date('2025-01-20'); // Kalle's birthday
const TARGET_WEIGHT = 34; // kg at maturity (no decimal)

// Expected weight data points based on Dalmatian growth chart
const EXPECTED_WEIGHTS: { [month: number]: number } = {
  2: 7,
  3: 11,
  4: 15,
  5: 19,
  6: 22,
  7: 24,
  8: 26,
  9: 27,
  10: 28,
  11: 29,
  12: 30,
  13: 31,
  14: 32,
  15: 33,
  18: 34,
};

// Growth curve function - linear interpolation between known data points
const getExpectedWeight = (ageInMonths: number): number => {
  if (ageInMonths < 2) return 7;
  if (ageInMonths >= 18) return TARGET_WEIGHT;
  
  // Get the two closest months for interpolation
  const months = Object.keys(EXPECTED_WEIGHTS).map(Number).sort((a, b) => a - b);
  
  // Find the two months to interpolate between
  let lowerMonth = months[0];
  let upperMonth = months[months.length - 1];
  
  for (let i = 0; i < months.length - 1; i++) {
    if (ageInMonths >= months[i] && ageInMonths <= months[i + 1]) {
      lowerMonth = months[i];
      upperMonth = months[i + 1];
      break;
    }
  }
  
  // Linear interpolation
  const lowerWeight = EXPECTED_WEIGHTS[lowerMonth];
  const upperWeight = EXPECTED_WEIGHTS[upperMonth];
  const ratio = (ageInMonths - lowerMonth) / (upperMonth - lowerMonth);
  
  return lowerWeight + (upperWeight - lowerWeight) * ratio;
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

// Helper function to check if a weight is out of bounds (exported for use in CalendarView)
export const isWeightOutOfBounds = (weight: number, eventDate: Date): boolean => {
  const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + (eventDate.getDate() / 30);
  if (ageInMonths < 2 || ageInMonths > 18) return false;
  const expected = getExpectedWeight(ageInMonths);
  const upperBound = expected * 1.05;
  const lowerBound = expected * 0.95;
  return weight > upperBound || weight < lowerBound;
};

const GrowthCurveChart = memo(({ events, width }: { events: Event[]; width: number }) => {
  const weightMeasurements = useMemo((): GrowthDataPoint[] => {
    return events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .map(e => {
        const eventDate = new Date(e.time);
        const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + 
          (eventDate.getDate() / 30);
        const weight = Number(e.weight_value);
        const isOutOfBounds = isWeightOutOfBounds(weight, eventDate);
        
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
      <div className="h-[185px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Lade...</p>
      </div>
    );
  }

  // Separate data for normal and out-of-bounds points
  const normalPoints = weightMeasurements.filter(p => !p.isOutOfBounds);
  const outOfBoundsPoints = weightMeasurements.filter(p => p.isOutOfBounds);
  
  // Calculate Kalle's current age in months
  const currentAgeInMonths = differenceInMonths(new Date(), KALLE_BIRTHDAY) + (new Date().getDate() / 30);
  
  // Y-axis ticks - 5kg steps
  const yTicks = [5, 10, 15, 20, 25, 30, 35];
  const totalHeight = CHART_HEIGHT + X_AXIS_HEIGHT;

  return (
    <div>
      <ComposedChart
        width={width}
        height={totalHeight}
        data={growthCurveData}
        margin={{ top: 8, right: 15, bottom: X_AXIS_HEIGHT, left: 0 }}
      >
        <CartesianGrid 
          horizontal={true} 
          vertical={false} 
          stroke={GRID_STROKE}
          strokeDasharray={GRID_DASH}
        />
        <XAxis
          dataKey="month"
          type="number"
          domain={[2, 18]}
          ticks={[2, 6, 10, 14, 18]}
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}M`}
          tickMargin={8}
        />
        <YAxis
          domain={[5, 35]}
          ticks={yTicks}
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, textAnchor: 'start', dx: -35 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}kg`}
          width={40}
          orientation="left"
        />
        {/* Current age vertical line */}
        {currentAgeInMonths >= 2 && currentAgeInMonths <= 18 && (
          <ReferenceLine 
            x={Math.round(currentAgeInMonths * 10) / 10}
            stroke="#5AD940"
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{ value: 'Heute', position: 'top', fill: '#5AD940', fontSize: 9 }}
          />
        )}
        {/* Upper bound line (+5%) */}
        <Line
          type="monotone"
          dataKey="upperBound"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          dot={false}
          isAnimationActive={false}
        />
        {/* Lower bound line (-5%) */}
        <Line
          type="monotone"
          dataKey="lowerBound"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          dot={false}
          isAnimationActive={false}
        />
        {/* Main growth curve */}
        <Line
          type="monotone"
          dataKey="expected"
          stroke="#ffffff"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {/* Weight measurement points */}
        {normalPoints.length > 0 && (
          <Scatter
            name="normal"
            data={normalPoints.map(p => ({ month: p.month, weight: p.weight }))}
            dataKey="weight"
            fill="#5AD940"
            isAnimationActive={false}
          >
            {normalPoints.map((_, index) => (
              <circle key={`normal-${index}`} r={4} fill="#5AD940" fillOpacity={1} />
            ))}
          </Scatter>
        )}
        {outOfBoundsPoints.length > 0 && (
          <Scatter
            name="outOfBounds"
            data={outOfBoundsPoints.map(p => ({ month: p.month, weight: p.weight }))}
            dataKey="weight"
            fill="#FF4444"
            isAnimationActive={false}
          >
            {outOfBoundsPoints.map((_, index) => (
              <circle key={`oob-${index}`} r={4} fill="#FF4444" fillOpacity={1} />
            ))}
          </Scatter>
        )}
      </ComposedChart>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-white/60 justify-center mt-2">
        <div className="flex items-center gap-1">
          <div className="w-4 h-[2px] bg-white rounded"></div>
          <span>Ziel: {TARGET_WEIGHT}kg</span>
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
      .map(e => {
        const eventDate = new Date(e.time);
        const weight = Number(e.weight_value);
        const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + (eventDate.getDate() / 30);
        const expectedWeight = getExpectedWeight(ageInMonths);
        return {
          date: format(eventDate, 'MMM yy', { locale: de }),
          value: weight,
          isOutOfBounds: isWeightOutOfBounds(weight, eventDate),
          expectedWeight: Math.round(expectedWeight * 10) / 10,
        };
      });
  }, [events]);

  const phData = useMemo(() => {
    const filtered = events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    return filtered.map((e, index) => {
      const eventDate = new Date(e.time);
      const prevDate = index > 0 ? new Date(filtered[index - 1].time) : null;
      
      // Show year only when year changes (between Dec and Jan)
      const showYear = prevDate && eventDate.getFullYear() !== prevDate.getFullYear();
      const dateFormat = showYear ? 'd. MMM yy' : 'd. MMM';
      
      return {
        dateLine1: format(eventDate, dateFormat, { locale: de }),
        dateLine2: format(eventDate, 'HH:mm', { locale: de }) + ' Uhr',
        value: parseFloat(String(e.ph_value).replace(',', '.')),
      };
    });
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

  // Filter events from last 7 days and last 30 days for calculations
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);

  const weightStats = useMemo(() => {
    if (weightData.length === 0) return { avg: null, min: null, max: null, latest: null, idealWeight: null, trend: null as 'up' | 'down' | 'neutral' | null };
    const allValues = weightData.map(d => d.value);
    
    // Filter weight events from last 7 days for average
    const last7DaysWeights = events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .map(e => Number(e.weight_value));
    
    const avg = last7DaysWeights.length > 0 
      ? Math.round(last7DaysWeights.reduce((a, b) => a + b, 0) / last7DaysWeights.length * 10) / 10
      : null;
    
    // Get ideal weight at time of last measurement
    const lastWeightEvent = events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
    
    let idealWeight: number | null = null;
    let trend: 'up' | 'down' | 'neutral' | null = null;
    
    if (lastWeightEvent) {
      const eventDate = new Date(lastWeightEvent.time);
      const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + (eventDate.getDate() / 30);
      idealWeight = Math.round(getExpectedWeight(ageInMonths) * 10) / 10;
      
      const latestWeight = Number(lastWeightEvent.weight_value);
      const diff = latestWeight - idealWeight;
      const tolerance = idealWeight * 0.02; // 2% tolerance for neutral
      
      if (Math.abs(diff) <= tolerance) {
        trend = 'neutral';
      } else if (diff > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }
    }
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
      idealWeight,
      trend,
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
    if (pipiIntervalData.length === 0) return { avg: null, min: null, max: null, latest: null, avgPerDay: null };
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
    
    // Calculate average per day (last 30 days) - only count days with entries
    const last30DaysPipi = events
      .filter(e => e.type === 'pipi')
      .filter(e => isAfter(new Date(e.time), thirtyDaysAgo));
    
    // Get unique days with pipi entries
    const uniqueDaysWithPipi = new Set(
      last30DaysPipi.map(e => format(new Date(e.time), 'yyyy-MM-dd'))
    );
    const daysWithEntries = uniqueDaysWithPipi.size;
    
    const avgPerDay = last30DaysPipi.length > 0 && daysWithEntries > 0
      ? Math.round(last30DaysPipi.length / daysWithEntries * 10) / 10
      : null;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
      avgPerDay,
    };
  }, [pipiIntervalData, events, sevenDaysAgo, thirtyDaysAgo]);

  const stuhlgangStats = useMemo(() => {
    if (stuhlgangIntervalData.length === 0) return { avg: null, min: null, max: null, latest: null, avgPerDay: null };
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
    
    // Calculate average per day (last 30 days) - only count days with entries
    const last30DaysStuhlgang = events
      .filter(e => e.type === 'stuhlgang')
      .filter(e => isAfter(new Date(e.time), thirtyDaysAgo));
    
    // Get unique days with stuhlgang entries
    const uniqueDaysWithStuhlgang = new Set(
      last30DaysStuhlgang.map(e => format(new Date(e.time), 'yyyy-MM-dd'))
    );
    const daysWithEntries = uniqueDaysWithStuhlgang.size;
    
    const avgPerDay = last30DaysStuhlgang.length > 0 && daysWithEntries > 0
      ? Math.round(last30DaysStuhlgang.length / daysWithEntries * 10) / 10
      : null;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
      avgPerDay,
    };
  }, [stuhlgangIntervalData, events, sevenDaysAgo, thirtyDaysAgo]);

  return (
    <div className="pb-20 space-y-6" data-vaul-no-drag>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard 
          emoji="🏋️" 
          label="Aktuelles Gewicht" 
          value={weightStats.latest} 
          unit="kg"
          subtext={weightStats.idealWeight ? `Ideal: ${weightStats.idealWeight} kg` : undefined}
        />
        <StatCard 
          emoji="🧪" 
          label="Letzter pH-Wert" 
          value={phStats.latest} 
          unit=""
          subtext={phStats.avg ? `Ø ${phStats.avg}` : undefined}
        />
        <StatCard 
          emoji="💦" 
          label="Ø Pipi-Intervall" 
          value={pipiStats.avg} 
          unit="h"
          subtext={pipiStats.avgPerDay ? `Ø ${pipiStats.avgPerDay}x pro Tag` : undefined}
        />
        <StatCard 
          emoji="💩" 
          label="Ø Stuhlgang" 
          value={stuhlgangStats.avg} 
          unit="h"
          subtext={stuhlgangStats.avgPerDay ? `Ø ${stuhlgangStats.avgPerDay}x pro Tag` : undefined}
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
        <div className="mb-6 pb-10">
          <h3 className="text-[13px] text-white/60 font-medium mb-3">pH-Wert Verlauf</h3>
          <PhChart data={phData} avgValue={phStats.avg} color="#FFD700" width={width} />
        </div>
      </div>
    </div>
  );
});

TrendAnalysis.displayName = 'TrendAnalysis';

export default TrendAnalysis;
