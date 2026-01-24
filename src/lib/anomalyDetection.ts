import { Event } from './events';
import { differenceInHours, differenceInMinutes, differenceInMonths } from 'date-fns';

export interface Anomaly {
  id: string;
  type: 'missed_break' | 'upcoming_break' | 'weight_deviation' | 'ph_deviation' | 'pattern_change';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  description: string;
  highlightText?: string;
  timestamp: Date;
  relatedEventId?: string;
}

// Kalle's growth curve - must match TrendAnalysis.tsx
const KALLE_BIRTHDAY = new Date('2025-01-20');
const TARGET_WEIGHT = 34;

// Expected weight data points based on Dalmatian growth chart
const EXPECTED_WEIGHTS: { [month: number]: number } = {
  2: 7, 3: 11, 4: 15, 5: 19, 6: 22, 7: 24, 8: 26, 9: 27, 10: 28, 11: 29, 12: 30, 13: 31, 14: 32, 15: 33, 18: 34,
};

function getExpectedWeight(ageInMonths: number): number {
  if (ageInMonths < 2) return 7;
  if (ageInMonths >= 18) return TARGET_WEIGHT;
  
  const months = Object.keys(EXPECTED_WEIGHTS).map(Number).sort((a, b) => a - b);
  let lowerMonth = months[0];
  let upperMonth = months[months.length - 1];
  
  for (const month of months) {
    if (month <= ageInMonths) lowerMonth = month;
    if (month >= ageInMonths && upperMonth === months[months.length - 1]) upperMonth = month;
  }
  
  if (lowerMonth === upperMonth) return EXPECTED_WEIGHTS[lowerMonth];
  
  const lowerWeight = EXPECTED_WEIGHTS[lowerMonth];
  const upperWeight = EXPECTED_WEIGHTS[upperMonth];
  const progress = (ageInMonths - lowerMonth) / (upperMonth - lowerMonth);
  
  return lowerWeight + progress * (upperWeight - lowerWeight);
}

function getAgeInMonths(date: Date): number {
  return differenceInMonths(date, KALLE_BIRTHDAY) + (date.getDate() / 30);
}

export function detectAnomalies(events: Event[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = new Date();
  
  // 1. Check for upcoming bathroom breaks
  const pipiEvents = events
    .filter(e => e.type === 'pipi' || e.type === 'stuhlgang')
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  if (pipiEvents.length > 0) {
    const lastBreak = new Date(pipiEvents[0].time);
    const minutesSinceBreak = differenceInMinutes(now, lastBreak);
    
    // Upcoming break reminder after 4 hours (suggested next break is 5h after last)
    if (minutesSinceBreak >= 240) {
      const nextBreakTime = new Date(lastBreak.getTime() + 5 * 60 * 60 * 1000);
      const hours = nextBreakTime.getHours().toString().padStart(2, '0');
      const minutes = nextBreakTime.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes} Uhr`;
      const isOverdue = now >= nextBreakTime;
      
      anomalies.push({
        id: `upcoming_break_${now.getTime()}`,
        type: 'upcoming_break',
        severity: isOverdue ? 'alert' : 'info',
        title: 'Bald Gassi-Zeit',
        description: `Nächster Spaziergang um ca. ${timeStr}`,
        highlightText: isOverdue ? timeStr : undefined,
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
        description: `Aktuell ${weight.toFixed(1).replace('.', ',')}kg (Ideal: ${expectedWeight.toFixed(1).replace('.', ',')}kg, ${isUnder ? '-' : '+'}${(deviation * 100).toFixed(0)}%)`,
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
