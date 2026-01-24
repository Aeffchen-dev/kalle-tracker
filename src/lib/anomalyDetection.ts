import { Event } from './events';
import { differenceInHours, differenceInMinutes, subDays, format } from 'date-fns';
import { de } from 'date-fns/locale';

export interface Anomaly {
  id: string;
  type: 'missed_break' | 'weight_deviation' | 'ph_deviation' | 'pattern_change';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  relatedEventId?: string;
}

// Kalle's growth curve: linear interpolation from 2 months (7kg) to 18 months (34kg)
const KALLE_BIRTHDAY = new Date('2025-03-01');
const TARGET_WEIGHTS: { month: number; weight: number }[] = [
  { month: 2, weight: 7 },
  { month: 18, weight: 34 }
];

function getExpectedWeight(ageInMonths: number): number {
  if (ageInMonths <= TARGET_WEIGHTS[0].month) return TARGET_WEIGHTS[0].weight;
  if (ageInMonths >= TARGET_WEIGHTS[TARGET_WEIGHTS.length - 1].month) {
    return TARGET_WEIGHTS[TARGET_WEIGHTS.length - 1].weight;
  }
  
  for (let i = 0; i < TARGET_WEIGHTS.length - 1; i++) {
    const start = TARGET_WEIGHTS[i];
    const end = TARGET_WEIGHTS[i + 1];
    if (ageInMonths >= start.month && ageInMonths <= end.month) {
      const progress = (ageInMonths - start.month) / (end.month - start.month);
      return start.weight + progress * (end.weight - start.weight);
    }
  }
  return TARGET_WEIGHTS[TARGET_WEIGHTS.length - 1].weight;
}

function getAgeInMonths(date: Date): number {
  const diffMs = date.getTime() - KALLE_BIRTHDAY.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 30.44);
}

// Calculate average interval between events of a type
function calculateAverageInterval(events: Event[], type: 'pipi' | 'stuhlgang'): number | null {
  const typeEvents = events
    .filter(e => e.type === type)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  
  if (typeEvents.length < 3) return null;
  
  const intervals: number[] = [];
  for (let i = 1; i < typeEvents.length; i++) {
    const interval = differenceInMinutes(
      new Date(typeEvents[i].time),
      new Date(typeEvents[i - 1].time)
    );
    // Only count reasonable intervals (not overnight gaps > 12 hours)
    if (interval > 0 && interval < 720) {
      intervals.push(interval);
    }
  }
  
  if (intervals.length === 0) return null;
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

export function detectAnomalies(events: Event[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = new Date();
  
  // Get events from last 7 days for pattern analysis
  const recentEvents = events.filter(e => 
    new Date(e.time) > subDays(now, 7)
  );
  
  // 1. Check for missed bathroom breaks
  const pipiEvents = events
    .filter(e => e.type === 'pipi' || e.type === 'stuhlgang')
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  if (pipiEvents.length > 0) {
    const lastBreak = new Date(pipiEvents[0].time);
    const hoursSinceBreak = differenceInHours(now, lastBreak);
    const avgInterval = calculateAverageInterval(events, 'pipi');
    
    // Alert if no break in 6+ hours during waking hours (8am-10pm)
    const currentHour = now.getHours();
    const isWakingHours = currentHour >= 8 && currentHour <= 22;
    
    if (isWakingHours && hoursSinceBreak >= 6) {
      anomalies.push({
        id: `missed_break_${now.getTime()}`,
        type: 'missed_break',
        severity: hoursSinceBreak >= 8 ? 'alert' : 'warning',
        title: 'Lange Pause',
        description: `Kalle war seit ${hoursSinceBreak} Stunden nicht mehr draußen`,
        timestamp: now
      });
    }
    
    // Check if current interval is significantly longer than average
    if (avgInterval && hoursSinceBreak * 60 > avgInterval * 2 && hoursSinceBreak >= 4) {
      anomalies.push({
        id: `pattern_break_${now.getTime()}`,
        type: 'pattern_change',
        severity: 'info',
        title: 'Ungewöhnliches Muster',
        description: `Die Zeit seit dem letzten Gassi ist länger als üblich (Durchschnitt: ${Math.round(avgInterval / 60)}h)`,
        timestamp: now
      });
    }
  }
  
  // 2. Check weight deviations
  const weightEvents = events
    .filter(e => e.type === 'gewicht' && e.weight_value)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  if (weightEvents.length > 0) {
    const latestWeight = weightEvents[0];
    const weight = latestWeight.weight_value!;
    const eventDate = new Date(latestWeight.time);
    const ageInMonths = getAgeInMonths(eventDate);
    const expectedWeight = getExpectedWeight(ageInMonths);
    const deviation = Math.abs(weight - expectedWeight) / expectedWeight;
    
    if (deviation > 0.05) {
      const isUnder = weight < expectedWeight;
      anomalies.push({
        id: `weight_deviation_${latestWeight.id}`,
        type: 'weight_deviation',
        severity: deviation > 0.1 ? 'alert' : 'warning',
        title: isUnder ? 'Untergewicht' : 'Übergewicht',
        description: `Aktuell ${weight.toFixed(1).replace('.', ',')}kg (Ideal: ${expectedWeight.toFixed(1).replace('.', ',')}kg, ${(deviation * 100).toFixed(0)}% Abweichung)`,
        timestamp: eventDate,
        relatedEventId: latestWeight.id
      });
    }
    
    // Check for rapid weight changes
    if (weightEvents.length >= 2) {
      const previousWeight = weightEvents[1];
      const weightChange = latestWeight.weight_value! - previousWeight.weight_value!;
      const daysBetween = differenceInHours(
        new Date(latestWeight.time),
        new Date(previousWeight.time)
      ) / 24;
      
      if (daysBetween > 0 && daysBetween <= 14) {
        const changePerWeek = Math.abs(weightChange) / (daysBetween / 7);
        // Alert if losing more than 0.5kg per week or gaining more than 1kg per week
        if (weightChange < 0 && changePerWeek > 0.5) {
          anomalies.push({
            id: `weight_loss_${latestWeight.id}`,
            type: 'weight_deviation',
            severity: 'alert',
            title: 'Schneller Gewichtsverlust',
            description: `${Math.abs(weightChange).toFixed(1).replace('.', ',')}kg weniger in ${Math.round(daysBetween)} Tagen`,
            timestamp: new Date(latestWeight.time),
            relatedEventId: latestWeight.id
          });
        } else if (weightChange > 0 && changePerWeek > 1.5) {
          anomalies.push({
            id: `weight_gain_${latestWeight.id}`,
            type: 'weight_deviation',
            severity: 'warning',
            title: 'Schnelle Gewichtszunahme',
            description: `${weightChange.toFixed(1).replace('.', ',')}kg mehr in ${Math.round(daysBetween)} Tagen`,
            timestamp: new Date(latestWeight.time),
            relatedEventId: latestWeight.id
          });
        }
      }
    }
  }
  
  // 3. Check pH deviations
  const phEvents = events
    .filter(e => e.type === 'phwert' && e.ph_value)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  if (phEvents.length > 0) {
    const latestPh = phEvents[0];
    const phValue = parseFloat(latestPh.ph_value!.replace(',', '.'));
    
    if (!isNaN(phValue)) {
      if (phValue < 6.5 || phValue > 7.2) {
        const isLow = phValue < 6.5;
        anomalies.push({
          id: `ph_deviation_${latestPh.id}`,
          type: 'ph_deviation',
          severity: phValue < 6.0 || phValue > 7.5 ? 'alert' : 'warning',
          title: isLow ? 'pH-Wert zu niedrig' : 'pH-Wert zu hoch',
          description: `Letzter Wert: ${phValue.toFixed(1).replace('.', ',')} (Normal: 6,5-7,2)`,
          timestamp: new Date(latestPh.time),
          relatedEventId: latestPh.id
        });
      }
      
      // Check for consecutive abnormal pH readings
      const recentPhEvents = phEvents.slice(0, 3);
      const abnormalCount = recentPhEvents.filter(e => {
        const ph = parseFloat(e.ph_value!.replace(',', '.'));
        return !isNaN(ph) && (ph < 6.5 || ph > 7.2);
      }).length;
      
      if (abnormalCount >= 3) {
        anomalies.push({
          id: `ph_pattern_${now.getTime()}`,
          type: 'ph_deviation',
          severity: 'alert',
          title: 'Anhaltende pH-Abweichung',
          description: 'Die letzten 3 pH-Messungen waren außerhalb des Normbereichs',
          timestamp: now
        });
      }
    }
  }
  
  // 4. Check for changes in frequency patterns
  const last7Days = events.filter(e => new Date(e.time) > subDays(now, 7));
  const prev7Days = events.filter(e => {
    const time = new Date(e.time);
    return time > subDays(now, 14) && time <= subDays(now, 7);
  });
  
  const countByType = (evts: Event[], type: string) => evts.filter(e => e.type === type).length;
  
  const recentPipi = countByType(last7Days, 'pipi');
  const prevPipi = countByType(prev7Days, 'pipi');
  
  if (prevPipi > 0 && recentPipi > 0) {
    const pipiChange = (recentPipi - prevPipi) / prevPipi;
    
    if (pipiChange > 0.5) {
      anomalies.push({
        id: `frequency_increase_pipi_${now.getTime()}`,
        type: 'pattern_change',
        severity: 'info',
        title: 'Mehr Gassi-Gänge',
        description: `${Math.round(pipiChange * 100)}% mehr Pipi-Einträge als letzte Woche`,
        timestamp: now
      });
    } else if (pipiChange < -0.5) {
      anomalies.push({
        id: `frequency_decrease_pipi_${now.getTime()}`,
        type: 'pattern_change',
        severity: 'warning',
        title: 'Weniger Gassi-Gänge',
        description: `${Math.abs(Math.round(pipiChange * 100))}% weniger Pipi-Einträge als letzte Woche`,
        timestamp: now
      });
    }
  }
  
  // Sort by severity (alert > warning > info) then by timestamp
  const severityOrder = { alert: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
  
  // Deduplicate by keeping only the most severe anomaly of each type
  const seen = new Set<string>();
  return anomalies.filter(a => {
    const key = `${a.type}_${a.relatedEventId || 'general'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
