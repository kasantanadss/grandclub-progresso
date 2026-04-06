export type FinancialStatus = 'adimplente' | 'acordo' | 'inadimplente';
export type SpotType = 'individual' | 'dupla' | 'moto';
export type PresenceStatus = 'presente' | 'ausente';

export interface Unit {
  id: string;
  block?: string;
  apartment: string;
  ownerName: string;
  numberOfSpots: 1 | 2;
  rentsSecondSpot: boolean;
  financialStatus: FinancialStatus;
  presence: PresenceStatus;
  hadDoubleSpotLastDraw: boolean;
  requestedMotoSpot: boolean;
  assignedSpotId?: string;
  assignedMotoSpotId?: string;
}

export interface ParkingSpot {
  id: string;
  label: string;
  type: SpotType;
  assignedUnitId?: string;
}

export type DrawGroup = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface DrawEntry {
  unitId: string;
  group: DrawGroup;
  order: number;
  drawn: boolean;
  skipped: boolean;
}

export interface DrawState {
  entries: DrawEntry[];
  currentIndex: number;
  phase: 'idle' | 'moto' | 'main' | 'complete';
}

export const GROUP_LABELS: Record<DrawGroup, string> = {
  1: 'Adimplentes presentes (vaga dupla anterior)',
  2: 'Adimplentes presentes',
  3: 'Adimplentes ausentes (vaga dupla anterior)',
  4: 'Adimplentes ausentes',
  5: 'Acordo em dia - presentes',
  6: 'Acordo em dia - ausentes',
  7: 'Inadimplentes presentes',
  8: 'Inadimplentes ausentes',
};
