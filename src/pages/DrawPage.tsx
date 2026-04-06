import { useState } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import { GROUP_LABELS, type DrawGroup } from '@/types/lottery';
import { Shuffle, ChevronRight, UserX, ParkingCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatUnitLabel } from '@/lib/utils';

const DrawPage = () => {
  const {
    units, spots, drawEntries, drawPhase, currentDrawIndex,
    generateDrawOrder, advanceDraw, assignSpot, markAbsent, resetDraw,
  } = useLotteryStore();

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const currentEntry = drawEntries[currentDrawIndex];
  const currentUnit = currentEntry ? units.find((u) => u.id === currentEntry.unitId) : null;

  const availableSpots = spots.filter((s) => {
    if (s.assignedUnitId) return false;
    if (!currentUnit) return true;
    // Units with 2 spots must pick dupla
    if (currentUnit.numberOfSpots === 2 || currentUnit.rentsSecondSpot) {
      return s.type === 'dupla';
    }
    // Units with 1 spot can pick individual or dupla (if renting)
    return s.type === 'individual' || s.type === 'dupla';
  });

  const handleAssign = () => {
    if (!selectedSpotId || !currentEntry) return;
    assignSpot(currentEntry.unitId, selectedSpotId);
    setSelectedSpotId(null);
    advanceDraw();
  };

  const handleMarkAbsent = () => {
    if (!currentEntry) return;
    markAbsent(currentEntry.unitId);
  };

  const progress = drawEntries.length > 0
    ? Math.round((drawEntries.filter((e) => e.drawn).length / drawEntries.length) * 100)
    : 0;

  if (drawPhase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-2xl gradient-gold flex items-center justify-center animate-pulse-gold"
        >
          <span className="text-5xl">🎲</span>
        </motion.div>
        <div>
          <h2 className="text-3xl font-display font-bold mb-2">Sorteio de Vagas</h2>
          <p className="text-muted-foreground max-w-md">
            Grand Club Jardim Botânico — O sistema irá ordenar as unidades em 8 grupos de prioridade e sortear a ordem dentro de cada grupo.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button size="lg" onClick={generateDrawOrder} disabled={units.length === 0}>
            <Shuffle className="w-5 h-5 mr-2" /> Gerar Ordem e Iniciar
          </Button>
        </div>
        {units.length === 0 && (
          <p className="text-destructive text-sm">Cadastre unidades antes de iniciar o sorteio.</p>
        )}
      </div>
    );
  }

  if (drawPhase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-6xl">🎉</motion.div>
        <h2 className="text-3xl font-display font-bold">Sorteio Concluído!</h2>
        <p className="text-muted-foreground">Todas as unidades foram sorteadas.</p>
        <Button variant="outline" onClick={resetDraw}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reiniciar Sorteio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-card rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Sorteio em Andamento</h2>
          <span className="text-sm text-muted-foreground font-medium">{progress}% concluído</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-gold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{drawEntries.filter((e) => e.drawn).length} sorteados</span>
          <span>{drawEntries.length - drawEntries.filter((e) => e.drawn).length} restantes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current unit */}
        <div className="lg:col-span-2 space-y-4">
          {currentUnit && currentEntry && (
            <motion.div
              key={currentEntry.unitId}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-xl p-6 shadow-elevated border-2 border-accent"
            >
              <div className="flex items-center gap-2 mb-4">
                <Badge className="gradient-gold text-accent-foreground border-0">
                  Grupo {currentEntry.group}
                </Badge>
                <span className="text-xs text-muted-foreground">{GROUP_LABELS[currentEntry.group]}</span>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl gradient-navy flex items-center justify-center">
                  <span className="text-primary-foreground font-display font-bold text-xl">{formatUnitLabel(currentUnit)}</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl">{currentUnit.ownerName}</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentUnit.numberOfSpots} vaga{currentUnit.numberOfSpots > 1 ? 's' : ''}
                    {currentUnit.rentsSecondSpot ? ' (+1 alugada)' : ''}
                  </p>
                </div>
              </div>

              {/* Spot selection */}
              <h4 className="font-medium text-sm mb-3">Selecione a vaga:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto mb-4">
                {availableSpots.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpotId(spot.id)}
                    className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                      selectedSpotId === spot.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <span className="font-display font-bold block">{spot.label}</span>
                    <span className="text-xs text-muted-foreground capitalize">{spot.type}</span>
                  </button>
                ))}
                {availableSpots.length === 0 && (
                  <p className="col-span-full text-sm text-destructive">Sem vagas compatíveis disponíveis</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAssign} disabled={!selectedSpotId} className="flex-1">
                  <ParkingCircle className="w-4 h-4 mr-2" /> Atribuir Vaga
                </Button>
                <Button variant="outline" onClick={handleMarkAbsent}>
                  <UserX className="w-4 h-4 mr-2" /> Ausente
                </Button>
                <Button variant="ghost" onClick={advanceDraw}>
                  <ChevronRight className="w-4 h-4" /> Pular
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Queue */}
        <div className="bg-card rounded-xl p-4 shadow-card max-h-[70vh] overflow-y-auto">
          <h3 className="font-display font-semibold mb-3 sticky top-0 bg-card pb-2">Fila do Sorteio</h3>
          <div className="space-y-1">
            {drawEntries.map((entry, idx) => {
              const unit = units.find((u) => u.id === entry.unitId);
              if (!unit) return null;
              const isCurrent = idx === currentDrawIndex;
              return (
                <div
                  key={entry.unitId + entry.order}
                  className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-all ${
                    entry.drawn
                      ? 'opacity-40'
                      : isCurrent
                      ? 'bg-accent/10 border border-accent'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0">
                    {entry.group}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{formatUnitLabel(unit)}</span>
                    <span className="text-muted-foreground ml-2 truncate">{unit.ownerName}</span>
                  </div>
                  {entry.drawn && <span className="text-success text-xs">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawPage;
