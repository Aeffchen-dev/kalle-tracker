import { useMemo, memo, useRef, useState, useEffect, useCallback } from 'react';
import { Event } from '@/lib/events';
import { format, differenceInMinutes, subDays, isAfter, differenceInMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TrendAnalysisProps {
  events: Event[];
}

// Helper to format numbers with German comma separator
const formatDecimal = (value: number, decimals: number = 1): string => {
  return value.toFixed(decimals).replace('.', ',');
};

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
      <span className="text-[11px] text-white/50 uppercase tracking-wide whitespace-pre-line">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-white">
          {value !== null && value !== undefined ? String(value).replace('.', ',') : '-'}
        </span>
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

const CHART_HEIGHT = 180;
const FONT_FAMILY = "'Rauschen B', system-ui, sans-serif";

// Growth curve constants - Kalle's birthday and target weight
const KALLE_BIRTHDAY = new Date('2025-01-20');
const TARGET_WEIGHT = 34;

// Expected weight data points based on Dalmatian growth chart
const EXPECTED_WEIGHTS: { [month: number]: number } = {
  2: 7, 3: 11, 4: 15, 5: 19, 6: 22, 7: 24, 8: 26, 9: 27, 10: 28, 11: 29, 12: 30, 13: 31, 14: 32, 15: 33, 18: 34,
};

const getExpectedWeight = (ageInMonths: number): number => {
  if (ageInMonths < 2) return 7;
  if (ageInMonths >= 18) return TARGET_WEIGHT;
  
  const months = Object.keys(EXPECTED_WEIGHTS).map(Number).sort((a, b) => a - b);
  let lowerMonth = months[0];
  let upperMonth = months[months.length - 1];
  
  for (let i = 0; i < months.length - 1; i++) {
    if (ageInMonths >= months[i] && ageInMonths <= months[i + 1]) {
      lowerMonth = months[i];
      upperMonth = months[i + 1];
      break;
    }
  }
  
  const lowerWeight = EXPECTED_WEIGHTS[lowerMonth];
  const upperWeight = EXPECTED_WEIGHTS[upperMonth];
  const ratio = (ageInMonths - lowerMonth) / (upperMonth - lowerMonth);
  
  return lowerWeight + (upperWeight - lowerWeight) * ratio;
};

export const isWeightOutOfBounds = (weight: number, eventDate: Date): boolean => {
  const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + (eventDate.getDate() / 30);
  if (ageInMonths < 2 || ageInMonths > 18) return false;
  const expected = getExpectedWeight(ageInMonths);
  const upperBound = expected * 1.05;
  const lowerBound = expected * 0.95;
  return weight > upperBound || weight < lowerBound;
};

interface WeightChartData {
  date: string;
  value: number;
  expectedWeight: number;
  isOutOfBounds: boolean;
}

const WeightChart = memo(({ data, width }: { data: WeightChartData[]; width: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const isZoomedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  const handleChartClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      const chart = chartRef.current?.getEchartsInstance();
      if (chart) {
        if (isZoomedRef.current) {
          // Reset zoom
          chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
          isZoomedRef.current = false;
        } else {
          // Zoom in 50%
          chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 });
          isZoomedRef.current = true;
        }
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  if (data.length < 2) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => Math.min(d.value, d.expectedWeight)));
  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.expectedWeight)));
  const domainMin = Math.floor(minValue / 5) * 5;
  const domainMax = Math.ceil(maxValue / 5) * 5;
  
  // Calculate width based on data points
  const chartWidth = Math.max(width - 45, data.length * 60);

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 500,
    textStyle: { fontFamily: FONT_FAMILY },
    tooltip: {
      trigger: 'item',
      confine: false,
      backgroundColor: 'rgba(0,0,0,0.9)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12,
        fontFamily: FONT_FAMILY,
      },
      formatter: (params: any) => {
        const idx = params.dataIndex;
        const d = data[idx];
        const status = d.isOutOfBounds ? '<span style="color:#FF4444">⚠️ Abweichung</span>' : '<span style="color:#5AD940">✓ Normal</span>';
        return `<div style="padding:4px 0">
          <div style="font-weight:600;margin-bottom:4px">${d.date}</div>
          <div>Gewicht: <b>${String(d.value).replace('.', ',')} kg</b></div>
          <div>Ideal: ${String(d.expectedWeight).replace('.', ',')} kg</div>
          <div style="margin-top:4px">${status}</div>
        </div>`;
      },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        minSpan: 33, // Max 3x zoom (100/3 = 33%)
        maxSpan: 100,
      },
    ],
    grid: {
      left: 0,
      right: 10,
      top: 10,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontFamily: FONT_FAMILY,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      min: domainMin,
      max: domainMax,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255,255,255,0.1)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'Gewicht',
        type: 'line',
        data: data.map(d => d.value),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#ffffff',
          width: 2,
        },
        itemStyle: {
          color: (params: any) => {
            return data[params.dataIndex]?.isOutOfBounds ? '#FF4444' : '#5AD940';
          },
          opacity: 1,
        },
        emphasis: {
          scale: 1.8,
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 3,
            shadowBlur: 12,
            shadowColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
        z: 10,
      },
    ],
  };

  return (
    <div className="flex">
      {/* Static Y-Axis */}
      <div className="flex-shrink-0 flex flex-col justify-between text-right pr-2" style={{ width: 40, height: CHART_HEIGHT - 30, marginTop: 10 }}>
        {Array.from({ length: Math.floor((domainMax - domainMin) / 5) + 1 }, (_, i) => domainMax - i * 5).map((tick, i) => (
          <span key={i} className="text-[9px] text-white/40 leading-none" style={{ fontFamily: FONT_FAMILY }}>{tick}kg</span>
        ))}
      </div>
      {/* Scrollable Chart */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ width: chartWidth, height: CHART_HEIGHT }} onClick={handleChartClick}>
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: CHART_HEIGHT, width: chartWidth }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    </div>
  );
});

WeightChart.displayName = 'WeightChart';

interface PhChartData {
  dateLine1: string;
  dateLine2: string;
  value: number;
}

const PhChart = memo(({ data, width }: { data: PhChartData[]; width: number }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const isZoomedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  const handleChartClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const chart = chartRef.current?.getEchartsInstance();
      if (chart) {
        if (isZoomedRef.current) {
          chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
          isZoomedRef.current = false;
        } else {
          chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 });
          isZoomedRef.current = true;
        }
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  if (data.length < 2) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">Nicht genügend Daten</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const domainMin = Math.floor((minValue - 0.5) * 10) / 10;
  const domainMax = Math.ceil((maxValue + 0.5) * 10) / 10;
  
  // Calculate width based on data points
  const chartWidth = Math.max(width - 45, data.length * 80);
  
  // Generate Y ticks
  const yTicks: number[] = [];
  const step = (domainMax - domainMin) / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(Math.round((domainMin + step * i) * 10) / 10);
  }

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 500,
    textStyle: { fontFamily: FONT_FAMILY },
    tooltip: {
      trigger: 'item',
      confine: false,
      position: function (point: number[], params: any, dom: HTMLElement, rect: any, size: { contentSize: number[], viewSize: number[] }) {
        // Position tooltip below the point if it would be cut off at the top
        const tooltipHeight = size.contentSize[1];
        const pointY = point[1];
        
        // If tooltip would extend above the chart, position it below the point
        if (pointY - tooltipHeight < 0) {
          return [point[0] - size.contentSize[0] / 2, pointY + 20];
        }
        // Otherwise position above the point
        return [point[0] - size.contentSize[0] / 2, pointY - tooltipHeight - 10];
      },
      backgroundColor: 'rgba(0,0,0,0.9)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12,
        fontFamily: FONT_FAMILY,
      },
      formatter: (params: any) => {
        const idx = params.dataIndex;
        const d = data[idx];
        const ph = d.value;
        const isOutOfRange = ph < 6.5 || ph > 7.2;
        const status = isOutOfRange ? '<span style="color:#FF4444">⚠️ Außerhalb (6,5-7,2)</span>' : '<span style="color:#5AD940">✓ Normal</span>';
        return `<div style="padding:4px 0">
          <div style="font-weight:600;margin-bottom:4px">${d.dateLine1}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:11px">${d.dateLine2}</div>
          <div style="margin-top:4px">pH-Wert: <b>${formatDecimal(ph)}</b></div>
          <div style="margin-top:4px">${status}</div>
        </div>`;
      },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        minSpan: 33,
        maxSpan: 100,
      },
    ],
    grid: {
      left: 0,
      right: 10,
      top: 10,
      bottom: 45,
    },
    xAxis: {
      type: 'category',
      data: data.map(d => `${d.dateLine1}\n${d.dateLine2}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontFamily: FONT_FAMILY,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      min: domainMin,
      max: domainMax,
      splitNumber: 4,
      interval: step,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255,255,255,0.1)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'pH-Wert',
        type: 'line',
        data: data.map(d => d.value),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#ffffff',
          width: 2,
        },
        itemStyle: {
          color: (params: any) => {
            const ph = data[params.dataIndex]?.value;
            return ph < 6.5 || ph > 7.2 ? '#FF4444' : '#5AD940';
          },
          opacity: 1,
        },
        emphasis: {
          scale: 1.8,
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 3,
            shadowBlur: 12,
            shadowColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
        z: 10,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: 'rgba(255,255,255,0.3)',
            width: 1,
            type: 'solid',
          },
          data: [
            { yAxis: 6.5 },
            { yAxis: 7.2 },
          ],
          label: { show: false },
        },
      },
    ],
  };

  return (
    <div className="flex">
      {/* Static Y-Axis */}
      <div className="flex-shrink-0 flex flex-col justify-between text-right pr-2" style={{ width: 35, height: CHART_HEIGHT - 45, marginTop: 10 }}>
        {[...yTicks].reverse().map((tick, i) => (
          <span key={i} className="text-[9px] text-white/40 leading-none" style={{ fontFamily: FONT_FAMILY }}>{formatDecimal(tick)}</span>
        ))}
      </div>
      <div className="flex-1 overflow-visible">
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ width: chartWidth, height: CHART_HEIGHT }} onClick={handleChartClick}>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: CHART_HEIGHT, width: chartWidth }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

PhChart.displayName = 'PhChart';

interface GrowthDataPoint {
  month: number;
  weight: number;
  isOutOfBounds: boolean;
}

const GrowthCurveChart = memo(({ events }: { events: Event[] }) => {
  const chartRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const isZoomedRef = useRef<boolean>(false);

  const handleChartClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const chart = chartRef.current?.getEchartsInstance();
      if (chart) {
        if (isZoomedRef.current) {
          chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
          isZoomedRef.current = false;
        } else {
          chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 });
          isZoomedRef.current = true;
        }
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };
  const weightMeasurements = useMemo((): GrowthDataPoint[] => {
    return events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .map(e => {
        const eventDate = new Date(e.time);
        const ageInMonths = differenceInMonths(eventDate, KALLE_BIRTHDAY) + (eventDate.getDate() / 30);
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

  // Generate growth curve data
  const curveData = useMemo(() => {
    const data = [];
    for (let month = 2; month <= 18; month += 0.5) {
      const expected = getExpectedWeight(month);
      data.push({
        month,
        expected,
        upper: expected * 1.05,
        lower: expected * 0.95,
      });
    }
    return data;
  }, []);

  const normalPoints = weightMeasurements.filter(p => !p.isOutOfBounds);
  const outOfBoundsPoints = weightMeasurements.filter(p => p.isOutOfBounds);

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 500,
    textStyle: { fontFamily: FONT_FAMILY },
    tooltip: {
      trigger: 'item',
      confine: false,
      backgroundColor: 'rgba(0,0,0,0.9)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12,
        fontFamily: FONT_FAMILY,
      },
      formatter: (params: any) => {
        if (params.seriesName === 'Normal' || params.seriesName === 'Abweichung') {
          const month = params.data[0];
          const weight = params.data[1];
          const expected = getExpectedWeight(month);
          const isOutOfBounds = params.seriesName === 'Abweichung';
          const status = isOutOfBounds ? '<span style="color:#FF4444">⚠️ Abweichung</span>' : '<span style="color:#5AD940">✓ Normal</span>';
          return `<div style="padding:4px 0">
            <div style="font-weight:600;margin-bottom:4px">Alter: ${formatDecimal(month)} Monate</div>
            <div>Gewicht: <b>${String(weight).replace('.', ',')} kg</b></div>
            <div>Ideal: ${formatDecimal(expected)} kg</div>
            <div style="margin-top:4px">${status}</div>
          </div>`;
        }
        return null;
      },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        minSpan: 33,
        maxSpan: 100,
      },
    ],
    grid: {
      left: 40,
      right: 10,
      top: 10,
      bottom: 50,
    },
    xAxis: {
      type: 'value',
      min: 2,
      max: 18,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontFamily: FONT_FAMILY,
        formatter: '{value}M',
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 5,
      max: 35,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontFamily: FONT_FAMILY,
        formatter: '{value}kg',
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255,255,255,0.1)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'Zielkurve',
        type: 'line',
        data: curveData.map(d => [d.month, d.expected]),
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#ffffff',
          width: 2,
        },
        z: 1,
      },
      {
        name: '+5%',
        type: 'line',
        data: curveData.map(d => [d.month, d.upper]),
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: 'rgba(255,255,255,0.3)',
          width: 1,
        },
        z: 1,
      },
      {
        name: '-5%',
        type: 'line',
        data: curveData.map(d => [d.month, d.lower]),
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: 'rgba(255,255,255,0.3)',
          width: 1,
        },
        z: 1,
      },
      {
        name: 'Normal',
        type: 'scatter',
        data: normalPoints.map(p => [p.month, p.weight]),
        symbolSize: 8,
        itemStyle: {
          color: '#5AD940',
          opacity: 1,
        },
        emphasis: {
          scale: 1.8,
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 3,
            shadowBlur: 12,
            shadowColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
        z: 10,
      },
      {
        name: 'Abweichung',
        type: 'scatter',
        data: outOfBoundsPoints.map(p => [p.month, p.weight]),
        symbolSize: 8,
        itemStyle: {
          color: '#FF4444',
          opacity: 1,
          shadowBlur: 8,
          shadowColor: 'rgba(255, 68, 68, 0.6)',
        },
        emphasis: {
          scale: 1.8,
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 3,
            shadowBlur: 15,
            shadowColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
        z: 10,
      },
    ],
  };

  return (
    <div onClick={handleChartClick}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: CHART_HEIGHT }}
        opts={{ renderer: 'svg' }}
      />
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
  const chartsRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const weightData = useMemo((): WeightChartData[] => {
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

  const phData = useMemo((): PhChartData[] => {
    const filtered = events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    return filtered.map((e, index) => {
      const eventDate = new Date(e.time);
      const prevDate = index > 0 ? new Date(filtered[index - 1].time) : null;
      const showYear = prevDate && eventDate.getFullYear() !== prevDate.getFullYear();
      const dateFormat = showYear ? 'd. MMM yy' : 'd. MMM';
      
      return {
        dateLine1: format(eventDate, dateFormat, { locale: de }),
        dateLine2: format(eventDate, 'HH:mm', { locale: de }) + ' Uhr',
        value: parseFloat(String(e.ph_value).replace(',', '.')),
      };
    });
  }, [events]);

  // Filter events from last 7 days, 30 days, and 90 days for calculations
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);
  const ninetyDaysAgo = useMemo(() => subDays(new Date(), 90), []);

  const weightStats = useMemo(() => {
    if (weightData.length === 0) return { avg: null, min: null, max: null, latest: null, idealWeight: null, trend: null as 'up' | 'down' | 'neutral' | null };
    const allValues = weightData.map(d => d.value);
    
    const last7DaysWeights = events
      .filter(e => e.type === 'gewicht' && e.weight_value !== null && e.weight_value !== undefined)
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .map(e => Number(e.weight_value));
    
    const avg = last7DaysWeights.length > 0 
      ? Math.round(last7DaysWeights.reduce((a, b) => a + b, 0) / last7DaysWeights.length * 10) / 10
      : null;
    
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
      const tolerance = idealWeight * 0.02;
      
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
    if (phData.length === 0) return { avg: null, min: null, max: null, latest: null, inRangeCount: 0, totalCount: 0 };
    const allValues = phData.map(d => d.value);
    
    const last7DaysPh = events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .filter(e => isAfter(new Date(e.time), sevenDaysAgo))
      .map(e => parseFloat(String(e.ph_value).replace(',', '.')));
    
    const avg = last7DaysPh.length > 0 
      ? Math.round(last7DaysPh.reduce((a, b) => a + b, 0) / last7DaysPh.length * 10) / 10
      : null;
    
    // Calculate in-range stats for last 3 months
    const last90DaysPh = events
      .filter(e => e.type === 'phwert' && e.ph_value !== null && e.ph_value !== undefined && e.ph_value !== '')
      .filter(e => isAfter(new Date(e.time), ninetyDaysAgo))
      .map(e => parseFloat(String(e.ph_value).replace(',', '.')));
    
    const inRangeCount = last90DaysPh.filter(ph => ph >= 6.5 && ph <= 7.2).length;
    const totalCount = last90DaysPh.length;
    
    return {
      avg,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      latest: allValues[allValues.length - 1],
      inRangeCount,
      totalCount,
    };
  }, [phData, events, sevenDaysAgo, ninetyDaysAgo]);

  const pipiStats = useMemo(() => {
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
    
    const last30DaysPipi = events
      .filter(e => e.type === 'pipi')
      .filter(e => isAfter(new Date(e.time), thirtyDaysAgo));
    
    const uniqueDaysWithPipi = new Set(
      last30DaysPipi.map(e => format(new Date(e.time), 'yyyy-MM-dd'))
    );
    const daysWithEntries = uniqueDaysWithPipi.size;
    
    const avgPerDay = last30DaysPipi.length > 0 && daysWithEntries > 0
      ? Math.round(last30DaysPipi.length / daysWithEntries * 10) / 10
      : null;
    
    return { avg, avgPerDay };
  }, [events, sevenDaysAgo, thirtyDaysAgo]);

  const stuhlgangStats = useMemo(() => {
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
    
    const last30DaysStuhlgang = events
      .filter(e => e.type === 'stuhlgang')
      .filter(e => isAfter(new Date(e.time), thirtyDaysAgo));
    
    const uniqueDaysWithStuhlgang = new Set(
      last30DaysStuhlgang.map(e => format(new Date(e.time), 'yyyy-MM-dd'))
    );
    const daysWithEntries = uniqueDaysWithStuhlgang.size;
    
    const avgPerDay = last30DaysStuhlgang.length > 0 && daysWithEntries > 0
      ? Math.round(last30DaysStuhlgang.length / daysWithEntries * 10) / 10
      : null;
    
    return { avg, avgPerDay };
  }, [events, sevenDaysAgo, thirtyDaysAgo]);

  const handleExportPDF = useCallback(async () => {
    if (!chartsRef.current || isExporting) return;
    
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Kalle - Trend-Analyse', margin, yPos);
      yPos += 10;
      
      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Exportiert am ${format(new Date(), 'd. MMMM yyyy, HH:mm', { locale: de })} Uhr`, margin, yPos);
      yPos += 15;
      
      // Stats summary
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Übersicht', margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      const statsLines = [
        `Aktuelles Gewicht: ${weightStats.latest ? String(weightStats.latest).replace('.', ',') + ' kg' : '-'}`,
        `Ideal-Gewicht: ${weightStats.idealWeight ? String(weightStats.idealWeight).replace('.', ',') + ' kg' : '-'}`,
        `Letzter pH-Wert: ${phStats.latest ? String(phStats.latest).replace('.', ',') : '-'}`,
        `pH im Normbereich: ${phStats.totalCount > 0 ? `${phStats.inRangeCount}/${phStats.totalCount} (letzte 3 Monate)` : '-'}`,
        `Ø Pipi-Intervall: ${pipiStats.avg ? String(pipiStats.avg).replace('.', ',') + ' h' : '-'}`,
        `Ø Stuhlgang-Intervall: ${stuhlgangStats.avg ? String(stuhlgangStats.avg).replace('.', ',') + ' h' : '-'}`,
      ];
      
      statsLines.forEach(line => {
        pdf.text(line, margin, yPos);
        yPos += 6;
      });
      yPos += 10;
      
      // Capture charts as image
      const chartsElement = chartsRef.current;
      const canvas = await html2canvas(chartsElement, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page for the charts
      if (yPos + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
      }
      
      pdf.setFontSize(14);
      pdf.text('Charts', margin, yPos);
      yPos += 8;
      
      pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 15;
      
      // Data table
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
      }
      
      pdf.setFontSize(14);
      pdf.text('Alle Einträge', margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(8);
      const sortedEvents = [...events].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      // Table header
      pdf.setTextColor(100, 100, 100);
      pdf.text('Datum', margin, yPos);
      pdf.text('Zeit', margin + 35, yPos);
      pdf.text('Typ', margin + 55, yPos);
      pdf.text('Wert', margin + 90, yPos);
      yPos += 5;
      
      // Draw line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;
      
      pdf.setTextColor(0, 0, 0);
      
      sortedEvents.forEach((event) => {
        if (yPos > pageHeight - 15) {
          pdf.addPage();
          yPos = margin;
          
          // Repeat header on new page
          pdf.setTextColor(100, 100, 100);
          pdf.text('Datum', margin, yPos);
          pdf.text('Zeit', margin + 35, yPos);
          pdf.text('Typ', margin + 55, yPos);
          pdf.text('Wert', margin + 90, yPos);
          yPos += 5;
          pdf.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 4;
          pdf.setTextColor(0, 0, 0);
        }
        
        const eventDate = new Date(event.time);
        const dateStr = format(eventDate, 'd. MMM yy', { locale: de });
        const timeStr = format(eventDate, 'HH:mm', { locale: de });
        
        let typeStr = '';
        let valueStr = '';
        
        switch (event.type) {
          case 'gewicht':
            typeStr = 'Gewicht';
            valueStr = event.weight_value ? `${String(event.weight_value).replace('.', ',')} kg` : '-';
            break;
          case 'phwert':
            typeStr = 'pH-Wert';
            valueStr = event.ph_value ? String(event.ph_value).replace('.', ',') : '-';
            break;
          case 'pipi':
            typeStr = 'Pipi';
            valueStr = '-';
            break;
          case 'stuhlgang':
            typeStr = 'Stuhlgang';
            valueStr = '-';
            break;
          default:
            typeStr = event.type;
            valueStr = '-';
        }
        
        pdf.text(dateStr, margin, yPos);
        pdf.text(timeStr, margin + 35, yPos);
        pdf.text(typeStr, margin + 55, yPos);
        pdf.text(valueStr, margin + 90, yPos);
        yPos += 5;
      });
      
      // Save the PDF
      pdf.save(`kalle-trend-analyse-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [events, weightStats, phStats, pipiStats, stuhlgangStats, isExporting]);

  return (
    <div className="pb-11 space-y-6" data-vaul-no-drag>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard 
          emoji="🏋️" 
          label="Aktuelles Gewicht" 
          value={weightStats.latest} 
          unit="kg"
          subtext={weightStats.idealWeight ? `Ideal: ${String(weightStats.idealWeight).replace('.', ',')} kg` : undefined}
        />
        <StatCard 
          emoji="🧪" 
          label={"Letzter\npH-Wert"}
          value={phStats.latest} 
          unit=""
          subtext={phStats.totalCount > 0 ? `${phStats.inRangeCount}/${phStats.totalCount} im Normbereich (3M)` : undefined}
        />
        <StatCard 
          emoji="💦" 
          label="Ø Pipi-Intervall" 
          value={pipiStats.avg} 
          unit="h"
          subtext={pipiStats.avgPerDay ? `Ø ${String(pipiStats.avgPerDay).replace('.', ',')}x pro Tag` : undefined}
        />
        <StatCard 
          emoji="💩" 
          label="Ø Stuhlgang" 
          value={stuhlgangStats.avg} 
          unit="h"
          subtext={stuhlgangStats.avgPerDay ? `Ø ${String(stuhlgangStats.avgPerDay).replace('.', ',')}x pro Tag` : undefined}
        />
      </div>

      {/* Charts */}
      <div ref={chartsRef} className="mt-2 overflow-visible">
        <div ref={containerRef}>
          {/* Growth Curve Chart */}
          <div className="mb-8 relative">
            <h3 className="text-[13px] text-white/60 font-medium mb-3">Wachstumskurve</h3>
            <GrowthCurveChart events={events} />
          </div>
          
          <div className="mb-6">
            <h3 className="text-[13px] text-white/60 font-medium mb-3">Gewichtsverlauf</h3>
            <WeightChart data={weightData} width={width} />
          </div>
          <div className="pt-16 -mt-16 overflow-visible">
            <h3 className="text-[13px] text-white/60 font-medium mb-3">pH-Wert Verlauf</h3>
            <PhChart data={phData} width={width} />
          </div>
        </div>
      </div>
      
      {/* Export Button */}
      <div className="mt-8 pb-4">
        <Button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="w-full bg-white text-black hover:bg-white/90 font-medium py-3 rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exportiere...' : 'Daten exportieren'}
        </Button>
      </div>
    </div>
  );
});

TrendAnalysis.displayName = 'TrendAnalysis';

export default TrendAnalysis;
