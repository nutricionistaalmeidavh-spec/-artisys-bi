export type Period = 'all' | '90d' | '30d';
export type ProjectStatus = 'Em execução' | 'Atenção' | 'Concluída';
export type ExpenseCategory = 'Máquinas' | 'Equipe' | 'Materiais' | 'Terceiros';

export interface Project {
  id: string; code: string; name: string; location: string; client: string;
  budget: number; progress: number; planned: number; deadline: string;
  status: ProjectStatus; accent: string;
}
export interface Expense {
  id: string; projectId: string; date: string; category: ExpenseCategory;
  description: string; amount: number; source: 'demo' | 'importado';
}
export interface Machine {
  id: string; name: string; model: string; projectId: string; hours: number;
  fuelCost: number; maintenanceCost: number; laborCost: number;
  status: 'Operando' | 'Ociosa' | 'Manutenção';
}
export interface Measurement {
  id: string; projectId: string; description: string; date: string;
  amount: number; status: 'Aprovada' | 'Em análise' | 'Pendente';
}

export const expenseCategories: ExpenseCategory[] = ['Máquinas', 'Equipe', 'Materiais', 'Terceiros'];
export const categoryColors: Record<ExpenseCategory, string> = {
  Máquinas: '#6adfc4', Equipe: '#8eaafb', Materiais: '#edba7b', Terceiros: '#a798ec'
};
const cutoffs: Record<Period, string> = { all: '0000-01-01', '90d': '2026-07-23', '30d': '2026-09-21' };

export function filterExpenses(entries: Expense[], projectId = 'all', period: Period = 'all') {
  return entries.filter((row) =>
    (projectId === 'all' || row.projectId === projectId) && row.date >= cutoffs[period]
  );
}

export function buildSummary(projects: Project[], entries: Expense[], projectId = 'all', period: Period = 'all') {
  const scope = projectId === 'all' ? projects : projects.filter((project) => project.id === projectId);
  const included = filterExpenses(entries, projectId, period);
  const budget = scope.reduce((sum, project) => sum + project.budget, 0);
  const spent = included.reduce((sum, entry) => sum + entry.amount, 0);
  const averageProgress = scope.length
    ? Math.round(scope.reduce((sum, project) => sum + project.progress, 0) / scope.length)
    : 0;
  return {
    budget, spent, balance: budget - spent, averageProgress,
    projectCount: scope.length,
    atRisk: scope.filter((project) => project.status === 'Atenção' || project.progress + 10 < project.planned).length
  };
}

export function getMonthlyTrend(entries: Expense[]) {
  const months = new Map<string, { month: string; amount: number; Máquinas: number; Equipe: number; Materiais: number; Terceiros: number }>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    if (!months.has(key)) months.set(key, { month: key, amount: 0, Máquinas: 0, Equipe: 0, Materiais: 0, Terceiros: 0 });
    const point = months.get(key)!;
    point.amount += entry.amount;
    point[entry.category] += entry.amount;
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function getCategoryTotals(entries: Expense[]) {
  return expenseCategories.map((name) => ({
    name,
    value: entries.filter((entry) => entry.category === name).reduce((sum, entry) => sum + entry.amount, 0),
    color: categoryColors[name]
  }));
}

export function getProjectRows(projects: Project[], entries: Expense[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.projectId, (totals.get(entry.projectId) || 0) + entry.amount);
  return projects.map(project => ({
    ...project,
    spent: totals.get(project.id) || 0,
    available: project.budget - (totals.get(project.id) || 0),
    usedPct: project.budget > 0 ? Math.round((totals.get(project.id) || 0) / project.budget * 100) : 0
  }));
}

export function machineCostPerHour(machine: Machine): number | null {
  if (!(machine.hours > 0)) return null;
  return Math.round((machine.fuelCost + machine.maintenanceCost + machine.laborCost) / machine.hours);
}

// CSV parser supports BOM, quoted delimiters, escaped quotes and newlines.
export function parseCsv(input: string): Record<string, string>[] {
  const source = input.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0) ? ';' : ',';
  const grid: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) grid.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) grid.push(row);
  if (!grid.length) return [];
  const headers = grid[0].map(value => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  return grid.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function safeNumber(input: unknown): number {
  if (typeof input === 'number') return input;
  let text = String(input ?? '').replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (!text) return NaN;
  if (text.includes(',') && text.includes('.')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (text.includes(',')) text = text.replace(',', '.');
  return Number(text);
}

function isoDate(input: unknown): string | null {
  const text = String(input ?? '').trim();
  let date = text;
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) date = br[3] + '-' + br[2] + '-' + br[1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const test = new Date(date + 'T00:00:00Z');
  return Number.isFinite(test.getTime()) && test.toISOString().slice(0, 10) === date ? date : null;
}

function normalized(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [
    k.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), v
  ]));
}

export function normalizeImportedRows(rows: Record<string, unknown>[], projects: Project[]) {
  const valid: Expense[] = [], errors: string[] = [];
  rows.forEach((source, i) => {
    const row = normalized(source);
    const projectName = String(row.obra ?? row.projeto ?? row.project ?? '').trim().toLowerCase();
    const project = projects.find(item => item.id.toLowerCase() === projectName || item.name.toLowerCase() === projectName || item.code.toLowerCase() === projectName);
    const categoryText = String(row.categoria ?? row.category ?? '').trim().toLowerCase();
    const category = expenseCategories.find(name => name.toLowerCase() === categoryText);
    const date = isoDate(row.data ?? row.date);
    const amount = safeNumber(row.valor ?? row.amount);
    if (!project || !category || !date || !Number.isFinite(amount) || amount <= 0) {
      errors.push('Linha ' + (i + 2) + ': verifique obra, data, categoria e valor positivo.');
      return;
    }
    valid.push({
      id: 'import-' + i + '-' + date + '-' + project.id,
      projectId: project.id, date, category,
      description: String(row.descricao ?? row.description ?? category).slice(0, 160),
      amount: Math.round(amount * 100) / 100, source: 'importado'
    });
  });
  return { valid, errors };
}

export function exportCsv(rows: (string | number)[][]): string {
  const encode = (value: string | number) => {
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + rows.map(row => row.map(encode).join(';')).join('\r\n');
}
