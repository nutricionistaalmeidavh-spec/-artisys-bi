import { describe, expect, it } from 'vitest';
import { demoProjects, demoExpenses, demoMachines } from '../data/demo';
import { buildSummary, getMonthlyTrend, getCategoryTotals, machineCostPerHour, parseCsv, normalizeImportedRows, exportCsv } from './analytics';

describe('ArtiSys BI analytics', () => {
  it('reconciles dashboard totals with the underlying expense ledger', () => {
    const summary = buildSummary(demoProjects, demoExpenses, 'all', 'all');
    expect(summary.budget).toBe(demoProjects.reduce((sum, project) => sum + project.budget, 0));
    expect(summary.spent).toBe(demoExpenses.reduce((sum, entry) => sum + entry.amount, 0));
    expect(summary.balance).toBe(summary.budget - summary.spent);
  });

  it('filters spend by project without leaking another worksite', () => {
    const selected = demoProjects[0];
    const result = buildSummary(demoProjects, demoExpenses, selected.id, 'all');
    expect(result.spent).toBe(demoExpenses.filter((entry) => entry.projectId === selected.id).reduce((sum, entry) => sum + entry.amount, 0));
    expect(result.projectCount).toBe(1);
  });

  it('applies the rolling 90 day filter to expense records', () => {
    const result = buildSummary(demoProjects, demoExpenses, 'all', '90d');
    expect(result.spent).toBe(demoExpenses.filter(entry => entry.date >= '2026-07-23').reduce((sum, entry) => sum + entry.amount, 0));
  });

  it('returns monthly results sorted from oldest to newest', () => {
    const months = getMonthlyTrend(demoExpenses);
    expect(months.map((month) => month.month)).toEqual([...months.map(month => month.month)].sort());
    expect(months.reduce((sum, month) => sum + month.amount, 0)).toBe(demoExpenses.reduce((sum, expense) => sum + expense.amount, 0));
  });

  it('groups all expense categories without losing money', () => {
    expect(getCategoryTotals(demoExpenses).reduce((sum, item) => sum + item.value, 0)).toBe(demoExpenses.reduce((sum, item) => sum + item.amount, 0));
  });

  it('computes operating cost per hour and protects zero hours', () => {
    const sample = demoMachines[0];
    expect(machineCostPerHour(sample)).toBe(Math.round((sample.fuelCost + sample.maintenanceCost + sample.laborCost) / sample.hours));
    expect(machineCostPerHour({ ...sample, hours: 0 })).toBeNull();
  });

  it('parses quoted CSV with semicolon delimiters and rejects unknown projects', () => {
    const csv = 'obra;data;categoria;descricao;valor\nTerraplenagem Industrial;2026-10-15;Combustível;"Diesel; posto";1.234,56\nObra desconhecida;2026-10-15;Equipe;Teste;30';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    const result = normalizeImportedRows(rows, demoProjects);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].amount).toBe(1234.56);
    expect(result.valid[0].description).toBe('Diesel; posto');
    expect(result.errors).toHaveLength(1);
  });

  it('protects CSV exports against spreadsheet formula injection', () => {
    const value = exportCsv([['Obra', 'Descrição'], ['Teste', '=HYPERLINK("example.com")']]);
    expect(value).toContain("'=HYPERLINK");
  });
});
