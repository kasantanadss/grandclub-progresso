import { useState } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import { Search, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import type { FinancialStatus } from '@/types/lottery';

const statusColors: Record<FinancialStatus, string> = {
  adimplente: 'bg-success/10 text-success border-success/20',
  acordo: 'bg-warning/10 text-warning border-warning/20',
  inadimplente: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<FinancialStatus, string> = {
  adimplente: 'Adimplente',
  acordo: 'Acordo',
  inadimplente: 'Inadimplente',
};

const PortariaPage = () => {
  const { units, updateUnit } = useLotteryStore();
  const [search, setSearch] = useState('');

  const filtered = units.filter((u) =>
    u.apartment.toLowerCase().includes(search.toLowerCase()) ||
    u.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = units.filter((u) => u.presence === 'presente').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold">Check-in de Presença</h2>
        <p className="text-muted-foreground text-sm">
          {presentCount} de {units.length} unidades presentes
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-gold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: units.length > 0 ? `${(presentCount / units.length) * 100}%` : '0%' }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {units.length > 0 ? Math.round((presentCount / units.length) * 100) : 0}% de presença
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por apartamento ou nome..."
          className="pl-10"
        />
      </div>

      {/* Unit list */}
      <div className="space-y-2">
        {filtered.map((unit) => (
          <motion.div
            key={unit.id}
            layout
            className={`bg-card rounded-xl p-4 shadow-card flex items-center justify-between gap-4 border-2 transition-all ${
              unit.presence === 'presente' ? 'border-success/30' : 'border-transparent'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-lg gradient-navy flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-display font-bold text-sm">{unit.apartment}</span>
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold truncate">{unit.ownerName}</p>
                <Badge variant="outline" className={`text-xs ${statusColors[unit.financialStatus]}`}>
                  {statusLabels[unit.financialStatus]}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => updateUnit(unit.id, { presence: unit.presence === 'presente' ? 'ausente' : 'presente' })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                unit.presence === 'presente'
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {unit.presence === 'presente' ? (
                <><UserCheck className="w-4 h-4" /> Presente</>
              ) : (
                <><UserX className="w-4 h-4" /> Ausente</>
              )}
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {units.length === 0 ? 'Nenhuma unidade cadastrada' : 'Nenhum resultado encontrado'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortariaPage;
