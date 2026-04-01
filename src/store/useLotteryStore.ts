import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit, ParkingSpot, DrawEntry, DrawGroup } from '@/types/lottery';

interface LotteryStore {
  units: Unit[];
  spots: ParkingSpot[];
  drawEntries: DrawEntry[];
  drawPhase: 'idle' | 'pcd' | 'moto' | 'main' | 'complete';
  currentDrawIndex: number;

  addUnit: (unit: Unit) => void;
  updateUnit: (id: string, data: Partial<Unit>) => void;
  removeUnit: (id: string) => void;

  addSpot: (spot: ParkingSpot) => void;
  updateSpot: (id: string, data: Partial<ParkingSpot>) => void;
  removeSpot: (id: string) => void;

  generateDrawOrder: () => void;
  advanceDraw: () => void;
  assignSpot: (unitId: string, spotId: string) => void;
  markAbsent: (unitId: string) => void;
  resetDraw: () => void;
  setDrawPhase: (phase: 'idle' | 'pcd' | 'moto' | 'main' | 'complete') => void;
}

function classifyUnit(unit: Unit): DrawGroup {
  const { financialStatus, presence, numberOfSpots, hadDoubleSpotLastDraw } = unit;
  const isPresent = presence === 'presente';
  const hadDouble = numberOfSpots === 1 && hadDoubleSpotLastDraw;

  if (financialStatus === 'adimplente') {
    if (isPresent) return hadDouble ? 1 : 2;
    return hadDouble ? 3 : 4;
  }
  if (financialStatus === 'acordo') {
    return isPresent ? 5 : 6;
  }
  return isPresent ? 7 : 8;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const useLotteryStore = create<LotteryStore>()(
  persist(
    (set, get) => ({
      units: [],
      spots: [],
      drawEntries: [],
      drawPhase: 'idle',
      currentDrawIndex: 0,

      addUnit: (unit) => set((s) => ({ units: [...s.units, unit] })),
      updateUnit: (id, data) =>
        set((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...data } : u)) })),
      removeUnit: (id) => set((s) => ({ units: s.units.filter((u) => u.id !== id) })),

      addSpot: (spot) => set((s) => ({ spots: [...s.spots, spot] })),
      updateSpot: (id, data) =>
        set((s) => ({ spots: s.spots.map((sp) => (sp.id === id ? { ...sp, ...data } : sp)) })),
      removeSpot: (id) => set((s) => ({ spots: s.spots.filter((sp) => sp.id !== id) })),

      generateDrawOrder: () => {
        const { units } = get();
        const eligible = units.filter((u) => !u.isPCD);
        const grouped = new Map<DrawGroup, Unit[]>();
        for (let g = 1; g <= 8; g++) grouped.set(g as DrawGroup, []);
        eligible.forEach((u) => {
          const g = classifyUnit(u);
          grouped.get(g)!.push(u);
        });

        const entries: DrawEntry[] = [];
        let order = 0;
        for (let g = 1; g <= 8; g++) {
          const shuffled = shuffle(grouped.get(g as DrawGroup)!);
          shuffled.forEach((u) => {
            entries.push({ unitId: u.id, group: g as DrawGroup, order: order++, drawn: false, skipped: false });
          });
        }
        set({ drawEntries: entries, currentDrawIndex: 0, drawPhase: 'main' });
      },

      advanceDraw: () => {
        const { currentDrawIndex, drawEntries } = get();
        const next = currentDrawIndex + 1;
        if (next >= drawEntries.length) {
          set({ drawPhase: 'complete' });
        } else {
          set({ currentDrawIndex: next });
        }
      },

      assignSpot: (unitId, spotId) => {
        set((s) => ({
          units: s.units.map((u) => (u.id === unitId ? { ...u, assignedSpotId: spotId } : u)),
          spots: s.spots.map((sp) => (sp.id === spotId ? { ...sp, assignedUnitId: unitId } : sp)),
          drawEntries: s.drawEntries.map((e) => (e.unitId === unitId ? { ...e, drawn: true } : e)),
        }));
      },

      markAbsent: (unitId) => {
        const { drawEntries, units } = get();
        const unit = units.find((u) => u.id === unitId);
        if (!unit) return;

        const updatedUnit = { ...unit, presence: 'ausente' as const };
        const newGroup = classifyUnit(updatedUnit);

        const currentEntry = drawEntries.find((e) => e.unitId === unitId);
        if (!currentEntry) return;

        const filtered = drawEntries.filter((e) => e.unitId !== unitId);
        // Find last entry in the new group to insert after
        let insertIdx = filtered.length;
        for (let i = filtered.length - 1; i >= 0; i--) {
          if (filtered[i].group <= newGroup) {
            insertIdx = i + 1;
            break;
          }
        }
        const newEntry: DrawEntry = { ...currentEntry, group: newGroup, skipped: true };
        filtered.splice(insertIdx, 0, newEntry);

        // Re-number
        filtered.forEach((e, i) => (e.order = i));

        set({
          units: units.map((u) => (u.id === unitId ? updatedUnit : u)),
          drawEntries: filtered,
        });
      },

      resetDraw: () => set({ drawEntries: [], currentDrawIndex: 0, drawPhase: 'idle' }),
      setDrawPhase: (phase) => set({ drawPhase: phase }),
    }),
    { name: 'grand-club-lottery' }
  )
);
