import { describe, expect, it } from 'vitest';
import { toDashboardData, type CanonicalSnapshot } from './bridge';

const source: CanonicalSnapshot = {
  obras: [{ id: 1, nome: 'Obra 01', codigo: 'OB01', percentual_fisico: 40, previsao_termino: '2026-12-30', status: 'ativa', valor_contratado_centavos: 40000000 }],
  frentes_obra: [{ id: 21, obra_id: 1, nome: 'Terraplenagem' }],
  itens_orcamentarios: [{ id: 2, obra_id: 1, frente_id: 21, quantidade: 4, valor_unitario_centavos: 5000000 }],
  cronograma_etapas: [{ id: 3, obra_id: 1, percentual_previsto: 60, percentual_realizado: 40 }],
  contas: [
    { id: 10, obra_id: 1, tipo: 'pagar', status: 'pendente', categoria_id: 2, descricao: 'Diesel', competencia: '2026-10', valor_centavos: 200000 },
    { id: 11, obra_id: 1, tipo: 'receber', status: 'pendente', descricao: 'Medição', competencia: '2026-10', valor_centavos: 400000 },
    { id: 12, obra_id: 1, tipo: 'pagar', status: 'cancelado', descricao: 'Cancelada', competencia: '2026-10', valor_centavos: 90000 },
  ],
  categorias_financeiras: [{ id: 2, nome: 'Combustível' }],
  medicoes: [{ id: 15, obra_id: 1, numero: '1', data: '2026-10-18', descricao: 'Serviços', status: 'aprovada', valor_liquido_centavos: 800000 }],
  rdos: [{ id: 30, obra_id: 1, data: '2026-10-18' }],
  rdo_equipamentos: [{ id: 40, rdo_id: 30, nome: 'Escavadeira', horas_uso: 10, custo_centavos: 150000 }],
  tarefas_obra: []
};
describe('Canonical Obras projection - no parallel totals', () => {
  it('maps the existing Obras schema and centavos, without treating income or canceled accounts as cost', () => {
    const data = toDashboardData(source);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].budget).toBe(200000);
    expect(data.projects[0].planned).toBe(60);
    expect(data.expenses.map(item=>item.amount)).toEqual([2000]);
  });
  it('links RDO equipment with its original obra without duplicating its cost as a financial account', () => {
    const data=toDashboardData(source);
    expect(data.machines[0].projectId).toBe('1');
    expect(data.machines[0].hours).toBe(10);
    expect(data.machineCostTotalMinor).toBe(150000);
    expect(data.expenses.reduce((a,e)=>a+e.amount,0)).toBe(2000);
  });
  it('reads measurements from the canonical medição ledger, not as extra income or cost', () => {
    const data=toDashboardData(source);
    expect(data.measurements[0].amount).toBe(8000);
    expect(data.measurements[0].status).toBe('Aprovada');
  });
  it('rejects broken foreign keys instead of silently assigning costs to unrelated works', () => {
    expect(()=>toDashboardData({...source, contas:[{...source.contas[0],obra_id:999}]})).toThrow(/obra/i);
  });
  it('keeps zero rows for canonical records with no data and does not fall back to fictitious data', () => {
    const empty=toDashboardData({obras:[],contas:[],medicoes:[],rdo_equipamentos:[],rdos:[],itens_orcamentarios:[],frentes_obra:[],cronograma_etapas:[],categorias_financeiras:[],tarefas_obra:[]});
    expect(empty.projects).toEqual([]);
    expect(empty.expenses).toEqual([]);
  });
});
