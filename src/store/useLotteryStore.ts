import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Unit, ParkingSpot, DrawEntry, DrawGroup } from '@/types/lottery';

interface LotteryStore {
  units: Unit[];
  spots: ParkingSpot[];
  drawEntries: DrawEntry[];
  drawPhase: 'idle' | 'pcd' | 'moto' | 'main' | 'complete';
  currentDrawIndex: number;

  addUnit: (unidade: Unit) => void;
  updateUnit: (id: string, dados: Partial<Unit>) => void;
  removeUnit: (id: string) => void;

  addSpot: (vaga: ParkingSpot) => void;
  updateSpot: (id: string, dados: Partial<ParkingSpot>) => void;
  removeSpot: (id: string) => void;

  generateDrawOrder: () => void;
  advanceDraw: () => void;
  assignSpot: (unidadeId: string, vagaId: string) => void;
  markAbsent: (unidadeId: string) => void;
  resetDraw: () => void;
  setDrawPhase: (fase: 'idle' | 'pcd' | 'moto' | 'main' | 'complete') => void;
}

function classificarUnidade(unidade: Unit): DrawGroup {
  const { financialStatus, presence, numberOfSpots, hadDoubleSpotLastDraw } = unidade;
  const estaPresente = presence === 'presente';
  const teveVagaDupla = numberOfSpots === 1 && hadDoubleSpotLastDraw;

  if (financialStatus === 'adimplente') {
    if (estaPresente) return teveVagaDupla ? 1 : 2;
    return teveVagaDupla ? 3 : 4;
  }
  if (financialStatus === 'acordo') {
    return estaPresente ? 5 : 6;
  }
  return estaPresente ? 7 : 8;
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let indice = copia.length - 1; indice > 0; indice--) {
    const indiceAleatorio = Math.floor(Math.random() * (indice + 1));
    [copia[indice], copia[indiceAleatorio]] = [copia[indiceAleatorio], copia[indice]];
  }
  return copia;
}

export const useLotteryStore = create<LotteryStore>()(
  persist(
    (set, get) => ({
      units: [],
      spots: [],
      drawEntries: [],
      drawPhase: 'idle',
      currentDrawIndex: 0,

      addUnit: (unidade) => set((estado) => ({ units: [...estado.units, unidade] })),
      updateUnit: (id, dados) =>
        set((estado) => ({ units: estado.units.map((unidade) => (unidade.id === id ? { ...unidade, ...dados } : unidade)) })),
      removeUnit: (id) => set((estado) => ({ units: estado.units.filter((unidade) => unidade.id !== id) })),

      addSpot: (vaga) => set((estado) => ({ spots: [...estado.spots, vaga] })),
      updateSpot: (id, dados) =>
        set((estado) => ({ spots: estado.spots.map((vaga) => (vaga.id === id ? { ...vaga, ...dados } : vaga)) })),
      removeSpot: (id) => set((estado) => ({ spots: estado.spots.filter((vaga) => vaga.id !== id) })),

      generateDrawOrder: () => {
        const { units } = get();
        const unidadesElegiveis = units.filter((unidade) => !unidade.isPCD);
        const grupos = new Map<DrawGroup, Unit[]>();
        for (let grupo = 1; grupo <= 8; grupo++) grupos.set(grupo as DrawGroup, []);
        unidadesElegiveis.forEach((unidade) => {
          const grupo = classificarUnidade(unidade);
          grupos.get(grupo)!.push(unidade);
        });

        const entradas: DrawEntry[] = [];
        let ordem = 0;
        for (let grupo = 1; grupo <= 8; grupo++) {
          const unidadesEmbaralhadas = embaralhar(grupos.get(grupo as DrawGroup)!);
          unidadesEmbaralhadas.forEach((unidade) => {
            entradas.push({ unitId: unidade.id, group: grupo as DrawGroup, order: ordem++, drawn: false, skipped: false });
          });
        }
        set({ drawEntries: entradas, currentDrawIndex: 0, drawPhase: 'main' });
      },

      advanceDraw: () => {
        const { currentDrawIndex, drawEntries } = get();
        const proximoIndice = currentDrawIndex + 1;
        if (proximoIndice >= drawEntries.length) {
          set({ drawPhase: 'complete' });
        } else {
          set({ currentDrawIndex: proximoIndice });
        }
      },

      assignSpot: (unidadeId, vagaId) => {
        set((estado) => ({
          units: estado.units.map((unidade) => (unidade.id === unidadeId ? { ...unidade, assignedSpotId: vagaId } : unidade)),
          spots: estado.spots.map((vaga) => (vaga.id === vagaId ? { ...vaga, assignedUnitId: unidadeId } : vaga)),
          drawEntries: estado.drawEntries.map((entrada) => (entrada.unitId === unidadeId ? { ...entrada, drawn: true } : entrada)),
        }));
      },

      markAbsent: (unidadeId) => {
        const { drawEntries, units } = get();
        const unidade = units.find((item) => item.id === unidadeId);
        if (!unidade) return;

        const unidadeAtualizada = { ...unidade, presence: 'ausente' as const };
        const novoGrupo = classificarUnidade(unidadeAtualizada);

        const entradaAtual = drawEntries.find((entrada) => entrada.unitId === unidadeId);
        if (!entradaAtual) return;

        const entradasFiltradas = drawEntries.filter((entrada) => entrada.unitId !== unidadeId);
        // Encontra a ultima entrada do novo grupo para reinserir a unidade na posicao correta.
        let indiceInsercao = entradasFiltradas.length;
        for (let indice = entradasFiltradas.length - 1; indice >= 0; indice--) {
          if (entradasFiltradas[indice].group <= novoGrupo) {
            indiceInsercao = indice + 1;
            break;
          }
        }
        const novaEntrada: DrawEntry = { ...entradaAtual, group: novoGrupo, skipped: true };
        entradasFiltradas.splice(indiceInsercao, 0, novaEntrada);

        // Recalcula a ordem apos a reinsercao da unidade.
        entradasFiltradas.forEach((entrada, indice) => (entrada.order = indice));

        set({
          units: units.map((item) => (item.id === unidadeId ? unidadeAtualizada : item)),
          drawEntries: entradasFiltradas,
        });
      },

      resetDraw: () => set({ drawEntries: [], currentDrawIndex: 0, drawPhase: 'idle' }),
      setDrawPhase: (fase) => set({ drawPhase: fase }),
    }),
    { name: 'grand-club-lottery' }
  )
);
