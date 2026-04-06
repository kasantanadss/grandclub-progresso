import { useState } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import type { ParkingSpot, SpotType } from '@/types/lottery';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatUnitLabel } from '@/lib/utils';

const typeLabels: Record<SpotType, string> = {
  individual: 'Individual',
  dupla: 'Dupla (Presa)',
  moto: 'Moto',
};

const typeColors: Record<SpotType, string> = {
  individual: 'bg-info/10 text-info border-info/20',
  dupla: 'bg-warning/10 text-warning border-warning/20',
  moto: 'bg-muted text-muted-foreground border-border',
};

const SpotsPage = () => {
  const { spots, units, addSpot, removeSpot } = useLotteryStore();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<SpotType>('individual');
  const [filterType, setFilterType] = useState<'all' | SpotType>('all');

  const handleLabelChange = (value: string) => {
    setLabel(value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20));
  };

  const handleAdd = () => {
    if (!label.trim()) return;
    addSpot({ id: crypto.randomUUID(), label: label.trim(), type });
    setLabel('');
    setType('individual');
    setShowForm(false);
  };

  const filtered = filterType === 'all' ? spots : spots.filter((s) => s.type === filterType);
  const getUnit = (id?: string) => units.find((u) => u.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Vagas de Garagem</h2>
          <p className="text-muted-foreground text-sm">
            {spots.length} vagas • {spots.filter((s) => !s.assignedUnitId).length} disponíveis
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Vaga
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'individual', 'dupla', 'moto'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterType === f ? 'gradient-navy text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'all' ? 'Todas' : typeLabels[f]}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl p-6 shadow-card overflow-hidden"
          >
            <h3 className="font-display font-semibold mb-4">Nova Vaga</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Identificação</label>
                <Input
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Ex: G1-01"
                  pattern="[A-Z0-9-]*"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as SpotType)}
                >
                  <option value="individual">Individual</option>
                  <option value="dupla">Dupla (Presa)</option>
                  <option value="moto">Moto</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button onClick={handleAdd} disabled={!label.trim()}><Check className="w-4 h-4 mr-2" /> Salvar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((spot) => {
          const assignedUnit = getUnit(spot.assignedUnitId);
          return (
            <motion.div
              key={spot.id}
              layout
              className={`rounded-xl p-4 border-2 transition-all ${
                spot.assignedUnitId
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-lg">{spot.label}</span>
                <Badge variant="outline" className={typeColors[spot.type]}>{typeLabels[spot.type]}</Badge>
              </div>
              {assignedUnit ? (
                <p className="text-sm text-muted-foreground">
                  Unidade <span className="font-semibold text-foreground">{formatUnitLabel(assignedUnit)}</span> — {assignedUnit.ownerName}
                </p>
              ) : (
                <p className="text-sm text-success font-medium">Disponível</p>
              )}
              {!spot.assignedUnitId && (
                <button
                  onClick={() => removeSpot(spot.id)}
                  className="mt-2 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">Nenhuma vaga cadastrada</div>
        )}
      </div>
    </div>
  );
};

export default SpotsPage;
