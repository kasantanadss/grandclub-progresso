import { useState, useRef } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import type { Unit, FinancialStatus } from '@/types/lottery';
import { Upload, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ParsedRow {
  apartment: string;
  ownerName: string;
  numberOfSpots: 1 | 2;
  rentsSecondSpot: boolean;
  financialStatus: FinancialStatus;
  isPCD: boolean;
  hadDoubleSpotLastDraw: boolean;
  requestedMotoSpot: boolean;
}

function parseTextLines(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    // Try to split by common delimiters: tab, semicolon, pipe, or multiple spaces
    let cols = line.split('\t');
    if (cols.length < 2) cols = line.split(';');
    if (cols.length < 2) cols = line.split('|');
    if (cols.length < 2) cols = line.split(/\s{2,}/);
    if (cols.length < 2) continue;

    cols = cols.map(c => c.trim());

    // Skip header rows
    const first = cols[0].toLowerCase();
    if (first.includes('apto') || first.includes('apart') || first.includes('unidade') || first === '#') continue;

    const apartment = cols[0];
    const ownerName = cols[1] || '';
    if (!apartment || !ownerName) continue;

    // Financial status (col 2)
    let financialStatus: FinancialStatus = 'adimplente';
    if (cols[2]) {
      const fs = cols[2].toLowerCase();
      if (fs.includes('inadim')) financialStatus = 'inadimplente';
      else if (fs.includes('acordo')) financialStatus = 'acordo';
    }

    // Number of spots (col 3)
    let numberOfSpots: 1 | 2 = 1;
    if (cols[3]) {
      numberOfSpots = cols[3].trim() === '2' ? 2 : 1;
    }

    // Boolean flags from remaining cols
    const rest = cols.slice(4).join(' ').toLowerCase();
    const isPCD = rest.includes('pcd') || rest.includes('sim') && rest.includes('pcd');
    const rentsSecondSpot = rest.includes('alug');
    const hadDoubleSpotLastDraw = rest.includes('dupla') || rest.includes('anterior');
    const requestedMotoSpot = rest.includes('moto');

    rows.push({
      apartment,
      ownerName,
      numberOfSpots,
      rentsSecondSpot,
      financialStatus,
      isPCD,
      hadDoubleSpotLastDraw,
      requestedMotoSpot,
    });
  }
  return rows;
}

export function PdfImport() {
  const { addUnit } = useLotteryStore();
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);

    try {
      if (file.type === 'application/pdf') {
        // For PDFs, we use pdf.js-like text extraction
        // Since we're client-side, we'll read as text (works for text-based PDFs)
        const text = await file.text();
        const rows = parseTextLines(text);
        if (rows.length === 0) {
          toast.error('Não foi possível extrair dados do PDF. Tente um arquivo CSV ou texto tabulado.');
        }
        setPreview(rows);
      } else {
        // CSV / TXT
        const text = await file.text();
        const rows = parseTextLines(text);
        if (rows.length === 0) {
          toast.error('Nenhum dado encontrado. Verifique o formato do arquivo.');
        }
        setPreview(rows);
      }
    } catch {
      toast.error('Erro ao ler o arquivo.');
    }
    setLoading(false);
  };

  const handleImport = () => {
    let count = 0;
    for (const row of preview) {
      const unit: Unit = {
        id: crypto.randomUUID(),
        ...row,
        presence: 'ausente',
      };
      addUnit(unit);
      count++;
    }
    toast.success(`${count} unidades importadas com sucesso!`);
    setPreview([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const statusLabels: Record<FinancialStatus, string> = {
    adimplente: 'Adimplente',
    acordo: 'Acordo',
    inadimplente: 'Inadimplente',
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.csv,.txt,.tsv"
          onChange={handleFile}
          className="hidden"
          id="file-import"
        />
        <label htmlFor="file-import" className="cursor-pointer">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-sm">
            {fileName || 'Clique para selecionar um arquivo'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, CSV ou TXT com colunas: Apto, Proprietário, Status, Vagas, PCD, etc.
          </p>
        </label>
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm">Processando...</p>}

      <AnimatePresence>
        {preview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{preview.length} unidades encontradas</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImport}>
                    <Check className="w-4 h-4 mr-1" /> Importar Todas
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setPreview([]); setFileName(''); }}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Apto</th>
                      <th className="text-left p-2 font-medium">Proprietário</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-center p-2 font-medium">Vagas</th>
                      <th className="text-center p-2 font-medium">PCD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 font-display font-bold">{row.apartment}</td>
                        <td className="p-2">{row.ownerName}</td>
                        <td className="p-2">{statusLabels[row.financialStatus]}</td>
                        <td className="p-2 text-center">{row.numberOfSpots}</td>
                        <td className="p-2 text-center">{row.isPCD ? '♿' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
