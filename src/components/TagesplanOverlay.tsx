import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Phone, MapPin, ExternalLink, Copy, Check, Plus } from 'lucide-react';
import DogFoodChecker from '@/components/DogFoodChecker';
import { supabaseClient as supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInMonths, format, getDay, getHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { getCachedSettings } from '@/lib/settings';
import { getEvents, Event as AppEvent } from '@/lib/events';
import { fetchICalEvents, getICalEventsForWeek, getICalEventsForRange, getKalleOwnerForDate, ICalEvent } from '@/lib/ical';
import { PlacesMap } from '@/components/PlacesMap';
import TrendAnalysis from '@/components/TrendAnalysis';




interface Ingredient {
  quantity: string;
  name: string;
  description?: string;
  link?: string;
}

interface MealData {
  title: string;
  ingredients: Ingredient[];
}

const mealsData: MealData[] = [
  {
    title: 'Morgens, mittags und abends jeweils',
    ingredients: [
      { quantity: '103g', name: 'Royal Canine Urinary u/c', link: 'https://www.fressnapf.de/ul/p/royal-canin-veterinary-urinary-uc-14-kg-1155812/' },
      { quantity: '309g', name: 'Wasser' },
      { quantity: '25g', name: 'Vet-Concept Nudeln mit Gemüse', description: 'Mit heißem Wasser übergießen und 20 Minuten ziehen lassen\n\nkann ersetzt werden durch\n- 180g Nudeln, gekocht\n- 200g Gemüse, gekocht' },
      { quantity: '83g', name: 'Gemüse gekocht\nz.B. Karotten' },
      { quantity: '6,6g', name: 'Dicalciumphosphat', link: 'https://www.napfcheck-shop.de/produkt/dicalciumphosphat/' },
      { quantity: '3,3g', name: 'Calciumglukonat', link: 'https://www.napfcheck-shop.de/produkt/napfcheck-calciumgluconat-fuer-hunde-und-katzen/' },
      { quantity: '2g', name: 'Kaliumzitrat', link: 'https://www.napfcheck-shop.de/produkt/napfcheck-kaliumcitrat-fuer-hunde-und-katzen/' },
      { quantity: '6,6g', name: 'Futteröl Junior', link: 'https://www.napfcheck-shop.de/produkt/napfcheck-futteroel-junior-fuer-hundewelpen-und-zuchthuendinnen/' },
    ],
  },
];

interface ScheduleCell {
  time: string;
  activity: string;
}

interface DaySchedule {
  day: string;
  type: string;
  slots: ScheduleCell[];
}

const weekSchedule: DaySchedule[] = [
  {
    day: 'Mo',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '19-21 Uhr', activity: 'Hundeplatz + Essen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Di',
    type: 'Ruhe Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Mi',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Joggen + Essen' },
      { time: '13 Uhr', activity: 'Essen + Pipi' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Do',
    type: 'Aktion Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Hundeplatz + Essen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Fr',
    type: 'Ruhe Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + große Runde' },
      { time: '15-16 Uhr', activity: 'Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'Sa',
    type: 'Aktion Tag',
    slots: [
      { time: '7-9 Uhr', activity: 'Joggen im Wald + Essen' },
      { time: '13 Uhr', activity: 'Essen + Pipi' },
      { time: '15-16 Uhr', activity: 'Hundeplatz oder Ausflug' },
      { time: '18-20 Uhr', activity: 'Hundeplatz' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
  {
    day: 'So',
    type: 'Chill Tag',
    slots: [
      { time: '8-9 Uhr', activity: 'Essen + große Runde' },
      { time: '13 Uhr', activity: 'Essen + Pipi' },
      { time: '15-16 Uhr', activity: 'Pipi + Ruhe Training' },
      { time: '18-20 Uhr', activity: 'Essen Spaziergang + Spielen' },
      { time: '23 Uhr', activity: 'Pipi' },
    ],
  },
];

interface TagesplanOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  scrollToDate?: string | null;
  eventsVersion?: number;
}

const TagesplanOverlay = ({ isOpen, onClose, scrollToDate, eventsVersion }: TagesplanOverlayProps) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'expanding' | 'visible' | 'dots-collapsing'>('idle');
  const [meals, setMeals] = useState<MealData[] | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[] | null>(null);
  const [editingCell, setEditingCell] = useState<{ dayIndex: number; slotIndex: number; field: 'time' | 'activity' } | null>(null);
  const [editingMeal, setEditingMeal] = useState<{ mealIndex: number; ingredientIndex: number; field: 'quantity' | 'name' | 'description' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const isReceivingRealtimeUpdate = useRef(false);
  const [selectedPubertyPhase, setSelectedPubertyPhase] = useState<number | null>(null);
  const [icalEvents, setIcalEvents] = useState<ICalEvent[]>([]);
  const wochenplanScrollRef = useRef<HTMLDivElement>(null);
  const infoScrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);
  const [activeSnackId, setActiveSnackId] = useState<string | null>(null);
  const [snackDeleting, setSnackDeleting] = useState<string | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [navStickyProgress, setNavStickyProgress] = useState(0);
  const tocChipsRef = useRef<HTMLDivElement>(null);
  const tocChipsMobileRef = useRef<HTMLDivElement>(null);
  const [navScrolledToEnd, setNavScrolledToEnd] = useState(false);
  const trainingTrickIndexRef = useRef<number>(Math.floor(Math.random() * 100));

  const tocSections = useMemo(() => [
    { id: 'section-trends', emoji: '📊', label: 'Trends' },
    { id: 'section-essen', emoji: '🍖', label: 'Essen' },
    { id: 'section-snacks', emoji: '🍪', label: 'Snacks' },
    { id: 'section-notfall', emoji: '🚑', label: 'Notfall' },
    { id: 'section-apotheke', emoji: '💊', label: 'Apotheke' },
    { id: 'section-pubertaet', emoji: '👹', label: 'Pubertät' },
    { id: 'section-training', emoji: '🧑‍🏫', label: 'Training' },
    { id: 'section-orte', emoji: '🗺️', label: 'Orte' },
    { id: 'section-wochenplan', emoji: '🗓️', label: 'Wochenplan' },
  ], []);

  // Track scroll position for active section highlighting & show-on-scroll
  useEffect(() => {
    if (animationPhase !== 'visible') return;
    const container = infoScrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrolled = container.scrollTop > 30;
      setHasScrolled(scrolled);
      // Interpolate nav sticky progress over 0-40px scroll range
      const stickyP = Math.min(1, Math.max(0, container.scrollTop / 40));
      setNavStickyProgress(stickyP);
      // Calculate overall scroll progress
      const scrollProgress = container.scrollTop / (container.scrollHeight - container.clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, scrollProgress)));
      const containerTop = container.getBoundingClientRect().top;
      let current: string | null = null;
      // Check if scrolled to bottom
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
      if (isAtBottom) {
        current = tocSections[tocSections.length - 1].id;
      } else {
        for (const s of tocSections) {
          const el = document.getElementById(s.id);
          if (el) {
            const top = el.getBoundingClientRect().top - containerTop;
            if (top <= 120) current = s.id;
          }
        }
      }
      setActiveSection(current);
      // Auto-scroll chips to keep active visible
      if (current) {
        const refs = [tocChipsRef.current, tocChipsMobileRef.current];
        refs.forEach(ref => {
          if (!ref) return;
          const chip = ref.querySelector(`[data-section="${current}"]`) as HTMLElement;
          if (chip) chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [tocSections, animationPhase]);

  // Track horizontal scroll of nav chips to hide fade at end
  useEffect(() => {
    const el = tocChipsMobileRef.current || tocChipsRef.current;
    if (!el) return;
    const checkEnd = () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      setNavScrolledToEnd(atEnd);
    };
    checkEnd();
    el.addEventListener('scroll', checkEnd, { passive: true });
    return () => el.removeEventListener('scroll', checkEnd);
  }, [animationPhase]);

  // Reset hasScrolled when overlay closes
  useEffect(() => {
    if (animationPhase !== 'visible') setHasScrolled(false);
  }, [animationPhase]);


  // Ingredient swipe & add state
  const [activeIngredientKey, setActiveIngredientKey] = useState<string | null>(null);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientLink, setNewIngredientLink] = useState('');

  // Swipe state for snacks & medicines
  const [swipingItemId, setSwipingItemId] = useState<string | null>(null);
  const [swipeItemOffset, setSwipeItemOffset] = useState(0);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeDecided = useRef(false);
  const swipeIsHorizontal = useRef(false);
  const swipeJustEnded = useRef(false);

  const [appEvents, setAppEvents] = useState<AppEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [snacks, setSnacks] = useState<{ id: string; name: string; shop_name: string | null; link: string | null; image_url: string | null }[]>([]);
  const [showAddSnack, setShowAddSnack] = useState(false);
  const [newSnackLink, setNewSnackLink] = useState('');

  // Medicines (Hausapotheke) state - mirrors snacks pattern
  const [medicines, setMedicines] = useState<{ id: string; name: string; shop_name: string | null; link: string | null; image_url: string | null }[]>([]);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [newMedicineLink, setNewMedicineLink] = useState('');
  const [isFetchingMedicineMeta, setIsFetchingMedicineMeta] = useState(false);
  const [activeMedicineId, setActiveMedicineId] = useState<string | null>(null);
  const [medicineDeleting, setMedicineDeleting] = useState<string | null>(null);

  // Places (Orte) state
  const [places, setPlaces] = useState<{ id: string; name: string; city: string | null; latitude: number | null; longitude: number | null; link: string | null; image_url: string | null }[]>([]);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceLink, setNewPlaceLink] = useState('');
  const [isFetchingPlaceMeta, setIsFetchingPlaceMeta] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);

  // Load iCal events and app events
  useEffect(() => {
    if (!isOpen) return;
    fetchICalEvents().then(setIcalEvents).catch(console.error);
    getEvents().then(result => setAppEvents(result.events)).catch(console.error);
  }, [isOpen, eventsVersion]);

  // Load snacks from DB
  const loadSnacks = async () => {
    const { data } = await supabase.from('snacks').select('*').order('created_at');
    if (data) setSnacks(data as typeof snacks);
  };

  // Load medicines from DB
  const loadMedicines = async () => {
    const { data } = await (supabase.from('medicines') as any).select('*').order('created_at');
    if (data) setMedicines(data as typeof medicines);
  };

  // Load places from DB
  const loadPlaces = async () => {
    const { data } = await (supabase.from('places') as any).select('*').order('created_at');
    if (data) setPlaces(data as typeof places);
  };

  useEffect(() => {
    if (!isOpen) return;
    loadSnacks();
    loadMedicines();
    loadPlaces();
  }, [isOpen]);

  const handleAddMedicineFromUrl = async () => {
    const url = newMedicineLink.trim();
    if (!url) return;
    setIsFetchingMedicineMeta(true);
    try {
      let name = '';
      let shop = '';
      let image = '';
      try {
        const { data, error } = await supabase.functions.invoke('fetch-url-meta', { body: { url } });
        if (!error && data) { name = data.name || ''; shop = data.shop || ''; image = data.image || ''; }
      } catch (e) { console.error('Failed to fetch URL metadata:', e); }
      if (!name) {
        try { const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); name = hostname; } catch { name = url; }
      }
      const { error: insertError } = await (supabase.from('medicines') as any).insert({
        name, shop_name: shop || null, link: url.startsWith('http') ? url : `https://${url}`, image_url: image || null,
      });
      if (!insertError) { setNewMedicineLink(''); setShowAddMedicine(false); loadMedicines(); }
    } finally { setIsFetchingMedicineMeta(false); }
  };

  const handleDeleteMedicine = async (id: string) => {
    setMedicineDeleting(id);
    await (supabase.from('medicines') as any).delete().eq('id', id);
    setActiveMedicineId(null);
    loadMedicines();
  };

  // Unified swipe handlers for snacks & medicines
  const handleItemTouchStart = (e: React.TouchEvent, id: string) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    setSwipingItemId(id);
    swipeDecided.current = false;
    swipeIsHorizontal.current = false;
    // Close any other open swipe
    if (activeSnackId && activeSnackId !== id) setActiveSnackId(null);
    if (activeMedicineId && activeMedicineId !== id) setActiveMedicineId(null);
    if (activePlaceId && activePlaceId !== id) setActivePlaceId(null);
    if (activeIngredientKey && activeIngredientKey !== id) setActiveIngredientKey(null);
  };

  const handleItemTouchMove = (e: React.TouchEvent) => {
    if (!swipingItemId) return;
    const dx = swipeStartX.current - e.touches[0].clientX;
    const dy = Math.abs(e.touches[0].clientY - swipeStartY.current);
    if (!swipeDecided.current && (Math.abs(dx) > 10 || dy > 10)) {
      swipeDecided.current = true;
      swipeIsHorizontal.current = Math.abs(dx) > dy;
    }
    if (swipeIsHorizontal.current) {
      const isOpen = activeSnackId === swipingItemId || activeMedicineId === swipingItemId || activePlaceId === swipingItemId || activeIngredientKey === swipingItemId;
      const offset = isOpen ? Math.max(0, Math.min(82 - (-dx), 90)) : Math.max(0, Math.min(dx, 90));
      setSwipeItemOffset(offset);
    }
  };

  const handleItemTouchEnd = (type: 'snack' | 'medicine' | 'place' | 'ingredient') => {
    if (!swipingItemId) return;
    const isOpen = (type === 'snack' ? activeSnackId : type === 'medicine' ? activeMedicineId : type === 'ingredient' ? activeIngredientKey : activePlaceId) === swipingItemId;
    if (swipeItemOffset >= 50) {
      if (type === 'snack') setActiveSnackId(swipingItemId);
      else if (type === 'medicine') setActiveMedicineId(swipingItemId);
      else if (type === 'ingredient') setActiveIngredientKey(swipingItemId);
      else setActivePlaceId(swipingItemId);
    } else if (isOpen) {
      if (type === 'snack') setActiveSnackId(null);
      else if (type === 'medicine') setActiveMedicineId(null);
      else if (type === 'ingredient') setActiveIngredientKey(null);
      else setActivePlaceId(null);
    }
    if (swipeIsHorizontal.current || isOpen) {
      swipeJustEnded.current = true;
      setTimeout(() => { swipeJustEnded.current = false; }, 50);
    }
    setSwipingItemId(null);
    setSwipeItemOffset(0);
  };

  const handleItemClick = (item: { id: string; link: string | null }, type: 'snack' | 'medicine' | 'place') => {
    if (swipeJustEnded.current) return;
    const activeId = type === 'snack' ? activeSnackId : type === 'medicine' ? activeMedicineId : activePlaceId;
    if (activeId) {
      if (type === 'snack') setActiveSnackId(null);
      else if (type === 'medicine') setActiveMedicineId(null);
      else setActivePlaceId(null);
      return;
    }
    if (type === 'place') {
      const place = places.find(p => p.id === item.id);
      if (place?.latitude && place?.longitude) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`, '_blank');
      }
    } else if (item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteSnack = async (id: string) => {
    setSnackDeleting(id);
    await (supabase.from('snacks') as any).delete().eq('id', id);
    setActiveSnackId(null);
    loadSnacks();
  };

  const handleDeletePlace = async (id: string) => {
    await (supabase.from('places') as any).delete().eq('id', id);
    setActivePlaceId(null);
    loadPlaces();
  };

  const handleSwipeDelete = (id: string, type: 'snack' | 'medicine' | 'place' | 'ingredient') => {
    if (type === 'snack') handleDeleteSnack(id);
    else if (type === 'medicine') handleDeleteMedicine(id);
    else if (type === 'ingredient') handleDeleteIngredient(id);
    else handleDeletePlace(id);
  };

  // Delete ingredient from meals by key (mealIndex-ingredientIndex)
  const handleDeleteIngredient = (key: string) => {
    const [mealIdx, ingIdx] = key.split('-').map(Number);
    setHasLocalChanges(true);
    setMeals(prev => {
      if (!prev) return prev;
      const newMeals = [...prev];
      newMeals[mealIdx] = {
        ...newMeals[mealIdx],
        ingredients: newMeals[mealIdx].ingredients.filter((_, i) => i !== ingIdx),
      };
      return newMeals;
    });
    setActiveIngredientKey(null);
  };

  // Add new ingredient to meal
  const handleAddIngredient = (mealIndex: number) => {
    const quantity = newIngredientQuantity.trim();
    const name = newIngredientName.trim();
    const link = newIngredientLink.trim();
    if (!name) return;
    setHasLocalChanges(true);
    setMeals(prev => {
      if (!prev) return prev;
      const newMeals = [...prev];
      const newIngredient: Ingredient = { quantity: quantity || '', name };
      if (link) newIngredient.link = link.startsWith('http') ? link : `https://${link}`;
      newMeals[mealIndex] = {
        ...newMeals[mealIndex],
        ingredients: [...newMeals[mealIndex].ingredients, newIngredient],
      };
      return newMeals;
    });
    setNewIngredientQuantity('');
    setNewIngredientName('');
    setNewIngredientLink('');
    setShowAddIngredient(false);
  };

  const handleAddSnackFromUrl = async () => {
    const url = newSnackLink.trim();
    if (!url) return;
    setIsFetchingMeta(true);
    try {
      let name = '';
      let shop = '';
      let image = '';
      try {
        const { data, error } = await supabase.functions.invoke('fetch-url-meta', { body: { url } });
        if (!error && data) { name = data.name || ''; shop = data.shop || ''; image = data.image || ''; }
      } catch (e) { console.error('Failed to fetch URL metadata:', e); }
      if (!name) {
        try { const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); name = hostname; } catch { name = url; }
      }
      const { error: insertError } = await (supabase.from('snacks') as any).insert({
        name, shop_name: shop || null, link: url.startsWith('http') ? url : `https://${url}`, image_url: image || null,
      });
      if (!insertError) { setNewSnackLink(''); setShowAddSnack(false); loadSnacks(); }
    } finally { setIsFetchingMeta(false); }
  };

  // Use 14 days for weekdays, 60 days for weekends (less frequent data)
  // Per-day clustering to correctly distinguish pipi-only vs pipi+stuhlgang slots
  const avgGassiByDay = useMemo(() => {
    const now = new Date();
    const weekdayCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const weekendCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Group events by calendar date
    const byDate = new Map<string, { hour: number; isPoop: boolean }[]>();
    for (const event of appEvents) {
      if (event.type !== 'pipi' && event.type !== 'stuhlgang') continue;
      const d = new Date(event.time);
      const jsDay = d.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const cutoff = isWeekend ? weekendCutoff : weekdayCutoff;
      if (d < cutoff) continue;
      const dateKey = d.toISOString().slice(0, 10);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push({ hour: d.getHours() + d.getMinutes() / 60, isPoop: event.type === 'stuhlgang' });
    }
    
    // Cluster per day, then aggregate
    type ClusterInfo = { avgHour: number; hasPoop: boolean };
    const weekdayClusters: ClusterInfo[] = [];
    const weekendClusters: ClusterInfo[] = [];
    
    for (const [dateKey, events] of byDate) {
      const d = new Date(dateKey + 'T12:00:00');
      const jsDay = d.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const sorted = events.sort((a, b) => a.hour - b.hour);
      
      // Cluster events within 4h windows
      const dayClusters: { hours: number[]; hasPoop: boolean }[] = [];
      for (const evt of sorted) {
        const last = dayClusters[dayClusters.length - 1];
        if (last && evt.hour - last.hours[last.hours.length - 1] <= 4) {
          last.hours.push(evt.hour);
          if (evt.isPoop) last.hasPoop = true;
        } else {
          dayClusters.push({ hours: [evt.hour], hasPoop: evt.isPoop });
        }
      }
      
      for (const c of dayClusters) {
        const avgH = c.hours.reduce((a, b) => a + b, 0) / c.hours.length;
        (isWeekend ? weekendClusters : weekdayClusters).push({ avgHour: avgH, hasPoop: c.hasPoop });
      }
    }
    
    // Merge clusters across days into time slots, tracking poop frequency
    const mergeIntoBuckets = (clusters: ClusterInfo[]) => {
      const sorted = clusters.sort((a, b) => a.avgHour - b.avgHour);
      const buckets: { hours: number[]; poopCount: number; totalCount: number }[] = [];
      for (const c of sorted) {
        const last = buckets[buckets.length - 1];
        const lastAvg = last ? last.hours.reduce((a, b) => a + b, 0) / last.hours.length : -99;
        if (last && Math.abs(c.avgHour - lastAvg) <= 4) {
          last.hours.push(c.avgHour);
          last.totalCount++;
          if (c.hasPoop) last.poopCount++;
        } else {
          buckets.push({ hours: [c.avgHour], poopCount: c.hasPoop ? 1 : 0, totalCount: 1 });
        }
      }
      const pipiHours: number[] = [];
      const stuhlgangHours: number[] = [];
      const poopFlags: boolean[] = [];
      for (const b of buckets) {
        const avg = b.hours.reduce((a, v) => a + v, 0) / b.hours.length;
        pipiHours.push(avg);
        // Only mark as stuhlgang if it happens >= 40% of the time in this slot
        const hasPoop = b.poopCount / b.totalCount >= 0.4;
        poopFlags.push(hasPoop);
        if (hasPoop) stuhlgangHours.push(avg);
      }
      return { pipiHours, stuhlgangHours, poopFlags };
    };
    
    const weekdayData = mergeIntoBuckets(weekdayClusters);
    const weekendData = mergeIntoBuckets(weekendClusters);
    
    const dayMap = new Map<number, { pipiHours: number[]; stuhlgangHours: number[]; poopFlags: boolean[] }>();
    for (let i = 0; i < 7; i++) {
      const isWeekend = i >= 5;
      dayMap.set(i, isWeekend ? weekendData : weekdayData);
    }
    
    return dayMap;
  }, [appEvents]);

  // Total days to display
  const TOTAL_DAYS = 62;

  // Tick that increments at midnight to force day recalculation
  const [midnightTick, setMidnightTick] = useState(0);
  useEffect(() => {
    const scheduleNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      return setTimeout(() => {
        setMidnightTick(t => t + 1);
      }, msUntilMidnight);
    };
    const timer = scheduleNextMidnight();
    return () => clearTimeout(timer);
  }, [midnightTick]);

  // Compute range start: today, shifted by weekOffset
  const rangeStart = useMemo(() => {
    void midnightTick; // dependency to re-calc at midnight
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset, midnightTick]);

  // For backward compat keep weekStart for any other usage
  const weekStart = rangeStart;

  // Get iCal events for the range
  const weekIcalEvents = useMemo(() => {
    return getICalEventsForRange(icalEvents, rangeStart, TOTAL_DAYS);
  }, [icalEvents, rangeStart]);

  // Current day index within the range (-1 if today not in range)
  const currentDayIndex = useMemo(() => {
    void midnightTick; // dependency to re-calc at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - rangeStart.getTime();
    const idx = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return idx >= 0 && idx < TOTAL_DAYS ? idx : -1;
  }, [rangeStart, midnightTick]);
  const currentHour = useMemo(() => { void midnightTick; return new Date().getHours(); }, [midnightTick]);

  const handleAddPlaceFromUrl = async () => {
    const url = newPlaceLink.trim();
    if (!url) return;
    setIsFetchingPlaceMeta(true);
    try {
      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const supabaseKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/parse-google-maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      const name = data.name || url;
      const city = data.city || null;
      const latitude = data.latitude || null;
      const longitude = data.longitude || null;
      const image_url = data.image_url || null;
      const link = url.startsWith('http') ? url : `https://${url}`;
      await (supabase.from('places') as any).insert({ name, city, latitude, longitude, link, image_url });
      setNewPlaceLink('');
      setShowAddPlace(false);
      loadPlaces();
    } catch (e) {
      console.error('Error adding place:', e);
    } finally {
      setIsFetchingPlaceMeta(false);
    }
  };



  const copyAddress = async () => {
    const address = 'Uhlandstraße 151, 10719 Berlin';
    try {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('tagesplan')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      
      if (data) {
        if (data.meals_data && Array.isArray(data.meals_data) && data.meals_data.length > 0) {
          setMeals(data.meals_data as unknown as MealData[]);
        } else {
          setMeals(mealsData);
        }
        if (data.schedule_data && Array.isArray(data.schedule_data) && data.schedule_data.length > 0) {
          setSchedule(data.schedule_data as unknown as DaySchedule[]);
        } else {
          setSchedule(weekSchedule);
        }
      } else {
        // No data in DB, use defaults
        setMeals(mealsData);
        setSchedule(weekSchedule);
      }
      setDataLoaded(true);
    };
    loadData();
  }, []);

  // Track if user is currently editing
  const isEditing = editingCell !== null || editingMeal !== null;

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('tagesplan-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tagesplan',
          filter: 'id=eq.default'
        },
        (payload) => {
          // Don't update while user is editing to prevent overwriting their input
          if (isEditing) return;
          
          // Mark that we're receiving a realtime update to prevent save loop
          isReceivingRealtimeUpdate.current = true;
          const newData = payload.new as { meals_data?: MealData[]; schedule_data?: DaySchedule[] };
          if (newData.meals_data) setMeals(newData.meals_data);
          if (newData.schedule_data) setSchedule(newData.schedule_data);
          // Reset the flag after state updates are processed
          setTimeout(() => {
            isReceivingRealtimeUpdate.current = false;
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isEditing]);

  // Save to database only when user makes local changes
  useEffect(() => {
    if (!dataLoaded || meals === null || schedule === null || !hasLocalChanges) return;
    // Don't save if we're receiving a realtime update
    if (isReceivingRealtimeUpdate.current) return;
    
    const saveData = async () => {
      console.log('Saving tagesplan data...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tagesplan') as any).upsert({
        id: 'default',
        meals_data: meals,
        schedule_data: schedule,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (error) {
        console.error('Error saving tagesplan:', error);
      } else {
        console.log('Tagesplan saved successfully');
        setHasLocalChanges(false);
      }
    };
    
    const timeout = setTimeout(saveData, 500);
    return () => clearTimeout(timeout);
  }, [meals, schedule, dataLoaded, hasLocalChanges]);

  useEffect(() => {
    if (isOpen && animationPhase === 'idle') {
      setSelectedPubertyPhase(null);
      setAnimationPhase('expanding');
      // Reveal content after dots have mostly expanded
      setTimeout(() => {
        setAnimationPhase('visible');
      }, 1100);
      // Recolor body (status bar + bottom bar) after dot transition completes
      setTimeout(() => {
        document.body.style.backgroundColor = '#2e2017';
      }, 1400);
    }
  }, [isOpen, animationPhase]);

  // Reset when fully closed
  useEffect(() => {
    if (animationPhase === 'idle' && !isOpen) {
      document.body.style.backgroundColor = '';
    }
  }, [animationPhase, isOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editingMeal && editingMeal.field === 'quantity' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editingMeal && (editingMeal.field === 'name' || editingMeal.field === 'description') && textareaRef.current) {
      textareaRef.current.focus();
    }
    if (editingMeal && editingMeal.field === 'description' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingCell, editingMeal]);

  const handleMealClick = (mealIndex: number, ingredientIndex: number, field: 'quantity' | 'name' | 'description') => {
    setEditingMeal({ mealIndex, ingredientIndex, field });
  };

  const handleMealChange = (value: string) => {
    if (!editingMeal) return;
    const { mealIndex, ingredientIndex, field } = editingMeal;
    setHasLocalChanges(true);
    setMeals(prev => {
      if (!prev) return prev;
      const newMeals = [...prev];
      newMeals[mealIndex] = {
        ...newMeals[mealIndex],
        ingredients: newMeals[mealIndex].ingredients.map((ing, i) =>
          i === ingredientIndex ? { ...ing, [field]: value } : ing
        ),
      };
      return newMeals;
    });
  };

  const handleMealBlur = () => {
    setEditingMeal(null);
  };

  const handleMealKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingMeal(null);
    }
    if (e.key === 'Enter' && editingMeal?.field === 'quantity') {
      setEditingMeal(null);
    }
  };

  const handleCellClick = (dayIndex: number, slotIndex: number, field: 'time' | 'activity') => {
    setEditingCell({ dayIndex, slotIndex, field });
  };

  const handleCellChange = (value: string) => {
    if (!editingCell) return;
    const { dayIndex, slotIndex, field } = editingCell;
    setHasLocalChanges(true);
    setSchedule(prev => {
      if (!prev) return prev;
      const newSchedule = [...prev];
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        slots: newSchedule[dayIndex].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        ),
      };
      return newSchedule;
    });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Scroll Wochenplan to target date card after overlay opens (only when triggered from a notification)
  useEffect(() => {
    if (animationPhase === 'visible' && scrollToDate && todayColRef.current && wochenplanScrollRef.current) {
      setTimeout(() => {
        todayColRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }, 300);
    }
  }, [animationPhase, scrollToDate]);

  const handleClose = () => {
    // Start animation immediately
    setAnimationPhase('dots-collapsing');
    document.body.style.backgroundColor = '';
    
    // Close modal after brief delay so animation starts
    requestAnimationFrame(() => {
      onClose();
    });
    
    // Hide SVG after animation completes
    setTimeout(() => {
      setAnimationPhase('idle');
    }, 300);
  };

  if (animationPhase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none" style={{ minHeight: '100dvh' }}>
      {/* Animated spots using SVG with SMIL animation for sharp scaling */}
      <div key={animationPhase} className="absolute inset-0 pointer-events-auto overflow-hidden">
        {[
          { left: 5, top: 8, w: 4.8, h: 5.6, rotate: 12, seed: 0 },
          { left: 70, top: 8, w: 6.4, h: 4.8, rotate: -6, seed: 1 },
          { left: 35, top: 18, w: 5.6, h: 6.4, rotate: 45, seed: 2 },
          { left: 82, top: 28, w: 5.2, h: 6, rotate: -12, seed: 3 },
          { left: 8, top: 42, w: 6, h: 4.8, rotate: 30, seed: 4 },
          { left: 65, top: 52, w: 4.8, h: 5.6, rotate: -20, seed: 5 },
          { left: 20, top: 68, w: 6.4, h: 5.2, rotate: 15, seed: 6 },
          { left: 75, top: 78, w: 5.2, h: 6.4, rotate: -35, seed: 7 },
          { left: 45, top: 85, w: 5.6, h: 4.8, rotate: 25, seed: 8 },
          { left: 18, top: 12, w: 4, h: 4.4, rotate: -15, seed: 9 },
          { left: 48, top: 6, w: 4.4, h: 3.6, rotate: 20, seed: 10 },
          { left: 88, top: 22, w: 3.6, h: 4.4, rotate: -8, seed: 11 },
          { left: 55, top: 35, w: 4, h: 3.6, rotate: 35, seed: 12 },
          { left: 30, top: 48, w: 4.4, h: 4, rotate: -25, seed: 13 },
          { left: 92, top: 58, w: 3.6, h: 4, rotate: 10, seed: 14 },
          { left: 50, top: 72, w: 4, h: 4.4, rotate: -40, seed: 15 },
          { left: 10, top: 82, w: 4.4, h: 3.6, rotate: 5, seed: 16 },
          { left: 85, top: 95, w: 3.6, h: 4, rotate: -18, seed: 17 },
          { left: 28, top: 2, w: 2.8, h: 3.2, rotate: 8, seed: 18 },
          { left: 60, top: 15, w: 3.2, h: 2.8, rotate: -12, seed: 19 },
          { left: 3, top: 25, w: 2.8, h: 2.8, rotate: 22, seed: 20 },
          { left: 42, top: 38, w: 3.2, h: 3.2, rotate: -5, seed: 21 },
          { left: 78, top: 45, w: 2.8, h: 3.2, rotate: 15, seed: 22 },
          { left: 38, top: 62, w: 3.2, h: 2.8, rotate: -28, seed: 23 },
          { left: 62, top: 75, w: 2.8, h: 2.8, rotate: 32, seed: 24 },
          { left: 28, top: 85, w: 3.2, h: 3.2, rotate: -10, seed: 25 },
          { left: 68, top: 92, w: 2.8, h: 3.2, rotate: 18, seed: 26 },
          { left: 92, top: 10, w: 1.6, h: 2, rotate: 0, seed: 27 },
          { left: 25, top: 32, w: 2, h: 1.6, rotate: 0, seed: 28 },
          { left: 15, top: 55, w: 1.6, h: 1.6, rotate: 0, seed: 29 },
          { left: 88, top: 65, w: 2, h: 2, rotate: 0, seed: 30 },
          { left: 58, top: 80, w: 1.6, h: 2, rotate: 0, seed: 31 },
        ].map((spot) => {
          // Blob paths centered at origin (0,0)
          const blobPaths = [
            'M0,-45 C25,-45 45,-30 45,-5 C45,20 30,45 0,45 C-30,45 -45,25 -45,0 C-45,-25 -25,-45 0,-45 Z',
            'M0,-42 C30,-42 42,-25 42,0 C42,25 25,42 0,42 C-25,42 -42,20 -42,-5 C-42,-30 -30,-42 0,-42 Z',
            'M-5,-45 C20,-45 45,-25 45,0 C45,30 20,45 -5,45 C-35,45 -45,20 -45,-5 C-45,-35 -30,-45 -5,-45 Z',
            'M5,-42 C35,-42 42,-20 42,5 C42,30 25,42 0,42 C-30,42 -42,15 -42,-10 C-42,-35 -20,-42 5,-42 Z',
          ];
          
          const startScale = animationPhase === 'dots-collapsing' ? 40 : 1;
          const endScale = animationPhase === 'dots-collapsing' ? 1 : 40;
          
          return (
            <svg
              key={spot.seed}
              style={{
                position: 'absolute',
                left: `calc(${spot.left}% + ${spot.w / 2}vw + 4px)`,
                top: `calc(${spot.top}% + ${spot.h / 2}vw + 4px)`,
                width: `${spot.w}vw`,
                height: `${spot.h}vw`,
                overflow: 'visible',
                transform: 'translate(-50%, -50%)',
              }}
              viewBox="-50 -50 100 100"
            >
              <g transform={`rotate(${spot.rotate})`}>
                <path d={blobPaths[spot.seed % 4]} fill="#5c4033">
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    from={`${startScale} ${startScale}`}
                    to={`${endScale} ${endScale}`}
                    dur={animationPhase === 'dots-collapsing' ? '0.32s' : '1.4s'}
                    fill="freeze"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines={animationPhase === 'dots-collapsing' ? "0 0 0.2 1" : "0.8 0 1 1"}
                  />
                </path>
              </g>
            </svg>
          );
        })}
      </div>

      {/* Gradient background with grain - hide instantly on close */}
      {animationPhase === 'visible' && (
        <div className="fixed inset-0 pointer-events-auto info-overlay-gradient info-overlay-grain" />
      )}

      {/* Content - only render when visible */}
      {animationPhase === 'visible' && (
        <div className="fixed left-0 right-0 pointer-events-auto pwa-info-overlay-root" style={{ top: 0, bottom: 0 }}>
          {/* Desktop/Tablet: fixed header bar with INFO + nav + close in one row */}
          <div className="hidden md:block fixed top-0 left-0 right-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center px-4 py-3" style={{ background: 'transparent' }}>
              <h1 className="text-[16px] uppercase text-white shrink-0">Info</h1>
              <div className="flex-1 flex justify-center overflow-hidden mx-4">
                <div
                  ref={tocChipsRef}
                  className="overflow-x-auto scrollbar-hide"
                >
                  <div className="flex items-center gap-5 px-2 py-1">
                    {tocSections.map((item) => (
                      <button
                        key={item.id}
                        data-section={item.id}
                        onClick={() => {
                          const container = infoScrollRef.current;
                          if (!container) return;
                          const section = document.getElementById(item.id);
                          if (!section) return;
                          const stickyNav = container.querySelector('.sticky') as HTMLElement | null;
                          const navHeight = stickyNav ? stickyNav.offsetHeight : 70;
                          const sectionRect = section.getBoundingClientRect();
                          const containerRect = container.getBoundingClientRect();
                          const currentScroll = container.scrollTop;
                          const targetScroll = Math.max(0, currentScroll + sectionRect.top - containerRect.top - navHeight - 8);
                          const start = container.scrollTop;
                          const distance = targetScroll - start;
                          const duration = 320;
                          const startTime = performance.now();
                          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
                          const animate = (now: number) => {
                            const progress = Math.min(1, (now - startTime) / duration);
                            container.scrollTop = start + distance * easeOutCubic(progress);
                            if (progress < 1) requestAnimationFrame(animate);
                          };
                          requestAnimationFrame(animate);
                        }}
                        className={`flex-shrink-0 text-[12px] tracking-wide transition-all duration-300 ${
                          activeSection === item.id ? 'text-white' : 'text-white/35 active:text-white/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleClose} className="text-white p-1 shrink-0">
                <X size={20} />
              </button>
            </div>
            {/* Bottom fade */}
            <div className="h-4 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #93511D, transparent)' }} />
          </div>

          {/* Mobile: scrollable layout with sticky nav */}
          <div ref={infoScrollRef} className="fixed top-0 left-0 right-0 overflow-y-auto overflow-x-hidden pwa-info-overlay-scroll" style={{ bottom: 0, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 32 }}>
            {/* Fixed close button - always top right (mobile only) */}
            <div className="fixed right-0 z-20 px-4 pt-3 md:hidden" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
              <button onClick={handleClose} className="text-white p-1">
                <X size={20} />
              </button>
            </div>
            {/* INFO title - scrolls away on mobile */}
            <div className="px-4 pt-4 pb-0 md:pt-[88px]">
              <h1 className="text-[16px] uppercase text-white md:hidden">Info</h1>
            </div>
            {/* Sticky navigation (mobile only) */}
            <div className="sticky top-0 z-[15] md:hidden">
              <div style={{ background: 'hsl(var(--spot-color))' }}>
                <div
                  ref={tocChipsMobileRef}
                  className="overflow-x-auto scrollbar-hide"
                  style={{
                    marginRight: Math.round(navStickyProgress * 60),
                    ...((!navScrolledToEnd && navStickyProgress > 0) ? {
                      maskImage: `linear-gradient(to right, black ${85 + (1 - navStickyProgress) * 15}%, transparent 100%)`,
                      WebkitMaskImage: `linear-gradient(to right, black ${85 + (1 - navStickyProgress) * 15}%, transparent 100%)`,
                    } : {})
                  }}
                >
                  <div className="flex items-center gap-5 pl-4 py-4" style={{ paddingRight: Math.round(16 + navStickyProgress * 80) }}>
                    {tocSections.map((item) => (
                      <button
                        key={item.id}
                        data-section={item.id}
                        onClick={() => {
                          const container = infoScrollRef.current;
                          if (!container) return;

                          const section = document.getElementById(item.id);
                          if (!section) return;

                          const stickyNav = container.querySelector('.sticky') as HTMLElement | null;
                          const navHeight = stickyNav ? stickyNav.offsetHeight : 70;
                          const sectionRect = section.getBoundingClientRect();
                          const containerRect = container.getBoundingClientRect();
                          const currentScroll = container.scrollTop;
                          const targetScroll = Math.max(0, currentScroll + sectionRect.top - containerRect.top - navHeight - 8);

                          const start = container.scrollTop;
                          const distance = targetScroll - start;
                          const duration = 320;
                          const startTime = performance.now();
                          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

                          const animate = (now: number) => {
                            const progress = Math.min(1, (now - startTime) / duration);
                            container.scrollTop = start + distance * easeOutCubic(progress);
                            if (progress < 1) requestAnimationFrame(animate);
                          };

                          requestAnimationFrame(animate);
                        }}
                        className={`flex-shrink-0 text-[12px] tracking-wide transition-all duration-300 ${
                          activeSection === item.id
                            ? 'text-white'
                            : 'text-white/35 active:text-white/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Bottom fade */}
              <div className="h-4 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(var(--spot-color)), transparent)' }} />
            </div>
            <div className="px-4 relative z-0">
            <div className="md:max-w-[60vw] lg:max-w-[50vw] md:mx-auto">
            {/* Trend Analysis Section */}
            
            
            <div id="section-trends" className="mb-8">
              <TrendAnalysis events={appEvents} />
            </div>
            
            {!dataLoaded && (
              <div className="mb-8">
                <Skeleton className="h-4 w-40 bg-white/10 mb-4" />
                <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] overflow-hidden shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`flex p-3 gap-3 ${i !== 6 ? 'border-b border-white/[0.06]' : ''}`}>
                      <Skeleton className="h-4 w-16 bg-white/10" />
                      <Skeleton className="h-4 flex-1 bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {meals && meals.map((meal, mealIndex) => (
              <div key={mealIndex} id={mealIndex === 0 ? 'section-essen' : undefined} className="mb-2">
                <h2 className="flex items-center gap-2 text-[16px] text-white mb-1">{mealIndex === 0 && <span className="info-emoji">🍖</span>}<span>Essen</span></h2>
                <p className="text-[14px] text-white/60 mb-4">{meal.title}</p>
                <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] overflow-hidden shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                  {meal.ingredients.map((ingredient, index) => {
                    const ingredientKey = `${mealIndex}-${index}`;
                    const isActive = activeIngredientKey === ingredientKey;
                    const isEditingQuantity = editingMeal?.mealIndex === mealIndex && editingMeal?.ingredientIndex === index && editingMeal?.field === 'quantity';
                    const isEditingName = editingMeal?.mealIndex === mealIndex && editingMeal?.ingredientIndex === index && editingMeal?.field === 'name';
                    const isEditingDescription = editingMeal?.mealIndex === mealIndex && editingMeal?.ingredientIndex === index && editingMeal?.field === 'description';
                    
                    return (
                      <div
                        key={index}
                        className={`relative flex w-full items-stretch overflow-hidden ${index !== meal.ingredients.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                        onTouchStart={(e) => handleItemTouchStart(e, ingredientKey)}
                        onTouchMove={handleItemTouchMove}
                        onTouchEnd={() => handleItemTouchEnd('ingredient')}
                      >
                        <div
                          className="flex items-start p-3 flex-1 min-w-0"
                          style={{ transition: swipingItemId === ingredientKey ? 'none' : 'all 150ms ease-linear' }}
                        >
                          {isEditingQuantity ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={ingredient.quantity}
                              onChange={(e) => handleMealChange(e.target.value)}
                              onBlur={handleMealBlur}
                              onKeyDown={handleMealKeyDown}
                              className="bg-white/10 text-white/60 text-[14px] w-[80px] flex-shrink-0 px-1 py-0.5 rounded border border-white/30 outline-none"
                            />
                          ) : (
                            <span
                              className="text-[14px] text-white/60 w-[80px] flex-shrink-0 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 -mx-1"
                              onClick={() => handleMealClick(mealIndex, index, 'quantity')}
                            >
                              {ingredient.quantity}
                            </span>
                          )}
                          <div className="flex-1">
                            {isEditingName ? (
                              <textarea
                                ref={textareaRef}
                                value={ingredient.name}
                                onChange={(e) => handleMealChange(e.target.value)}
                                onBlur={handleMealBlur}
                                onKeyDown={handleMealKeyDown}
                                className="bg-white/10 text-white/60 text-[14px] w-full px-1 py-0.5 rounded border border-white/30 outline-none min-h-[32px]"
                                rows={Math.max(1, ingredient.name.split('\n').length)}
                              />
                            ) : (
                              <div className="flex items-center">
                                <span
                                  className="text-[14px] text-white/60 cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 inline-block whitespace-pre-line"
                                  onClick={() => handleMealClick(mealIndex, index, 'name')}
                                >
                                  {ingredient.name}
                                </span>
                              </div>
                            )}
                            {isEditingDescription ? (
                              <textarea
                                ref={textareaRef}
                                value={ingredient.description || ''}
                                onChange={(e) => handleMealChange(e.target.value)}
                                onBlur={handleMealBlur}
                                onKeyDown={handleMealKeyDown}
                                className="bg-white/10 text-white/60 text-[14px] w-full px-1 py-0.5 rounded border border-white/30 outline-none mt-2 min-h-[80px]"
                              />
                            ) : ingredient.description ? (
                              <p
                                className="text-[14px] text-white/60 mt-2 whitespace-pre-line cursor-pointer hover:bg-white/10 rounded px-1 py-0.5"
                                onClick={() => handleMealClick(mealIndex, index, 'description')}
                              >
                                {ingredient.description}
                              </p>
                            ) : null}
                          </div>
                          {ingredient.link && (
                            <a
                              href={ingredient.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/40 hover:text-white transition-colors flex-shrink-0 flex items-center justify-center w-[48px] h-[48px] -m-3 ml-0 -mr-[11px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSwipeDelete(ingredientKey, 'ingredient'); }}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="flex-shrink-0 bg-destructive flex items-center justify-center text-[12px] text-white overflow-hidden self-stretch"
                          style={{
                            width: (() => { const isSwiping = swipingItemId === ingredientKey; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            minWidth: (() => { const isSwiping = swipingItemId === ingredientKey; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            transition: swipingItemId === ingredientKey ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear',
                          }}
                        >
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">Löschen</span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Add ingredient */}
                  <div className="border-t border-white/[0.06]">
                    {showAddIngredient ? (
                      <div className="flex items-center p-3">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex items-center">
                            <input
                              type="text"
                              placeholder="Menge"
                              value={newIngredientQuantity}
                              onChange={(e) => setNewIngredientQuantity(e.target.value)}
                              className="bg-transparent text-white/60 text-[14px] w-[80px] flex-shrink-0 px-1 py-0.5 outline-none placeholder:text-white/30 -mx-1"
                              autoFocus
                            />
                            <input
                              type="text"
                              placeholder="Zutat"
                              value={newIngredientName}
                              onChange={(e) => setNewIngredientName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddIngredient(mealIndex); if (e.key === 'Escape') { setShowAddIngredient(false); setNewIngredientQuantity(''); setNewIngredientName(''); setNewIngredientLink(''); } }}
                              className="flex-1 min-w-0 bg-transparent text-white/60 text-[14px] px-1 py-0.5 outline-none placeholder:text-white/30"
                            />
                          </div>
                          <input
                            type="url"
                            placeholder="Link (optional)"
                            value={newIngredientLink}
                            onChange={(e) => setNewIngredientLink(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddIngredient(mealIndex); if (e.key === 'Escape') { setShowAddIngredient(false); setNewIngredientQuantity(''); setNewIngredientName(''); setNewIngredientLink(''); } }}
                            className="bg-transparent text-white/60 text-[14px] px-1 py-0.5 outline-none placeholder:text-white/30 -mx-1"
                          />
                        </div>
                        <button
                          onClick={() => handleAddIngredient(mealIndex)}
                          disabled={!newIngredientName.trim()}
                          className="text-[12px] text-white flex-shrink-0 disabled:opacity-30 self-center ml-2"
                        >
                          Hinzufügen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddIngredient(true)}
                        className="flex items-center p-3 w-full text-left hover:opacity-80 transition-opacity"
                      >
                        <div className="w-[80px] flex-shrink-0 flex items-center -mx-1">
                          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Plus size={14} className="text-white/40" />
                          </div>
                        </div>
                        <span className="text-[14px] text-white/40">Zutat hinzufügen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Dog Food Checker */}
            
            <DogFoodChecker />
            

            {/* Snacks Section */}
            
            <div id="section-snacks" className="mb-8">
               <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] p-4 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                <h3 className="text-[16px] text-white/90 mb-4">Snacks</h3>
                <div className="flex flex-col divide-y divide-white/10">
                  {snacks.map((snack, index) => {
                    const isActive = activeSnackId === snack.id;
                    const isFirst = index === 0;
                    const isLast = index === snacks.length - 1;

                    return (
                      <div
                        key={snack.id}
                        className="relative flex w-full items-stretch overflow-hidden gap-1"
                        onTouchStart={(e) => handleItemTouchStart(e, snack.id)}
                        onTouchMove={handleItemTouchMove}
                        onTouchEnd={() => handleItemTouchEnd('snack')}
                      >
                        <div
                          className={`flex items-center gap-3 ${isFirst ? 'pb-1.5' : 'py-1.5'} cursor-pointer select-none min-w-0 flex-1`}
                          onClick={() => handleItemClick(snack, 'snack')}
                          style={{ transition: swipingItemId === snack.id ? 'none' : 'all 150ms ease-linear' }}
                        >
                          {snack.image_url ? (
                            <img src={snack.image_url} alt={snack.name} className="w-8 h-8 rounded object-cover flex-shrink-0 bg-white" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[16px]">🦴</span>
                            </div>
                          )}
                          <span className="text-[14px] text-white/80 truncate min-w-0 flex-1">{snack.name}</span>
                          <span className="text-[12px] text-white/40 w-[72px] text-left flex-shrink-0">{snack.shop_name || ''}</span>
                          {snack.link && (
                            <span className="text-white/40 p-1 flex-shrink-0">
                              <ExternalLink size={14} />
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSwipeDelete(snack.id, 'snack'); }}
                          onTouchStart={(e) => e.stopPropagation()}
                           className="flex-shrink-0 bg-red-500 flex items-center justify-center text-[12px] text-white overflow-hidden self-stretch"
                          style={{
                            width: (() => { const isSwiping = swipingItemId === snack.id; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            minWidth: (() => { const isSwiping = swipingItemId === snack.id; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            transition: swipingItemId === snack.id ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear',
                          }}
                        >
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">Löschen</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add snack inline */}
                <div className="border-t border-white/10">
                  {showAddSnack ? (
                    <div className="flex items-center gap-3 pt-1.5">
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus size={14} className="text-white/40" />
                      </div>
                      <input
                        type="url"
                        placeholder="Link einfügen"
                        value={newSnackLink}
                        onChange={(e) => setNewSnackLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSnackFromUrl(); if (e.key === 'Escape') { setShowAddSnack(false); setNewSnackLink(''); } }}
                         className="flex-1 min-w-0 bg-transparent text-[14px] text-white/80 outline-none placeholder:text-white/30 py-1.5 rounded"
                        autoFocus
                      />
                      <button
                        onClick={handleAddSnackFromUrl}
                        disabled={isFetchingMeta || !newSnackLink.trim()}
                        className="text-[12px] text-white flex-shrink-0 disabled:opacity-30"
                      >
                        {isFetchingMeta ? 'Laden...' : 'Hinzufügen'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddSnack(true)}
                      className="flex items-center gap-3 pt-1.5 w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus size={14} className="text-white/40" />
                      </div>
                      <span className="text-[14px] text-white/40">Snack hinzufügen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            

            {/* Emergency Section */}
            
            <div id="section-notfall" className="mb-2">
              <h2 className="flex items-center gap-2 text-[16px] text-white mb-4"><span className="info-emoji">🚑</span> <span>Im Notfall</span></h2>
              
              {/* Tierarztpraxis Sonnenallee */}
              <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] p-4 mb-2 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                <a 
                  href="https://www.tierarztpraxis-sonnenallee.de/?gad_source=1&gad_campaignid=1857807503&gbraid=0AAAAACzVUKlJl2A4d-chpHx705_Kb1tWY&gclid=Cj0KCQiAprLLBhCMARIsAEDhdPc4TJVMjdztujQuW5wFRyIqjwoP6QMboQ8ldcTAc1rpomFMn2XrYpkaAkZoEALw_wcB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-[14px] text-white mb-3 hover:text-white/80 transition-colors"
                >
                  <span>Tierarztpraxis Sonnenallee</span>
                  <ExternalLink size={14} className="text-white/40 flex-shrink-0" />
                </a>
                <a 
                  href="tel:+49306814455"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  <Phone size={14} className="text-white/60" />
                  <span>Anrufen</span>
                </a>
              </div>

              {/* Tierklinik Bärenwiese */}
              <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] p-4 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                <a 
                  href="https://tierarzt-baerenwiese.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-[14px] text-white mb-3 hover:text-white/80 transition-colors"
                >
                  <span>Tierklinik: Tierarztpraxis Bärenwiese</span>
                  <ExternalLink size={14} className="text-white/40 flex-shrink-0" />
                </a>
                <a 
                  href="tel:+493023362627"
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors mb-3"
                >
                  <Phone size={14} className="text-white/60" />
                  <span>Anrufen</span>
                </a>
                <a 
                  href="http://maps.apple.com/?q=Uhlandstraße+151,+10719+Berlin"
                  onClick={(e) => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    if (!isIOS) {
                      e.preventDefault();
                      window.open('https://maps.google.com/?q=Uhlandstraße+151,+10719+Berlin', '_blank');
                    }
                  }}
                  className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors"
                >
                  <MapPin size={14} className="text-white/60" />
                  <span>Wegbeschreibung</span>
                </a>
                <div className="flex items-start justify-between mt-2 ml-6">
                  <a 
                    href="http://maps.apple.com/?q=Uhlandstraße+151,+10719+Berlin"
                    onClick={(e) => {
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      if (!isIOS) {
                        e.preventDefault();
                        window.open('https://maps.google.com/?q=Uhlandstraße+151,+10719+Berlin', '_blank');
                      }
                    }}
                    className="text-[14px] text-white/60 hover:text-white transition-colors"
                  >
                    Uhlandstraße 151<br />
                    10719 Berlin
                  </a>
                  <button
                    onClick={copyAddress}
                    className="p-1 text-white/60 hover:text-white transition-colors"
                    title="Adresse kopieren"
                  >
                    {addressCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            

            {/* Hausapotheke Section */}
            
            <div id="section-apotheke" className="mb-8">
              <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] p-4 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                <h3 className="text-[16px] text-white/90 mb-4">Hausapotheke</h3>
                <div className="flex flex-col divide-y divide-white/10">
                  {medicines.map((med, index) => {
                    const isActive = activeMedicineId === med.id;
                    const isFirst = index === 0;

                    return (
                      <div
                        key={med.id}
                        className="relative flex w-full items-stretch overflow-hidden gap-1"
                        onTouchStart={(e) => handleItemTouchStart(e, med.id)}
                        onTouchMove={handleItemTouchMove}
                        onTouchEnd={() => handleItemTouchEnd('medicine')}
                      >
                        <div
                          className={`flex items-center gap-3 ${isFirst ? 'pb-1.5' : 'py-1.5'} cursor-pointer select-none min-w-0 flex-1`}
                          onClick={() => handleItemClick(med, 'medicine')}
                          style={{ transition: swipingItemId === med.id ? 'none' : 'all 150ms ease-linear' }}
                        >
                          {med.image_url ? (
                            <img src={med.image_url} alt={med.name} className="w-8 h-8 rounded object-cover flex-shrink-0 bg-white" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[16px]">💊</span>
                            </div>
                          )}
                          <span className="text-[14px] text-white/80 truncate min-w-0 flex-1">{med.name}</span>
                          <span className="text-[12px] text-white/40 w-[72px] text-left flex-shrink-0 -ml-[40px] truncate hidden md:inline">{med.shop_name || ''}</span>
                          {med.link && (
                            <span className="text-white/40 p-1 flex-shrink-0">
                              <ExternalLink size={14} />
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSwipeDelete(med.id, 'medicine'); }}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="flex-shrink-0 bg-red-500 flex items-center justify-center text-[12px] text-white overflow-hidden self-stretch"
                          style={{
                            width: (() => { const isSwiping = swipingItemId === med.id; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            minWidth: (() => { const isSwiping = swipingItemId === med.id; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            transition: swipingItemId === med.id ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear',
                          }}
                        >
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">Löschen</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add medicine inline */}
                <div className={medicines.length > 0 ? "border-t border-white/10" : ""}>
                  {showAddMedicine ? (
                    <div className="flex items-center gap-3 pt-1.5">
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus size={14} className="text-white/40" />
                      </div>
                      <input
                        type="url"
                        placeholder="Link einfügen"
                        value={newMedicineLink}
                        onChange={(e) => setNewMedicineLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddMedicineFromUrl(); if (e.key === 'Escape') { setShowAddMedicine(false); setNewMedicineLink(''); } }}
                         className="flex-1 min-w-0 bg-transparent text-[14px] text-white/80 outline-none placeholder:text-white/30 py-1.5 rounded"
                        autoFocus
                      />
                      <button
                        onClick={handleAddMedicineFromUrl}
                        disabled={isFetchingMedicineMeta || !newMedicineLink.trim()}
                        className="text-[12px] text-white flex-shrink-0 disabled:opacity-30"
                      >
                        {isFetchingMedicineMeta ? 'Laden...' : 'Hinzufügen'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddMedicine(true)}
                      className="flex items-center gap-3 pt-1.5 w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus size={16} className="text-white/40" />
                      </div>
                      <span className="text-[14px] text-white/40">Medikament hinzufügen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            

            
            {(() => {
              const settings = getCachedSettings();
              const birthday = settings.birthday ? new Date(settings.birthday) : new Date('2025-01-20');
              const now = new Date();
              const ageInMonths = differenceInMonths(now, birthday);
              if (ageInMonths < 6 || ageInMonths > 30) return null;
              
              const phases = [
                { min: 6, max: 8, name: 'Vorpubertät', characteristics: 'In dieser Phase beginnen die ersten hormonellen Veränderungen. Kalle wird merklich neugieriger, zeigt erste Anzeichen von Selbstständigkeit und testet vorsichtig seine Grenzen aus. Er könnte anfangen, bekannte Regeln in Frage zu stellen und sich von vertrauten Personen etwas mehr zu lösen.', needs: ['Sichere Umgebung zum Erkunden bieten', 'Positive Verstärkung bei jedem Erfolg', 'Sanfte, aber klare Konsequenz', 'Neue Situationen behutsam einführen'] },
                { min: 8, max: 12, name: 'Frühe Pubertät', characteristics: 'Kalle zeigt möglicherweise erste Unsicherheiten und Trotzverhalten. Selektives Hören wird häufiger – Kommandos, die vorher gut saßen, werden plötzlich ignoriert. Erste Rangordnungstests mit anderen Hunden und auch gegenüber den Bezugspersonen können auftreten.', needs: ['Klare, verlässliche Regeln aufstellen', 'Geduld – er testet nicht aus Bosheit', 'Viel Lob für gewünschtes Verhalten', 'Kurze, motivierende Trainingseinheiten'] },
                { min: 12, max: 18, name: 'Hochphase', characteristics: 'Das ist die intensivste Phase der Pubertät. Kalle kann unberechenbar auf Reize reagieren, die ihn vorher nicht gestört haben. Bekannte Kommandos werden scheinbar „vergessen", die Impulskontrolle ist eingeschränkt und Umweltreize wie andere Hunde, Geräusche oder Wild können extrem ablenkend wirken.', needs: ['Maximale Konsequenz, dabei ruhig bleiben', 'Trainingseinheiten kurz und erfolgreich halten', 'Tägliche Routine unbedingt beibehalten', 'Keine neuen, überfordernden Situationen', 'Rückschritte sind normal – nicht stressen'] },
                { min: 18, max: 24, name: 'Späte Pubertät', characteristics: 'Kalle wird langsam ruhiger und ausgeglichener. Das in den Monaten zuvor Gelernte festigt sich wieder und wird zuverlässiger abrufbar. Die erwachsene Persönlichkeit beginnt sich herauszubilden – man kann erste Züge seines endgültigen Charakters erkennen.', needs: ['Weiterhin konsequent bleiben', 'Training vertiefen und anspruchsvoller gestalten', 'Schrittweise mehr Freiheiten gewähren', 'Wachsende Zuverlässigkeit belohnen'] },
                { min: 24, max: 30, name: 'Junghund-Stabilisierung', characteristics: 'Die letzte Reifephase: Kalle findet sein inneres Gleichgewicht. Sein Verhalten und Charakter stabilisieren sich zunehmend. Reaktionen werden vorhersehbarer, die Bindung zu seinen Bezugspersonen vertieft sich und er zeigt immer mehr Anzeichen eines erwachsenen, souveränen Hundes.', needs: ['Vertrauen weiter stärken', 'Routine festigen', 'Neue Herausforderungen anbieten', 'Die Beziehung genießen – das Schwierigste liegt hinter euch!'] },
              ];
              
              const currentPhaseIndex = phases.findIndex(p => ageInMonths >= p.min && ageInMonths < p.max);
              const displayIndex = selectedPubertyPhase !== null ? selectedPubertyPhase : (currentPhaseIndex >= 0 ? currentPhaseIndex : phases.length - 1);
              const phase = phases[displayIndex];
              const isCurrentPhase = displayIndex === currentPhaseIndex;

              return (
                <div id="section-pubertaet" className="mb-8">
                  <h2 className="flex items-center gap-2 text-[16px] text-white mb-4"><span className="info-emoji">👹</span> <span>Pubertät</span></h2>
                  <div 
                    className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] overflow-hidden shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]"
                  >
                    {/* Header with phase name and progress */}
                    <div className="p-4 pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] text-white">{phase.name}</span>
                        <span className="text-[14px] text-white/60">{phase.min}–{phase.max} Monate</span>
                      </div>
                      
                      {/* Clickable progress bar */}
                      <div className="relative mb-4">
                        <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
                          {phases.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedPubertyPhase(i === currentPhaseIndex && selectedPubertyPhase === null ? null : i === selectedPubertyPhase ? null : i)}
                              className={`flex-1 relative z-10 transition-colors ${
                                i <= currentPhaseIndex ? 'bg-white' : 'bg-transparent'
                              } ${i === currentPhaseIndex ? 'rounded-r-full' : ''} ${i !== 0 && i <= currentPhaseIndex ? 'border-l border-white/15' : ''}`}
                            />
                          ))}
                        </div>
                        {/* Phase labels */}
                        <div className="flex mt-1.5 gap-1">
                          {phases.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedPubertyPhase(i === currentPhaseIndex && selectedPubertyPhase === null ? null : i === selectedPubertyPhase ? null : i)}
                              className={`flex-1 text-[9px] text-center py-1 rounded-full transition-colors ${
                                i === displayIndex ? 'bg-white/20 text-white' :
                                i <= currentPhaseIndex ? 'text-white/50 hover:bg-white/10' : 'text-white/20 hover:bg-white/10'
                              }`}
                            >
                              {`${p.min}–${p.max}M`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Swipeable content area */}
                    <div
                      className="relative overflow-hidden"
                      onTouchStart={(e) => {
                        const el = e.currentTarget as any;
                        el._swipeStartX = e.touches[0].clientX;
                        el._swipeDeltaX = 0;
                      }}
                      onTouchMove={(e) => {
                        const el = e.currentTarget as any;
                        if (el._swipeStartX === undefined) return;
                        const deltaX = e.touches[0].clientX - el._swipeStartX;
                        el._swipeDeltaX = deltaX;
                        const contentEl = e.currentTarget.querySelector('[data-phase-content]') as HTMLElement;
                        if (contentEl) {
                          contentEl.style.transform = `translateX(${deltaX * 0.5}px)`;
                        }
                      }}
                      onTouchEnd={(e) => {
                        const el = e.currentTarget as any;
                        const deltaX = el._swipeDeltaX || 0;
                        const contentEl = e.currentTarget.querySelector('[data-phase-content]') as HTMLElement;
                        
                        const threshold = 60;
                        let nextIdx = displayIndex;
                        if (deltaX < -threshold) {
                          nextIdx = Math.min(displayIndex + 1, phases.length - 1);
                        } else if (deltaX > threshold) {
                          nextIdx = Math.max(displayIndex - 1, 0);
                        }
                        
                        if (nextIdx !== displayIndex && contentEl) {
                          // Slide out in swipe direction
                          const direction = deltaX < 0 ? -1 : 1;
                          contentEl.style.transition = 'transform 0.15s ease-out';
                          contentEl.style.transform = `translateX(${direction * 300}px)`;
                          setTimeout(() => {
                            setSelectedPubertyPhase(nextIdx === currentPhaseIndex ? null : nextIdx);
                            if (contentEl) {
                              // Reset instantly off-screen on opposite side, then slide in
                              contentEl.style.transition = 'none';
                              contentEl.style.transform = `translateX(${-direction * 300}px)`;
                              requestAnimationFrame(() => {
                                contentEl.style.transition = 'transform 0.15s ease-out';
                                contentEl.style.transform = 'translateX(0)';
                              });
                            }
                          }, 150);
                        } else if (contentEl) {
                          contentEl.style.transition = 'transform 0.15s ease-out';
                          contentEl.style.transform = 'translateX(0)';
                        }
                        
                        setTimeout(() => {
                          if (contentEl) contentEl.style.transition = '';
                        }, 400);
                        
                        el._swipeStartX = undefined;
                        el._swipeDeltaX = 0;
                      }}
                    >
                      <div data-phase-content className="px-4 pb-4" style={{ willChange: 'transform' }}>
                        {!isCurrentPhase && (
                          <p className="text-[14px] text-white/30 mb-3 italic">Diese Phase ist {ageInMonths < phase.min ? 'noch nicht erreicht' : 'bereits abgeschlossen'}</p>
                        )}
                        
                        {/* Characteristics */}
                        <p className="text-[14px] text-white/60 mb-4">{phase.characteristics}</p>
                        
                        {/* Needs as bullet points */}
                        <div className="text-[14px] text-white/60">
                          <span className="text-white">{isCurrentPhase ? 'Was Kalle jetzt braucht:' : 'Was in dieser Phase wichtig ist:'}</span>
                          <ul className="mt-2 space-y-1">
                            {phase.needs.map((need, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-white/30">•</span>
                                <span>{need}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Training Section */}
            {(() => {
              const settings = getCachedSettings();
              const birthday = settings.birthday ? new Date(settings.birthday) : new Date('2025-01-20');
              const ageInMonths = differenceInMonths(new Date(), birthday);

              const trainingsByAge: { maxAge: number; tricks: { name: string; description: string; steps: string[] }[] }[] = [
                { maxAge: 4, tricks: [
                  { name: 'Name lernen', description: 'Kalle soll seinen Namen mit etwas Positivem verbinden – so wird er zuverlässig reagieren.', steps: ['Warte auf einen ruhigen Moment, in dem Kalle nicht abgelenkt ist', 'Sage seinen Namen einmal klar und deutlich', 'Sobald er dich anschaut → sofort Leckerli geben', 'Wiederhole das 10x am Tag in verschiedenen Räumen', 'Nie den Namen im negativen Kontext verwenden (z.B. beim Schimpfen)'] },
                  { name: 'Sitz', description: 'Das erste und wichtigste Kommando – die Basis für alles Weitere.', steps: ['Halte ein Leckerli vor Kalles Nase', 'Führe es langsam über seinen Kopf nach hinten', 'Sein Po geht automatisch runter – genau dann „Sitz" sagen', 'Sofort belohnen, wenn der Po den Boden berührt', 'Übe 5-10x hintereinander, dann Pause machen'] },
                  { name: 'Rückruf Basics', description: 'Der zuverlässige Rückruf kann Leben retten. Jetzt die Grundlage legen!', steps: ['Starte in der Wohnung ohne Ablenkung', 'Rufe Kalles Namen + „Komm!" in fröhlichem Ton', 'Wenn er kommt: Jackpot! (3-5 Leckerlis nacheinander)', 'Niemals schimpfen, wenn er kommt – auch wenn es gedauert hat', 'Später im Garten üben, dann mit leichter Ablenkung'] },
                  { name: 'Beißhemmung', description: 'Welpen müssen lernen, wie fest sie zubeißen dürfen – das ist ein normaler Lernprozess.', steps: ['Spielt gemeinsam mit einem Spielzeug', 'Wenn Kalle zu fest zubeißt: kurz „Au!" sagen (nicht schreien)', 'Spiel sofort für 3 Sekunden unterbrechen, Hände weg', 'Dann normal weiterspielen', 'Über Wochen die Toleranzschwelle langsam senken', 'Wichtig: Kein Wegziehen der Hand – das macht es zum Spiel'] },
                  { name: 'Leinenführigkeit Intro', description: 'Frühzeitig üben, damit Spaziergänge später entspannt sind.', steps: ['Erst an Halsband/Geschirr in der Wohnung gewöhnen', 'Leine dran, drinnen herumlaufen lassen', 'Wenn Kalle neben dir läuft → Leckerli auf deiner Seite geben', 'Zieht er → sofort stehen bleiben, zu einer Statue werden', 'Erst wenn die Leine locker ist → weitergehen', 'Kurze Einheiten: 5 Minuten reichen am Anfang'] },
                ]},
                { maxAge: 8, tricks: [
                  { name: 'Platz', description: 'Baut auf „Sitz" auf und ist Grundlage für Bleib-Übungen und Ruhe.', steps: ['Kalle sitzt bereits (Sitz-Kommando)', 'Leckerli vor der Nase → langsam zum Boden führen', 'Hand bleibt am Boden, Kalle folgt mit der Nase', 'Sobald Ellenbogen den Boden berühren → „Platz!" + belohnen', 'Klappt es nicht: Leckerli unter deinem Bein durchführen', 'Nie auf den Boden drücken – er soll es freiwillig anbieten'] },
                  { name: 'Bleib', description: 'Geduld und Impulskontrolle – super wichtig für den Alltag.', steps: ['Kalle sitzt → offene Handfläche zeigen (Stopp-Geste)', 'Einen kleinen Schritt zurücktreten', 'Sofort zurück zu Kalle → belohnen', 'Langsam steigern: 2 Schritte, 3 Schritte...', 'Immer DU kommst zurück zu ihm (nicht er zu dir)', 'Erst Distanz steigern, dann Dauer, dann Ablenkung – nie alles gleichzeitig'] },
                  { name: 'Pfote geben', description: 'Ein süßer Trick, der auch die Bindung stärkt und Kalle zum Nachdenken bringt.', steps: ['Leckerli in geschlossener Faust halten', 'Faust auf Pfotenhöhe vor Kalle halten', 'Er wird schnuppern, lecken, irgendwann die Pfote heben', 'Genau DANN: Faust öffnen + „Pfote!" + belohnen', 'Nach ein paar Wiederholungen: offene Hand hinhalten', 'Links und rechts üben: „Pfote" und „Andere Pfote"'] },
                  { name: 'Impulskontrolle', description: 'Kalle lernt, dass Geduld sich lohnt – eine der wichtigsten Lektionen überhaupt.', steps: ['Leckerli in offener Hand zeigen', 'Hand schließen, wenn Kalle danach schnappt', 'Warten bis er aufhört und dich anschaut', 'Hand öffnen + „Nimm" → er darf es nehmen', 'Steigern: Leckerli auf den Boden legen, mit Hand abdecken', 'Später: Leckerli offen auf dem Boden, Kalle wartet auf „Nimm"'] },
                  { name: 'Deckentraining', description: 'Ruhe lernen ist genauso wichtig wie Action – die Decke wird zum sicheren Ruheplatz.', steps: ['Kalles Decke/Bett an einen festen Platz legen', 'Kalle zur Decke führen → Leckerli auf die Decke werfen', 'Sobald er drauf ist → loben und weitere Leckerlis geben', 'Langsam Dauer steigern: erst 5 Sek, dann 30 Sek, dann Minuten', 'Kalle lernt: auf der Decke passieren gute Dinge', 'Nie die Decke als Strafe nutzen – sie soll positiv besetzt sein'] },
                  { name: 'Touch', description: 'Vielseitiges Signal – perfekt zum Heranrufen, Umlenken und für Tierarztbesuche.', steps: ['Offene Handfläche auf Nasenhöhe hinhalten', 'Kalle stupst natürlich neugierig dagegen', 'Genau in dem Moment: Markerwort/Click + Leckerli', 'Wiederholen bis er es zuverlässig macht', 'Dann das Wort „Touch" hinzufügen', 'Später nutzen: zum Heranrufen, an neue Objekte heranführen, beim Tierarzt'] },
                ]},
                { maxAge: 14, tricks: [
                  { name: 'Fuß gehen', description: 'Eng an deiner Seite laufen – ideal für belebte Straßen und Begegnungen.', steps: ['Leckerli in der Hand, an deiner linken Hüfte halten', 'Kalle positioniert sich automatisch dort → belohnen', 'Einen Schritt gehen → belohnen, wenn er mitgeht', 'Alle 2-3 Schritte belohnen, langsam Abstände erhöhen', 'Richtungswechsel einbauen: kehrt machen, Kalle folgt → belohnen', 'Erst drinnen üben, dann draußen mit wenig Ablenkung'] },
                  { name: 'Abrufen unter Ablenkung', description: 'Der wahre Test für den Rückruf – wenn andere Hunde, Vögel oder Gerüche locken.', steps: ['Schleppleine verwenden (10-15m), niemals ohne Sicherung', 'Warte bis Kalle abgelenkt aber nicht im Hochstress ist', 'Rückrufsignal geben – fröhlich und einladend', 'Kommt er: MEGA-Belohnung (Fleischwurst, Käse, Jackpot!)', 'Kommt er nicht: sanft über Schleppleine heranführen, trotzdem belohnen', 'Regel: Nur rufen, wenn du 80% sicher bist, dass er kommt'] },
                  { name: 'Dreh dich', description: 'Ein spaßiger Trick, der Koordination und Konzentration fördert.', steps: ['Leckerli in der Hand, auf Kalles Nasenhöhe', 'Hand im Kreis führen – Kalle folgt mit dem Körper', 'Sobald er eine volle Drehung macht → belohnen + „Dreh!"', 'Erst eine Richtung perfektionieren', 'Dann die andere Richtung mit neuem Wort (z.B. „Turn")', 'Hand-Signal langsam reduzieren zu einer Kreisbewegung mit dem Finger'] },
                  { name: 'Slalom durch die Beine', description: 'Fördert Koordination, sieht beeindruckend aus und macht beiden Spaß!', steps: ['Breitbeinig und stabil hinstellen', 'Leckerli in der rechten Hand, Kalle von links durch die Beine locken', 'Belohnen wenn er durchgeht', 'Dann Leckerli in der linken Hand, von rechts durchlocken', 'Abwechselnd: links, rechts, links, rechts', 'Später: Schritte dazu nehmen, sodass Kalle im Laufen durchschlängelt'] },
                  { name: 'Warten am Bordstein', description: 'Eine potenziell lebensrettende Übung für den Straßenverkehr.', steps: ['An jeder Bordsteinkante stehen bleiben', 'Kalle setzt sich automatisch (oder mit „Sitz" helfen)', 'Blickkontakt abwarten', '„Okay" oder „Weiter" sagen → gemeinsam losgehen', 'Konsequent bei JEDER Straße üben, auch wenn keine Autos kommen', 'Ziel: Kalle stoppt irgendwann von allein am Bordstein'] },
                  { name: 'Gegenstand bringen', description: 'Apportieren ist Teamwork und lastet geistig sowie körperlich aus.', steps: ['Starte mit Kalles Lieblingsspielzeug', 'Kurz werfen (2-3 Meter)', 'Wenn Kalle es aufnimmt: begeistert loben und Leckerli zeigen', 'Er kommt zurück → Spielzeug gegen Leckerli tauschen', 'Kein Zerren oder Jagen – ruhig bleiben', 'Kommt er nicht zurück: weglaufen! Das macht dich interessanter'] },
                ]},
                { maxAge: 24, tricks: [
                  { name: 'Rolle', description: 'Beeindruckender Trick, der Vertrauen zeigt – Kalle legt sich auf den Rücken!', steps: ['Kalle liegt im Platz', 'Leckerli an der Nase → seitlich über die Schulter führen', 'Er dreht den Kopf, der Körper folgt', 'Sobald er auf dem Rücken/der Seite liegt → belohnen', 'Schrittweise die volle Rolle aufbauen', 'Nie erzwingen – manche Hunde brauchen Wochen, bis sie sich wohlfühlen'] },
                  { name: 'Männchen', description: 'Stärkt die Rückenmuskulatur und sieht bezaubernd aus.', steps: ['Kalle sitzt → Leckerli über die Nase langsam nach oben führen', 'Er hebt die Vorderpfoten vom Boden', 'Sofort belohnen – am Anfang reicht ein kurzes Anheben', 'Langsam steigern: höher, länger halten', 'Wort „Männchen" hinzufügen wenn es zuverlässig klappt', 'Nicht zu lange halten lassen – belastet den Rücken'] },
                  { name: 'Schäm dich', description: 'Süßer Trick bei dem Kalle die Pfote über die Nase legt.', steps: ['Kleines Stück Klebeband auf Kalles Nasenrücken kleben', 'Er wird automatisch die Pfote heben um es abzuwischen', 'Genau dann: „Schäm dich!" + Leckerli', 'Wiederholen bis die Verbindung steht', 'Klebeband immer kleiner machen', 'Am Ende reicht das Handzeichen/Wort ohne Klebeband'] },
                  { name: 'Rückwärts gehen', description: 'Trainiert Körperbewusstsein und Koordination der Hinterbeine.', steps: ['In einem engen Flur/Gang üben (natürliche Begrenzung)', 'Kalle steht dir gegenüber', 'Mache einen Schritt auf ihn zu → er weicht zurück', 'Sofort belohnen für jeden Schritt rückwärts', '„Zurück" als Kommando einführen', 'Später ohne Flur-Begrenzung üben'] },
                  { name: 'Distanzkontrolle', description: 'Kalle führt Kommandos aus der Entfernung aus – zeigt echte Teamarbeit.', steps: ['Starte mit 1 Meter Abstand: Sitz → Platz → Steh', 'Nutze deutliche Handzeichen', 'Belohnung jedes Mal zum Hund bringen', 'Langsam Distanz erhöhen: 2m, 3m, 5m', 'Kein Leckerli zeigen – erst nach dem Ausführen belohnen', 'Verschiedene Orte üben, nicht nur zu Hause'] },
                  { name: 'Apportieren mit Benennung', description: 'Hunde können Wörter lernen – Kalle kann das auch!', steps: ['Starte mit einem Spielzeug, z.B. „Ball"', 'Ball zeigen → „Ball" sagen → werfen → Kalle bringt ihn', 'Wenn das sitzt: zweites Spielzeug einführen, z.B. „Seil"', 'Beide Spielzeuge hinlegen: „Bring den Ball"', 'Richtiges Spielzeug → Jackpot! Falsches → nochmal versuchen', 'Hunde können 50-250 Wörter lernen – Geduld zahlt sich aus'] },
                ]},
                { maxAge: 100, tricks: [
                  { name: 'Aufräumen', description: 'Kalle räumt sein Spielzeug in eine Kiste – praktisch und beeindruckend!', steps: ['Kiste neben Spielzeug stellen', 'Kalle Spielzeug ins Maul geben → über die Kiste halten', '„Aus" → Spielzeug fällt rein → Riesenlob + Belohnung', 'Langsam Distanz zur Kiste erhöhen', 'Kalle lernt: Spielzeug aufheben + zur Kiste tragen + reinwerfen', 'Geduld: Dieser Trick braucht Wochen bis er zuverlässig klappt'] },
                  { name: 'Verstecken spielen', description: 'Stärkt die Bindung, den Rückruf und macht riesig Spaß!', steps: ['Partner hält Kalle fest, du versteckst dich (anfangs leicht)', 'Rufe Kalle → Partner lässt los', 'Wenn er dich findet: Party! Leckerlis, Lob, Spielzeug', 'Verstecke langsam schwieriger machen', 'Auch draußen im Wald spielbar', 'Kalle lernt: dich zu suchen ist das Beste überhaupt'] },
                  { name: 'Nasenarbeit', description: 'Geistig extrem anstrengend – 10 Minuten Nasenarbeit = 1 Stunde Spaziergang!', steps: ['3 undurchsichtige Becher/Töpfe aufstellen', 'Kalle zusehen lassen, unter welchen du ein Leckerli legst', 'Kalle zeigt den richtigen an (Pfote, Stupsen) → belohnen', 'Später: Kalle nicht mehr zusehen lassen', 'Anzahl der Becher erhöhen', 'Perfekt für Regentage oder wenn Kalle sich erholen muss'] },
                  { name: 'Longieren', description: 'Kommunikation über Körpersprache auf Distanz – stärkt die Beziehung enorm.', steps: ['Kreis aus Pylonen/Gegenständen aufbauen (3-5m Durchmesser)', 'Kalle außen am Kreis, du in der Mitte', 'Mit Körpersprache und Handzeichen Richtung anzeigen', 'Läuft er außen rum → regelmäßig Leckerli zuwerfen', 'Richtungswechsel einbauen', 'Kreis langsam vergrößern, Signale reduzieren'] },
                  { name: 'Trick-Kette', description: 'Mehrere Tricks hintereinander – zeigt wie viel Kalle schon gelernt hat!', steps: ['3 gut sitzende Tricks auswählen: z.B. Sitz → Pfote → Platz', 'Erst jeden einzeln bestätigen mit Leckerli', 'Dann 2 hintereinander → Leckerli erst nach dem zweiten', 'Dann alle 3 → Jackpot am Ende!', 'Neue Kombinationen ausprobieren', 'Reihenfolge variieren, damit Kalle wirklich zuhört'] },
                  { name: 'Fährtenarbeit', description: 'Nutzt Kalles stärksten Sinn – die Nase. Extrem befriedigend für Hunde!', steps: ['Auf einer Wiese: Leckerli-Spur in gerader Linie legen (alle 30cm)', 'Kalle an den Anfang führen → „Such!"', 'Er folgt der Spur mit der Nase → findet Leckerli unterwegs', 'Am Ende: großes Leckerli oder Spielzeug als Jackpot', 'Spur langsam komplexer machen: Kurven, Ecken', 'Max 10-15 Minuten – geistig sehr anstrengend!'] },
                ]},
              ];

              const ageGroup = trainingsByAge.find(g => ageInMonths < g.maxAge) || trainingsByAge[trainingsByAge.length - 1];
              // Pick a random trick on each reload
              const trick = ageGroup.tricks[trainingTrickIndexRef.current % ageGroup.tricks.length];

              return (
                <div id="section-training" className="mb-8">
                  <h2 className="flex items-center gap-2 text-[16px] text-white mb-4"><span className="info-emoji">🧑‍🏫</span> <span>Training</span></h2>
                  <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] overflow-hidden p-4 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                    <div className="text-white text-[14px] font-medium mb-2">{trick.name}</div>
                    <div className="text-white/60 text-[14px] leading-relaxed mb-3">{trick.description}</div>
                    <ul className="space-y-1.5">
                      {trick.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-[14px] text-white/50">
                          <span className="text-white/30 shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
            

            {/* Orte Section */}
            
            <div id="section-orte" className="mb-8">
              <h2 className="flex items-center gap-2 text-[16px] text-white mb-4"><span className="info-emoji">🗺️</span> <span>Orte</span></h2>
              <div className="bg-white/[0.01] rounded-[12px] border border-white/[0.03] p-4 shadow-[0_0_12px_4px_rgba(0,0,0,0.08)]">
                {/* Map with pins */}
                {places.filter(p => p.latitude && p.longitude).length > 0 && (
                  <div className="rounded-lg overflow-hidden mb-4 bg-white/5 h-[200px] relative">
                    <PlacesMap places={places.filter(p => p.latitude && p.longitude).map(p => ({ latitude: p.latitude!, longitude: p.longitude!, name: p.name, link: p.link }))} />
                  </div>
                )}
                <div className="flex flex-col divide-y divide-white/10">
                  {places.map((place, index) => {
                    const isActive = activePlaceId === place.id;
                    const isFirst = index === 0;
                    return (
                      <div
                        key={place.id}
                        className="relative flex w-full items-stretch overflow-hidden gap-1"
                        onTouchStart={(e) => handleItemTouchStart(e, place.id)}
                        onTouchMove={handleItemTouchMove}
                        onTouchEnd={() => handleItemTouchEnd('place')}
                      >
                        <div
                          className={`flex items-center gap-3 ${isFirst ? 'pb-1.5' : 'py-1.5'} cursor-pointer select-none min-w-0 flex-1`}
                          onClick={() => handleItemClick(place, 'place')}
                          style={{ transition: swipingItemId === place.id ? 'none' : 'all 150ms ease-linear' }}
                        >
                          {place.image_url ? (
                            <>
                              <img 
                                src={place.image_url} 
                                alt={place.name} 
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                                }}
                              />
                              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0 hidden">
                                <MapPin size={14} className="text-white/60" />
                              </div>
                            </>
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                              <MapPin size={14} className="text-white/60" />
                            </div>
                          )}
                          <span className="text-[14px] text-white/80 truncate min-w-0 flex-1">{place.name}</span>
                          <span className="text-[12px] text-white/40 w-[72px] text-left flex-shrink-0">{place.city || ''}</span>
                          {place.link && (
                            <span className="text-white/40 p-1 flex-shrink-0">
                              <ExternalLink size={14} />
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSwipeDelete(place.id, 'place'); }}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="flex-shrink-0 bg-red-500 flex items-center justify-center text-[12px] text-white overflow-hidden self-stretch"
                          style={{
                            width: (() => { const isSwiping = swipingItemId === place.id; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            minWidth: (() => { const isSwiping = swipingItemId === place.id; const offset = isSwiping ? swipeItemOffset : (isActive ? 82 : 0); return offset > 0 ? `${offset}px` : 0; })(),
                            transition: swipingItemId === place.id ? 'none' : 'width 150ms ease-linear, min-width 150ms ease-linear',
                          }}
                        >
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">Löschen</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add place inline */}
                <div className={places.length > 0 ? "border-t border-white/10" : ""}>
                  {showAddPlace ? (
                    <div className="flex items-center gap-2 pt-1.5">
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus size={14} className="text-white/40" />
                      </div>
                      <input
                        type="url"
                        placeholder="Google Maps Link einfügen"
                        value={newPlaceLink}
                        onChange={(e) => setNewPlaceLink(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlaceFromUrl(); if (e.key === 'Escape') { setShowAddPlace(false); setNewPlaceLink(''); } }}
                        className="flex-1 min-w-0 bg-transparent text-[14px] text-white/80 outline-none placeholder:text-white/30 px-3 py-1.5 rounded"
                        autoFocus
                      />
                      <button
                        onClick={handleAddPlaceFromUrl}
                        disabled={isFetchingPlaceMeta || !newPlaceLink.trim()}
                        className="text-[12px] text-white flex-shrink-0 disabled:opacity-30"
                      >
                        {isFetchingPlaceMeta ? 'Laden...' : 'Hinzufügen'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddPlace(true)}
                      className="flex items-center gap-3 pt-1.5 w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus size={16} className="text-white/40" />
                      </div>
                      <span className="text-[14px] text-white/40">Ort hinzufügen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            

            </div>
            {/* Wochenplan Section - Horizontal scrollable cards, full viewport width on desktop */}
            
            <div id="section-wochenplan" className="mb-0 -mx-4">
              <div className="mb-3 px-4 md:pl-[calc((100vw-60vw)/2)] lg:pl-[calc((100vw-50vw)/2)]">
                <h2 className="flex items-center gap-2 text-[16px] text-white"><span className="info-emoji">🗓️</span> <span>Wochenplan</span></h2>
              </div>
              
              {!dataLoaded ? (
                <div className="border border-white/30 rounded-[16px] overflow-hidden p-4">
                  <Skeleton className="h-40 bg-white/10" />
                </div>
              ) : (
              <div 
                ref={wochenplanScrollRef}
                className="overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="px-4 md:pl-[calc((100vw-60vw)/2)] lg:pl-[calc((100vw-50vw)/2)] [--card-w:calc((100vw-48px)/2.1)] md:[--card-w:calc((60vw-16px)/2.5)] lg:[--card-w:calc((50vw-16px)/2.5)]" style={{ width: 'max-content' }}>
                  {/* Ownership spans row */}
                  {(() => {
                    const cardWidth = `var(--card-w)`;
                    const gap = 8;
                    const spans: { person: string; startIdx: number; length: number; endDate: Date; startDate: Date }[] = [];
                    let i = 0;
                    while (i < TOTAL_DAYS) {
                      const d = new Date(rangeStart);
                      d.setDate(d.getDate() + i);
                      const owner = getKalleOwnerForDate(icalEvents, d);
                      if (owner) {
                        const startIdx = i;
                        const startDate = new Date(d);
                        let len = 1;
                        for (let j = i + 1; j < TOTAL_DAYS; j++) {
                          const nd = new Date(rangeStart);
                          nd.setDate(nd.getDate() + j);
                          const no = getKalleOwnerForDate(icalEvents, nd);
                          if (no && no.person === owner.person) { len++; } else break;
                        }
                        const lastDay = new Date(rangeStart);
                        lastDay.setDate(lastDay.getDate() + startIdx + len - 1);
                        spans.push({ person: owner.person, startIdx, length: len, endDate: lastDay, startDate });
                        i += len;
                      } else {
                        i++;
                      }
                    }
                    if (spans.length === 0) return null;
                    return (
                      <div className="relative mb-2" style={{ height: '34px' }}>
                        {spans.map((span, si) => (
                          <div
                            key={si}
                            className="absolute top-0 h-full rounded-[14px] bg-black py-2"
                            style={{
                              left: `calc(${span.startIdx} * (${cardWidth} + ${gap}px))`,
                              width: `calc(${span.length} * ${cardWidth} + ${(span.length - 1) * gap}px)`,
                            }}
                          >
                            <div className="relative h-full">
                              <div className="sticky left-0 h-full flex items-center pl-5 pr-6 pointer-events-none" style={{ width: 'calc(100vw)', maxWidth: `calc(${span.length} * ${cardWidth} + ${(span.length - 1) * gap}px)` }}>
                                <span className="text-[14px] text-white flex items-center gap-1.5 min-w-0">
                                  <span className="text-[16px] shrink-0 leading-none -translate-y-[2px]">🐶</span>
                                  <span className="truncate">{span.person} hat Kalle</span>
                                </span>
                                <span className="flex-1" />
                                <span className="text-[12px] text-white/40 shrink-0 text-right">bis {format(new Date(span.endDate.getTime() - 86400000), 'd.M.', { locale: de })}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="flex gap-2">
                  {Array.from({ length: TOTAL_DAYS }, (_, idx) => {
                    const dayDate = new Date(rangeStart);
                    dayDate.setDate(dayDate.getDate() + idx);
                    const dayAbbr = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                    const jsDay = dayDate.getDay();
                    const isToday = idx === currentDayIndex;
                    const owner = getKalleOwnerForDate(icalEvents, dayDate);
                    
                    // Build walk slots
                    type ICalItem = { summary: string; timeStr: string; isMedicalIcal?: boolean; medicalEmoji?: string };
                    type SlotItem = { avgHour: number; hasPoop: boolean; hasPipi: boolean; isWalk: boolean; icalEvents: ICalItem[]; isEstimate?: boolean; isFutureEstimate?: boolean; exactTime?: string };
                    const slots: SlotItem[] = [];
                    
                    {
                      // Start with averaged estimates for all days
                      const monBasedDay = (jsDay + 6) % 7;
                      const data = avgGassiByDay.get(monBasedDay);
                      
                      if (data) {
                        // Use pre-computed buckets with poop frequency flags
                        for (let bi = 0; bi < data.pipiHours.length; bi++) {
                          slots.push({
                            avgHour: data.pipiHours[bi],
                            hasPoop: data.poopFlags[bi],
                            hasPipi: true,
                            isWalk: true,
                            icalEvents: [],
                            isEstimate: true,
                          });
                        }
                      }
                      
                      // Replace estimated slots with real entries for any day that has logged data
                      {
                        const dayStart = new Date(dayDate);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(dayDate);
                        dayEnd.setHours(23, 59, 59, 999);
                        
                        
                        
                        const dayEvents = appEvents
                          .filter(e => (e.type === 'pipi' || e.type === 'stuhlgang') && new Date(e.time) >= dayStart && new Date(e.time) <= dayEnd)
                          .map(e => {
                            const d = new Date(e.time);
                            return {
                              hour: d.getHours() + d.getMinutes() / 60,
                              isPoop: e.type === 'stuhlgang',
                              timeStr: `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`,
                            };
                          })
                          .sort((a, b) => a.hour - b.hour);
                        
                        
                        if (dayEvents.length > 0) {
                          // Cluster real events by same timeStr
                          const timeGroups = new Map<string, { hour: number; hasPoop: boolean; hasPipi: boolean }>();
                          for (const evt of dayEvents) {
                            const existing = timeGroups.get(evt.timeStr);
                            if (existing) {
                              if (evt.isPoop) existing.hasPoop = true;
                              else existing.hasPipi = true;
                            } else {
                              timeGroups.set(evt.timeStr, { hour: evt.hour, hasPoop: evt.isPoop, hasPipi: !evt.isPoop });
                            }
                          }
                          const realSlots: SlotItem[] = Array.from(timeGroups.entries()).map(([timeStr, g]) => ({
                            avgHour: g.hour,
                            hasPoop: g.hasPoop,
                            hasPipi: g.hasPipi,
                            isWalk: true,
                            icalEvents: [],
                            isEstimate: false,
                            exactTime: timeStr,
                          }));
                          
                          if (isToday) {
                            const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
                            const usedEstimates = new Set<number>();
                            const usedReals = new Set<number>();
                            
                            for (let ei = 0; ei < slots.length; ei++) {
                              if (!slots[ei].isEstimate) continue;
                              let bestRi = -1;
                              let bestDist = Infinity;
                              for (let ri = 0; ri < realSlots.length; ri++) {
                                if (usedReals.has(ri)) continue;
                                const dist = Math.abs(realSlots[ri].avgHour - slots[ei].avgHour);
                                if (dist <= 2 && dist < bestDist) {
                                  bestDist = dist;
                                  bestRi = ri;
                                }
                              }
                              if (bestRi >= 0) {
                                usedEstimates.add(ei);
                                usedReals.add(bestRi);
                              }
                            }
                            
                            const kept: SlotItem[] = [];
                            for (let i = 0; i < slots.length; i++) {
                              if (usedEstimates.has(i)) continue;
                              if (slots[i].isEstimate && slots[i].avgHour > currentHour) {
                                kept.push({ ...slots[i], isFutureEstimate: true });
                              } else if (slots[i].isEstimate) {
                                continue; // Past unmatched estimate on today — skip
                              } else {
                                kept.push(slots[i]);
                              }
                            }
                            slots.length = 0;
                            slots.push(...kept, ...realSlots);
                          } else {
                            const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
                            if (isPast) {
                              // Past day: drop all estimates, keep only real entries
                              const kept = slots.filter(s => !s.isEstimate);
                              const extraReals = realSlots;
                              slots.length = 0;
                              slots.push(...kept, ...extraReals);
                            } else {
                              // Future day: keep unmatched estimates
                              const usedEstimates = new Set<number>();
                              const usedReals = new Set<number>();
                              
                              for (let ei = 0; ei < slots.length; ei++) {
                                if (!slots[ei].isEstimate) continue;
                                let bestRi = -1;
                                let bestDist = Infinity;
                                for (let ri = 0; ri < realSlots.length; ri++) {
                                  if (usedReals.has(ri)) continue;
                                  const dist = Math.abs(realSlots[ri].avgHour - slots[ei].avgHour);
                                  if (dist <= 2 && dist < bestDist) {
                                    bestDist = dist;
                                    bestRi = ri;
                                  }
                                }
                                if (bestRi >= 0) {
                                  usedEstimates.add(ei);
                                  usedReals.add(bestRi);
                                }
                              }
                              
                              const kept = slots.filter((_, i) => !usedEstimates.has(i));
                              const extraReals = realSlots.filter((_, i) => !usedReals.has(i));
                              slots.length = 0;
                              slots.push(...kept, ...realSlots.filter((_, i) => usedReals.has(i)), ...extraReals);
                            }
                          }
                          slots.sort((a, b) => a.avgHour - b.avgHour);
                        } else if (isToday) {
                          // No real events but it's today — remove past estimates
                          const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
                          const kept: SlotItem[] = [];
                          for (const slot of slots) {
                            if (slot.isEstimate && slot.avgHour <= currentHour) continue;
                            if (slot.isEstimate) kept.push({ ...slot, isFutureEstimate: true });
                            else kept.push(slot);
                          }
                          slots.length = 0;
                          slots.push(...kept);
                        } else {
                          const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
                          if (isPast) {
                            // Past day with no real events — hide all predictions
                            const kept = slots.filter(s => !s.isEstimate);
                            slots.length = 0;
                            slots.push(...kept);
                          } else {
                            // Future day with no real events — keep estimates as-is (full opacity)
                          }
                        }
                      }
                    }
                    
                    // Collect medical events for this day
                    const medicalTypes = ['wurmkur', 'parasiten', 'krallen'];
                    const medicalEmojis: Record<string, string> = { wurmkur: '🪱', parasiten: '🦟', krallen: '💅' };
                    const medicalLabels: Record<string, string> = { wurmkur: 'Wurmkur', parasiten: 'Parasiten Tablette', krallen: 'Krallen schneiden' };
                    const dayDateStart2 = new Date(dayDate); dayDateStart2.setHours(0, 0, 0, 0);
                    const dayDateEnd2 = new Date(dayDate); dayDateEnd2.setHours(23, 59, 59, 999);
                    const dayMedicalEvents = appEvents
                      .filter(e => medicalTypes.includes(e.type) && new Date(e.time) >= dayDateStart2 && new Date(e.time) <= dayDateEnd2);

                    // Attach iCal events to nearest slot or standalone; separate medical iCal events
                    const evts = weekIcalEvents.get(idx) || [];
                    const medicalIcalPatterns: Record<string, string> = { 'wurmkur': '🪱', 'krallen': '💅', 'parasiten': '🦟' };
                    const medicalIcalEvents: ICalItem[] = [];
                    for (const e of evts) {
                      if (e.summary?.match(/hat\s+Kalle/i)) continue;
                      const summaryLower = (e.summary || '').toLowerCase();
                      const medicalKey = Object.keys(medicalIcalPatterns).find(k => summaryLower.includes(k));
                      if (medicalKey) {
                        medicalIcalEvents.push({ summary: (e.summary || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]+$/u, '').trim(), timeStr: '', isMedicalIcal: true, medicalEmoji: medicalIcalPatterns[medicalKey] });
                        continue;
                      }
                      const dt = new Date(e.dtstart);
                      const hour = dt.getHours() + dt.getMinutes() / 60;
                      const icalItem: ICalItem = { summary: e.summary || '', timeStr: format(dt, 'HH:mm') };
                      
                      // Always create a standalone slot for iCal events so they sort by their actual start time
                      slots.push({ avgHour: hour, hasPoop: false, hasPipi: false, isWalk: false, icalEvents: [icalItem], isEstimate: false });
                    }
                    
                    // Sort all slots by time
                    slots.sort((a, b) => a.avgHour - b.avgHour);
                    
                    const formatTime = (h: number) => {
                      const rounded = Math.round(h * 2) / 2;
                      const hours = Math.floor(rounded);
                      const mins = rounded % 1 === 0.5 ? 30 : 0;
                      return `${hours}:${mins.toString().padStart(2, '0')}`;
                    };
                    
                    // Card width: calc((100vw - 32px - 2*8px) / 2.5) ≈ 40vw
                    const scrollTarget = scrollToDate ? (() => {
                      const target = new Date(scrollToDate);
                      target.setHours(0, 0, 0, 0);
                      const diffMs = target.getTime() - rangeStart.getTime();
                      const targetIdx = Math.round(diffMs / (24 * 60 * 60 * 1000));
                      return targetIdx >= 0 && targetIdx < TOTAL_DAYS ? targetIdx : null;
                    })() : null;
                    const isScrollTarget = scrollTarget !== null ? idx === scrollTarget : isToday;

                    return (
                      <div
                        key={idx}
                        id={isToday ? 'wochenplan-today' : undefined}
                        ref={isScrollTarget ? todayColRef : undefined}
                        className="shrink-0 rounded-[14px] overflow-hidden bg-black"
                        style={{ width: 'var(--card-w)' }}
                      >
                        {/* Compact day header */}
                        <div className="px-3 pt-2.5 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <span className="text-[14px] font-medium text-white">
                              {isToday ? 'Heute' : dayAbbr[jsDay]}
                            </span>
                            <span className="text-white/70 text-[12px]">
                              {format(dayDate, 'd. MMM', { locale: de })}
                            </span>
                          </div>
                        </div>
                        
                        
                        
                        {/* Entries */}
                        <div className="px-2.5 pb-2.5">
                          {(slots.length === 0 && dayMedicalEvents.length === 0 && medicalIcalEvents.length === 0) ? (
                            <div className="text-white/15 text-[12px] py-2 text-center">–</div>
                          ) : (
                            <div className="space-y-1.5">
                              {slots.map((slot, i) => (
                                <div key={i}>
                                   {/* Walk entry - compact single-line */}
                                   {slot.isWalk && (
                                    <div className={`p-3 rounded-lg overflow-hidden ${slot.isFutureEstimate ? '' : 'bg-white/[0.06]'} ${slot.isFutureEstimate ? 'opacity-60' : ''}`}>
                                      <div className="flex items-center gap-1.5 overflow-hidden">
                                      <span className="text-[12px] text-white/50 shrink-0">{slot.exactTime || formatTime(slot.avgHour)}</span>
                                        <span className="text-[18px] shrink-0">{slot.hasPipi && slot.hasPoop ? '💦💩' : slot.hasPoop ? '💩' : '💦'}</span>
                                      </div>
                                    </div>
                                   )}
                                   {/* iCal events - compact */}
                                   {slot.icalEvents.filter(evt => !evt.isMedicalIcal).map((evt, j) => (
                                      <div key={j} className={slot.isWalk ? 'mt-1.5' : ''}>
                                        <div className="p-3 rounded-lg bg-white/[0.06]">
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[12px] text-white/50 shrink-0">{evt.timeStr}</span>
                                              <span className="text-[18px] shrink-0">🗓️</span>
                                            </div>
                                            <span className="text-[12px] text-white/70 break-words min-w-0">{evt.summary}</span>
                                          </div>
                                        </div>
                                      </div>
                                   ))}
                                </div>
                                ))}
                              {/* Medical events from DB - last, no time, emoji first */}
                              {dayMedicalEvents.map((mev, mi) => (
                                <div key={`med-${mi}`} className="p-3 rounded-lg overflow-hidden bg-white/[0.06]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[18px] shrink-0">{medicalEmojis[mev.type] || '💊'}</span>
                                    <span className="text-[12px] text-white/70 truncate">{medicalLabels[mev.type] || mev.type}</span>
                                  </div>
                                </div>
                              ))}
                              {/* Medical iCal events - last, no time, emoji first */}
                              {medicalIcalEvents.map((mev, mi) => (
                                <div key={`medIcal-${mi}`} className="p-3 rounded-lg overflow-hidden bg-white/[0.06]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[18px] shrink-0">{mev.medicalEmoji}</span>
                                    <span className="text-[12px] text-white/70 break-words min-w-0">{mev.summary}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
              )}
            </div>
            
            
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default TagesplanOverlay;
