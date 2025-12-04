import { useMemo } from 'react';
import { Event } from '@/lib/events';
import { format, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface TrendAnalysisProps {
  events: Event[];
}

const TrendAnalysis = ({ events }: TrendAnalysisProps) => {
  const weightData = useMemo(() => {
    return events
      .filter(e => e.type === 'gewicht' && e.weight_value)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(e => ({
        date: format(new Date(e.time), 'd.M', { locale: de }),
        value: e.weight_value,
      }));
  }, [events]);

  const phData = useMemo(() => {
    return events
      .filter(e => e.type === 'phwert' && e.ph_value)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(e => ({
        date: format(new Date(e.time), 'd.M', { locale: de }),
        value: parseFloat(e.ph_value!.replace(',', '.')),
      }));
  }, [events]);

  const pipiIntervalData = useMemo(() => {
    const pipiEvents = events
      .filter(e => e.type === 'pipi')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    const intervals: { date: string; value: number }[] = [];
    for (let i = 1; i < pipiEvents.length; i++) {
      const diff = differenceInMinutes(new Date(pipiEvents[i].time), new Date(pipiEvents[i - 1].time));
      intervals.push({
        date: format(new Date(pipiEvents[i].time), 'd.M', { locale: de }),
        value: Math.round(diff / 60 * 10) / 10, // hours with 1 decimal
      });
    }
    return intervals;
  }, [events]);

  const stuhlgangIntervalData = useMemo(() => {
    const stuhlgangEvents = events
      .filter(e => e.type === 'stuhlgang')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    const intervals: { date: string; value: number }[] = [];
    for (let i = 1; i < stuhlgangEvents.length; i++) {
      const diff = differenceInMinutes(new Date(stuhlgangEvents[i].time), new Date(stuhlgangEvents[i - 1].time));
      intervals.push({
        date: format(new Date(stuhlgangEvents[i].time), 'd.M', { locale: de }),
        value: Math.round(diff / 60 * 10) / 10, // hours with 1 decimal
      });
    }
    return intervals;
  }, [events]);

  const avgPipiInterval = useMemo(() => {
    if (pipiIntervalData.length === 0) return null;
    const sum = pipiIntervalData.reduce((acc, d) => acc + d.value, 0);
    return Math.round(sum / pipiIntervalData.length * 10) / 10;
  }, [pipiIntervalData]);

  const avgStuhlgangInterval = useMemo(() => {
    if (stuhlgangIntervalData.length === 0) return null;
    const sum = stuhlgangIntervalData.reduce((acc, d) => acc + d.value, 0);
    return Math.round(sum / stuhlgangIntervalData.length * 10) / 10;
  }, [stuhlgangIntervalData]);

  const ChartSection = ({ 
    title, 
    data, 
    unit, 
    color,
    average 
  }: { 
    title: string; 
    data: { date: string; value: number }[]; 
    unit: string; 
    color: string;
    average?: number | null;
  }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] text-white font-medium">{title}</h3>
        {average !== undefined && average !== null && (
          <span className="text-[12px] text-white/60">Ø {average} {unit}</span>
        )}
      </div>
      {data.length < 2 ? (
        <p className="text-[12px] text-white/40">Nicht genügend Daten</p>
      ) : (
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                tickLine={false}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#222', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                formatter={(value: number) => [`${value} ${unit}`, '']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <div className="pb-20">
      <ChartSection 
        title="🏋️ Gewicht" 
        data={weightData} 
        unit="kg" 
        color="#5AD940"
      />
      <ChartSection 
        title="🧪 pH-Wert" 
        data={phData} 
        unit="" 
        color="#FFD700"
      />
      <ChartSection 
        title="💦 Zeit zwischen Pipi" 
        data={pipiIntervalData} 
        unit="h" 
        color="#00BFFF"
        average={avgPipiInterval}
      />
      <ChartSection 
        title="💩 Zeit zwischen Stuhlgang" 
        data={stuhlgangIntervalData} 
        unit="h" 
        color="#CD853F"
        average={avgStuhlgangInterval}
      />
    </div>
  );
};

export default TrendAnalysis;
