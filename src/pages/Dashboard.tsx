import { useLotteryStore } from '@/store/useLotteryStore';
import { Car, ParkingCircle, Users, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GROUP_LABELS, type DrawGroup } from '@/types/lottery';

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-5 shadow-card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-3xl font-display font-bold">{value}</p>
    </motion.div>
  );
}

const Dashboard = () => {
  const { units, spots, drawPhase } = useLotteryStore();

  const totalUnits = units.length;
  const presentUnits = units.filter((u) => u.presence === 'presente').length;
  const totalSpots = spots.length;
  const availableSpots = spots.filter((s) => !s.assignedUnitId).length;
  const adimplentes = units.filter((u) => u.financialStatus === 'adimplente').length;
  const inadimplentes = units.filter((u) => u.financialStatus === 'inadimplente').length;

  const groupCounts = new Map<DrawGroup, number>();
  for (let g = 1; g <= 8; g++) groupCounts.set(g as DrawGroup, 0);
  units.forEach((u) => {
    const { financialStatus, presence, numberOfSpots, hadDoubleSpotLastDraw } = u;
    const isPresent = presence === 'presente';
    const hadDouble = numberOfSpots === 1 && hadDoubleSpotLastDraw;
    let group: DrawGroup;
    if (financialStatus === 'adimplente') {
      group = isPresent ? (hadDouble ? 1 : 2) : (hadDouble ? 3 : 4);
    } else if (financialStatus === 'acordo') {
      group = isPresent ? 5 : 6;
    } else {
      group = isPresent ? 7 : 8;
    }
    groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Painel de Controle</h2>
        <p className="text-muted-foreground text-sm">Visão geral do sorteio de vagas de garagem</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Unidades Cadastradas" value={totalUnits} color="gradient-navy text-primary-foreground" />
        <StatCard icon={Users} label="Presentes" value={presentUnits} color="bg-success text-success-foreground" />
        <StatCard icon={ParkingCircle} label="Vagas Disponíveis" value={`${availableSpots}/${totalSpots}`} color="gradient-gold text-accent-foreground" />
        <StatCard icon={AlertTriangle} label="Inadimplentes" value={inadimplentes} color="bg-destructive text-destructive-foreground" />
      </div>

      {/* Groups overview */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="font-display font-semibold text-lg mb-4">Grupos de Prioridade</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([1, 2, 3, 4, 5, 6, 7, 8] as DrawGroup[]).map((g) => (
            <div key={g} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-accent-foreground">
                  {g}
                </span>
                <span className="text-sm font-medium">{GROUP_LABELS[g]}</span>
              </div>
              <span className="text-sm font-bold font-display">{groupCounts.get(g) || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/unidades" className="bg-card rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow text-center group">
          <Car className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
          <p className="font-display font-semibold">Gerenciar Unidades</p>
        </Link>
        <Link to="/vagas" className="bg-card rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow text-center group">
          <ParkingCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
          <p className="font-display font-semibold">Gerenciar Vagas</p>
        </Link>
        <Link to="/sorteio" className="gradient-gold rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow text-center group">
          <div className="w-12 h-12 rounded-full bg-accent-foreground/10 mx-auto mb-2 flex items-center justify-center">
            <span className="text-2xl">🎲</span>
          </div>
          <p className="font-display font-bold text-accent-foreground">Iniciar Sorteio</p>
          <p className="text-xs text-accent-foreground/70 mt-1">
            {drawPhase === 'idle' ? 'Pronto para iniciar' : drawPhase === 'complete' ? 'Concluído' : 'Em andamento'}
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
