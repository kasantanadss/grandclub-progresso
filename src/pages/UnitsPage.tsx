import { useState } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import type { Unit, FinancialStatus, PresenceStatus } from '@/types/lottery';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { PdfImport } from '@/components/PdfImport';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const emptyUnit = (): Omit<Unit, 'id'> => ({
  block: '',
  apartment: '',
  ownerName: '',
  numberOfSpots: 1,
  rentsSecondSpot: false,
  financialStatus: 'adimplente',
  presence: 'ausente',
  hadDoubleSpotLastDraw: false,
  requestedMotoSpot: false,
});

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

const UnitsPage = () => {
  const { units, addUnit, updateUnit, removeUnit } = useLotteryStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyUnit());
  const [filter, setFilter] = useState<'all' | FinancialStatus>('all');

  const updateFormText = (key: 'block' | 'apartment' | 'ownerName', value: string) => {
    if (key === 'block') {
      setForm((current) => ({
        ...current,
        block: value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10),
      }));
      return;
    }

    if (key === 'apartment') {
      setForm((current) => ({
        ...current,
        apartment: value.replace(/\D/g, '').slice(0, 10),
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      ownerName: value.replace(/[^A-Za-zÀ-ÿ\s]/g, '').replace(/\s+/g, ' ').trimStart(),
    }));
  };

  const isFormValid = Boolean(form.block?.trim()) && Boolean(form.apartment.trim()) && form.ownerName.trim().length >= 3;

  const handleSave = () => {
    if (!isFormValid) return;

    const normalizedForm = {
      ...form,
      block: form.block?.trim(),
      apartment: form.apartment.trim(),
      ownerName: form.ownerName.trim(),
    };

    if (editId) {
      updateUnit(editId, normalizedForm);
      setEditId(null);
    } else {
      addUnit({ ...normalizedForm, id: crypto.randomUUID() });
    }

    setForm(emptyUnit());
    setShowForm(false);
  };

  const handleEdit = (unit: Unit) => {
    setEditId(unit.id);
    const { id, ...rest } = unit;
    setForm({ ...emptyUnit(), ...rest });
    setShowForm(true);
  };

  const filteredUnits = filter === 'all' ? units : units.filter((unit) => unit.financialStatus === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Unidades</h2>
          <p className="text-muted-foreground text-sm">{units.length} unidades cadastradas</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm(emptyUnit());
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar Unidade
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'adimplente', 'acordo', 'inadimplente'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === item ? 'gradient-navy text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {item === 'all' ? 'Todas' : statusLabels[item]}
          </button>
        ))}
      </div>

      <PdfImport />

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl p-6 shadow-card overflow-hidden"
          >
            <h3 className="font-display font-semibold mb-4">{editId ? 'Editar Unidade' : 'Nova Unidade'}</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Apartamento</label>
                    <Input
                      value={form.apartment}
                      onChange={(e) => updateFormText('apartment', e.target.value)}
                      placeholder="101"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bloco</label>
                    <Input
                      value={form.block ?? ''}
                      onChange={(e) => updateFormText('block', e.target.value)}
                      placeholder="A"
                      pattern="[A-Z0-9-]*"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Proprietário</label>
                <Input
                  value={form.ownerName}
                  onChange={(e) => updateFormText('ownerName', e.target.value)}
                  placeholder="Nome completo"
                  pattern="[A-Za-zÀ-ÿ\s]*"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status Financeiro</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={form.financialStatus}
                  onChange={(e) => setForm({ ...form, financialStatus: e.target.value as FinancialStatus })}
                >
                  <option value="adimplente">Adimplente</option>
                  <option value="acordo">Acordo em dia</option>
                  <option value="inadimplente">Inadimplente</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Número de Vagas</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={form.numberOfSpots}
                  onChange={(e) => setForm({ ...form, numberOfSpots: Number(e.target.value) as 1 | 2 })}
                >
                  <option value={1}>1 vaga</option>
                  <option value={2}>2 vagas</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Presença</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={form.presence}
                  onChange={(e) => setForm({ ...form, presence: e.target.value as PresenceStatus })}
                >
                  <option value="ausente">Ausente</option>
                  <option value="presente">Presente</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { key: 'rentsSecondSpot' as const, label: 'Aluga 2ª vaga' },
                { key: 'hadDoubleSpotLastDraw' as const, label: 'Vaga dupla no último sorteio' },
                { key: 'requestedMotoSpot' as const, label: 'Solicitou vaga moto' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="rounded border-input"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button onClick={handleSave} disabled={!isFormValid}>
                <Check className="w-4 h-4 mr-2" /> Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
              >
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Apto</th>
                <th className="text-left p-3 font-medium">Bloco</th>
                <th className="text-left p-3 font-medium">Proprietário</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Vagas</th>
                <th className="text-center p-3 font-medium">Presença</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((unit) => (
                <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-display font-bold">{unit.apartment}</td>
                  <td className="p-3">{unit.block || '—'}</td>
                  <td className="p-3">{unit.ownerName}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={statusColors[unit.financialStatus]}>
                      {statusLabels[unit.financialStatus]}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    {unit.numberOfSpots}
                    {unit.rentsSecondSpot ? ' (+1)' : ''}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() =>
                        updateUnit(unit.id, {
                          presence: unit.presence === 'presente' ? 'ausente' : 'presente',
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        unit.presence === 'presente' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {unit.presence === 'presente' ? '✓ Presente' : 'Ausente'}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(unit)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeUnit(unit.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUnits.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Nenhuma unidade cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnitsPage;
