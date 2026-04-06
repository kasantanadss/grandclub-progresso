import { useRef, useState } from 'react';
import { useLotteryStore } from '@/store/useLotteryStore';
import type { Unit, FinancialStatus } from '@/types/lottery';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatUnitLabel } from '@/lib/utils';

interface ParsedRow {
  block?: string;
  apartment: string;
  ownerName: string;
  numberOfSpots: 1 | 2;
  rentsSecondSpot: boolean;
  financialStatus: FinancialStatus;
  hadDoubleSpotLastDraw: boolean;
  requestedMotoSpot: boolean;
}

type ColumnKey =
  | 'block'
  | 'apartment'
  | 'ownerName'
  | 'financialStatus'
  | 'numberOfSpots'
  | 'rentsSecondSpot'
  | 'hadDoubleSpotLastDraw'
  | 'requestedMotoSpot';

type StructuredExtraction = {
  rows: string[][];
  rawText: string;
};

type PdfWord = {
  text: string;
  x: number;
  y: number;
  width: number;
};

const EMPTY_PREVIEW: ParsedRow[] = [];

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  block: ['bloco', 'blk', 'torre'],
  apartment: ['apto', 'apartamento', 'apart', 'unidade', 'unidad', 'bloco/apto', 'ap'],
  ownerName: ['proprietario', 'proprietário', 'propietario', 'propietário', 'morador', 'nome', 'titular', 'condomino', 'condômino'],
  financialStatus: ['status', 'situacao', 'situação', 'financeiro', 'adimplencia', 'adimplência'],
  numberOfSpots: ['vagas', 'vaga', 'numero de vagas', 'n vagas', 'nº vagas', 'qtde vagas', 'quantidade vagas'],
  rentsSecondSpot: ['aluga 2 vaga', 'aluga segunda vaga', '2 vaga alugada', 'loca segunda vaga'],
  hadDoubleSpotLastDraw: ['vaga dupla anterior', 'dupla anterior', 'ultimo sorteio', 'último sorteio'],
  requestedMotoSpot: ['moto', 'vaga moto', 'motocicleta'],
};

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s/.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFinancialStatus(value: string): FinancialStatus {
  const normalized = normalizeText(value);
  if (normalized.includes('inadimpl')) return 'inadimplente';
  if (normalized.includes('acordo')) return 'acordo';
  return 'adimplente';
}

function parseBoolean(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return (
    normalized === 'sim' ||
    normalized === 's' ||
    normalized === 'x' ||
    normalized === 'true' ||
    normalized === '1' ||
    normalized.includes('sim') ||
    normalized.includes('moto') ||
    normalized.includes('aluga') ||
    normalized.includes('dupla')
  );
}

function parseApartment(value: string) {
  return value.replace(/\D/g, '').trim();
}

function parseBlock(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function parseOwnerName(value: string) {
  return value.replace(/[^A-Za-zÀ-ÿ\s]/g, '').replace(/\s+/g, ' ').trim();
}

function parseNumberOfSpots(value: string): 1 | 2 {
  return normalizeText(value).includes('2') ? 2 : 1;
}

function detectColumnKey(header: string): ColumnKey | null {
  const normalized = normalizeText(header);

  for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as [ColumnKey, string[]][]) {
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return key;
    }
  }

  return null;
}

function findHeaderRowIndex(rows: string[][]) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, index) => {
    const score = row.reduce((sum, cell) => sum + (detectColumnKey(cell) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : -1;
}

function buildColumnMap(headerRow: string[]) {
  const map = new Map<ColumnKey, number>();

  headerRow.forEach((cell, index) => {
    const key = detectColumnKey(cell);
    if (key && !map.has(key)) {
      map.set(key, index);
    }
  });

  return map;
}

function rowFromColumnMap(row: string[], columnMap: Map<ColumnKey, number>): ParsedRow | null {
  const apartment = parseApartment(row[columnMap.get('apartment') ?? -1] ?? '');
  const block = parseBlock(row[columnMap.get('block') ?? -1] ?? '');
  const ownerName = parseOwnerName(row[columnMap.get('ownerName') ?? -1] ?? '');

  if (!apartment || !ownerName) {
    return null;
  }

  return {
    block,
    apartment,
    ownerName,
    financialStatus: parseFinancialStatus(row[columnMap.get('financialStatus') ?? -1] ?? ''),
    numberOfSpots: parseNumberOfSpots(row[columnMap.get('numberOfSpots') ?? -1] ?? ''),
    rentsSecondSpot: parseBoolean(row[columnMap.get('rentsSecondSpot') ?? -1] ?? ''),
    hadDoubleSpotLastDraw: parseBoolean(row[columnMap.get('hadDoubleSpotLastDraw') ?? -1] ?? ''),
    requestedMotoSpot: parseBoolean(row[columnMap.get('requestedMotoSpot') ?? -1] ?? ''),
  };
}

function dedupeRows(rows: ParsedRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.block ?? ''}::${row.apartment}::${normalizeText(row.ownerName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseStructuredRows(rows: string[][]) {
  const cleanedRows = rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  const headerRowIndex = findHeaderRowIndex(cleanedRows);
  if (headerRowIndex === -1) {
    return EMPTY_PREVIEW;
  }

  const columnMap = buildColumnMap(cleanedRows[headerRowIndex]);
  if (!columnMap.has('apartment') || !columnMap.has('ownerName')) {
    return EMPTY_PREVIEW;
  }

  return dedupeRows(
    cleanedRows
      .slice(headerRowIndex + 1)
      .map((row) => rowFromColumnMap(row, columnMap))
      .filter((row): row is ParsedRow => Boolean(row))
  );
}

function parseDelimitedText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiters = ['\t', ';', '|', ','];
  const candidates = delimiters.map((delimiter) => ({
    delimiter,
    rows: lines.map((line) => line.split(delimiter).map((cell) => cell.trim())),
  }));

  candidates.sort((a, b) => findHeaderRowIndex(b.rows) - findHeaderRowIndex(a.rows));

  const structured = parseStructuredRows(candidates[0].rows);
  if (structured.length > 0) {
    return structured;
  }

  const spacedRows = lines.map((line) => line.split(/\s{2,}/).map((cell) => cell.trim()));
  const spacedStructured = parseStructuredRows(spacedRows);
  if (spacedStructured.length > 0) {
    return spacedStructured;
  }

  return parseFixedWidthText(lines);
}

function splitHeaderIntoRanges(headerLine: string) {
  const ranges: Array<{ label: string; start: number; end: number }> = [];
  const regex = /\S+(?:\s+\S+)*/g;
  const matches = [...headerLine.matchAll(regex)];

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const nextStart = matches[index + 1]?.index ?? headerLine.length;

    ranges.push({
      label: match[0].trim(),
      start,
      end: nextStart,
    });
  });

  return ranges;
}

function parseFixedWidthText(lines: string[]) {
  const headerIndex = lines.findIndex((line) => {
    const ranges = splitHeaderIntoRanges(line);
    const score = ranges.reduce((sum, range) => sum + (detectColumnKey(range.label) ? 1 : 0), 0);
    return score >= 2;
  });

  if (headerIndex === -1) {
    return EMPTY_PREVIEW;
  }

  const ranges = splitHeaderIntoRanges(lines[headerIndex]);
  const rows = [
    ranges.map((range) => range.label),
    ...lines.slice(headerIndex + 1).map((line) =>
      ranges.map((range, index) => {
        const end = ranges[index + 1]?.start ?? line.length;
        return line.slice(range.start, end).trim();
      })
    ),
  ];

  return parseStructuredRows(rows);
}

function groupPdfWordsIntoRows(words: PdfWord[]) {
  const sorted = [...words].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfWord[][] = [];

  for (const word of sorted) {
    const existingRow = rows.find((row) => Math.abs(row[0].y - word.y) <= 3);
    if (existingRow) {
      existingRow.push(word);
    } else {
      rows.push([word]);
    }
  }

  return rows.map((row) => row.sort((a, b) => a.x - b.x));
}

function buildPdfTableFromWords(words: PdfWord[]) {
  const rows = groupPdfWordsIntoRows(words)
    .map((row) => row.filter((word) => word.text.trim()))
    .filter((row) => row.length > 0);

  const headerRowIndex = rows.findIndex((row) => row.reduce((sum, cell) => sum + (detectColumnKey(cell.text) ? 1 : 0), 0) >= 2);
  if (headerRowIndex === -1) {
    return [];
  }

  const headerRow = rows[headerRowIndex];
  const boundaries = headerRow.map((cell, index) => {
    const currentCenter = cell.x + cell.width / 2;
    const next = headerRow[index + 1];
    const nextCenter = next ? next.x + next.width / 2 : Infinity;
    return { left: index === 0 ? -Infinity : currentCenter, right: (currentCenter + nextCenter) / 2 };
  });

  const headerLabels = headerRow.map((cell, index) => {
    const boundary = boundaries[index];
    return headerRow
      .filter((word) => {
        const center = word.x + word.width / 2;
        return center >= boundary.left && center < boundary.right;
      })
      .map((word) => word.text)
      .join(' ')
      .trim();
  });

  const bodyRows = rows.slice(headerRowIndex + 1).map((row) =>
    boundaries.map((boundary) =>
      row
        .filter((word) => {
          const center = word.x + word.width / 2;
          return center >= boundary.left && center < boundary.right;
        })
        .map((word) => word.text)
        .join(' ')
        .trim()
    )
  );

  return [headerLabels, ...bodyRows].filter((row) => row.some(Boolean));
}

async function extractPdfStructured(file: File): Promise<StructuredExtraction> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allRows: string[][] = [];
  const rawTextPages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();

    const words: PdfWord[] = content.items
      .map((item: any) => {
        if (!('str' in item)) return null;
        return {
          text: item.str ?? '',
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0,
          width: item.width ?? 0,
        };
      })
      .filter((item: PdfWord | null): item is PdfWord => Boolean(item) && Boolean(item.text.trim()));

    const pageRows = buildPdfTableFromWords(words);
    if (pageRows.length > 0) {
      allRows.push(...pageRows);
    }

    rawTextPages.push(words.map((word) => word.text).join(' '));
  }

  return { rows: allRows, rawText: rawTextPages.join('\n') };
}

async function extractDocxStructured(file: File): Promise<StructuredExtraction> {
  const mammoth = await import('mammoth/mammoth.browser');
  const buffer = await file.arrayBuffer();
  const [htmlResult, textResult] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: buffer }),
    mammoth.extractRawText({ arrayBuffer: buffer }),
  ]);

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlResult.value, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));
  const rows = tables.flatMap((table) =>
    Array.from(table.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('th,td')).map((cell) => cell.textContent?.trim() ?? '')
    )
  );

  return { rows, rawText: textResult.value };
}

async function extractTextStructured(file: File): Promise<StructuredExtraction> {
  const rawText = await file.text();
  const rows = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|;|\||,/).map((cell) => cell.trim()));

  return { rows, rawText };
}

async function extractXlsxStructured(file: File): Promise<StructuredExtraction> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { rows: [], rawText: '' };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  }).map((row) => row.map((cell) => String(cell ?? '').trim()));

  const rawText = rows.map((row) => row.join('\t')).join('\n');
  return { rows, rawText };
}

async function extractStructuredData(file: File): Promise<StructuredExtraction> {
  const lowerName = file.name.toLowerCase();

  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return extractPdfStructured(file);
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    return extractDocxStructured(file);
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lowerName.endsWith('.xlsx')
  ) {
    return extractXlsxStructured(file);
  }

  return extractTextStructured(file);
}

function getParsingHelpMessage(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) {
    return 'O PDF foi lido, mas não encontrei uma tabela com cabeçalhos reconhecíveis.';
  }

  if (lowerName.endsWith('.docx')) {
    return 'O DOCX foi lido, mas não encontrei uma tabela com colunas reconhecíveis.';
  }

  if (lowerName.endsWith('.xlsx')) {
    return 'A planilha XLSX foi lida, mas não encontrei colunas reconhecíveis.';
  }

  return 'Nenhum cabeçalho reconhecido. Use colunas como Apto, Proprietário, Status e Vagas.';
}

export function PdfImport() {
  const { addUnit } = useLotteryStore();
  const [preview, setPreview] = useState<ParsedRow[]>(EMPTY_PREVIEW);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const resetImportState = () => {
    setPreview(EMPTY_PREVIEW);
    setFileName('');
    setExtractedText('');

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setPreview(EMPTY_PREVIEW);
    setExtractedText('');

    try {
      const structured = await extractStructuredData(file);
      const normalizedText = structured.rawText.replace(/\u0000/g, ' ').trim();
      const rows =
        parseStructuredRows(structured.rows).length > 0
          ? parseStructuredRows(structured.rows)
          : parseDelimitedText(normalizedText);

      setExtractedText(normalizedText);
      setPreview(rows);

      if (rows.length === 0) {
        toast.error(getParsingHelpMessage(file.name));
      } else {
        toast.success(`${rows.length} unidade(s) reconhecida(s) por colunas em ${file.name}.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao ler o arquivo. Verifique se o PDF ou DOCX está íntegro.');
      resetImportState();
    } finally {
      setLoading(false);
    }
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
      count += 1;
    }

    toast.success(`${count} unidades importadas com sucesso.`);
    resetImportState();
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
          accept=".pdf,.docx,.xlsx,.csv,.txt,.tsv"
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
            Leia PDF, DOCX, XLSX, CSV ou TXT por coluna: Bloco, Apto, Proprietário, Status, Vagas e campos extras.
          </p>
        </label>
      </div>

      {loading && (
        <p className="text-center text-muted-foreground text-sm">
          Lendo colunas e montando a tabela importável...
        </p>
      )}

      {!loading && fileName && preview.length === 0 && extractedText && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">O arquivo foi lido, mas os cabeçalhos das colunas não foram reconhecidos.</p>
              <p className="mt-1 text-amber-700">
                Use uma tabela com cabeçalhos como Apto, Proprietário, Status e Vagas. PDFs escaneados como imagem ainda exigem OCR.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border bg-background p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Texto extraído
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
              {extractedText.slice(0, 2500)}
            </pre>
          </div>
        </div>
      )}

      <AnimatePresence>
        {preview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{preview.length} unidades encontradas</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImport}>
                    <Check className="w-4 h-4 mr-1" /> Importar Todas
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetImportState}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Unidade</th>
                      <th className="text-left p-2 font-medium">Proprietário</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-center p-2 font-medium">Vagas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={`${row.block ?? ''}-${row.apartment}-${row.ownerName}-${index}`} className="border-b last:border-0">
                        <td className="p-2 font-display font-bold">{formatUnitLabel(row)}</td>
                        <td className="p-2">{row.ownerName}</td>
                        <td className="p-2">{statusLabels[row.financialStatus]}</td>
                        <td className="p-2 text-center">{row.numberOfSpots}</td>
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
