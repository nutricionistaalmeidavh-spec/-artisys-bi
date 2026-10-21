import type { Expense, ExpenseCategory, Machine, Measurement, Project } from '../lib/analytics';

export type CanonicalRecord = Record<string, unknown> & { id: number; revision?: number };
export interface CanonicalSnapshot {
  obras: CanonicalRecord[];
  frentes_obra: CanonicalRecord[];
  itens_orcamentarios: CanonicalRecord[];
  cronograma_etapas: CanonicalRecord[];
  contas: CanonicalRecord[];
  categorias_financeiras: CanonicalRecord[];
  medicoes: CanonicalRecord[];
  rdos: CanonicalRecord[];
  rdo_equipamentos: CanonicalRecord[];
  tarefas_obra: CanonicalRecord[];
}
export interface DashboardProjection {
  projects: Project[];
  expenses: Expense[];
  machines: Machine[];
  measurements: Measurement[];
  machineCostTotalMinor: number;
}

export const canonicalTables = [
  'obras','frentes_obra','itens_orcamentarios','cronograma_etapas','contas',
  'categorias_financeiras','medicoes','rdos','rdo_equipamentos','tarefas_obra'
] as const satisfies readonly (keyof CanonicalSnapshot)[];

const cents = (value: unknown): number => {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n)) throw new Error('Valor em centavos inválido no registro canônico.');
  return n;
};
const text = (value: unknown) => String(value ?? '').trim();
const num = (value: unknown) => Number(value ?? 0);
const asDate = (value: unknown) => {
  const str = text(value);
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0,10) : '2026-10-01';
};
const categoryOf = (label: string): ExpenseCategory => {
  const cat = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (/maquin|combust|diesel|equip|frota|oficina|manutenc/.test(cat)) return 'Máquinas';
  if (/equipe|pessoal|mao.de.obra|rh|salario|funcionar|folha/.test(cat)) return 'Equipe';
  if (/material|insumo|estoque|brita|concreto/.test(cat)) return 'Materiais';
  return 'Terceiros';
};
const workStatus = (status: unknown): Project['status'] => {
  const str=text(status).toLowerCase();
  return ['concluida','concluída','concluido','finalizada','finalizado'].includes(str)
    ? 'Concluída' : ['atrasada','atrasado','alerta','atencao','atenção','paralisada'].includes(str)
      ? 'Atenção' : 'Em execução';
};
const measurementStatus = (status: unknown): Measurement['status'] => {
  const str=text(status).toLowerCase();
  return ['aprovada','aprovado','faturada','recebida'].includes(str)
    ? 'Aprovada' : ['pendente','rascunho','aberta'].includes(str) ? 'Pendente' : 'Em análise';
};
const requiredWork = (works: Set<number>, id: unknown, domain: string) => {
  const value = Number(id);
  if (!works.has(value)) throw new Error(`Registro de ${domain} referencia obra inexistente: ${id}`);
  return String(value);
};

export function toDashboardData(snapshot: CanonicalSnapshot): DashboardProjection {
  for (const table of canonicalTables) {
    if (!Array.isArray(snapshot[table])) throw new Error(`Tabela canônica ${table} indisponível; os dados não serão substituídos por amostra.`);
  }
  const workIds=new Set(snapshot.obras.map(row=>Number(row.id)));
  const categoryNames=new Map(snapshot.categorias_financeiras.map(r=>[Number(r.id),text(r.nome)]));
  const plans=new Map<number,number[]>();
  for(const stage of snapshot.cronograma_etapas) {
    const id=Number(stage.obra_id);
    if(!workIds.has(id)) throw new Error('Cronograma aponta para obra inexistente.');
    plans.set(id,[...(plans.get(id)||[]),num(stage.percentual_previsto)]);
  }
  const budgets=new Map<number,number>();
  for (const item of snapshot.itens_orcamentarios) {
    const id=Number(item.obra_id);
    if(!workIds.has(id)) throw new Error('Item orçamentário aponta para obra inexistente.');
    const val=Math.round(num(item.quantidade)*cents(item.valor_unitario_centavos));
    budgets.set(id,(budgets.get(id)||0)+val);
  }
  const projects:Project[]=snapshot.obras.map((o,index)=>{
    const id=Number(o.id), planned=plans.get(id);
    const fallback=cents(o.valor_contratado_centavos);
    const budget=budgets.has(id)?budgets.get(id)!:fallback;
    return {
      id:String(id), code:text(o.codigo)||`OB-${id}`, name:text(o.nome)||`Obra ${id}`,
      location:text(o.endereco)||'Local não informado', client:text(o.cliente_nome)||'',
      budget:budget/100, progress:Math.min(100,Math.max(0,num(o.percentual_fisico))),
      planned:planned?.length?Math.round(planned.reduce((a,b)=>a+b,0)/planned.length):0,
      deadline:text(o.previsao_termino)||'2026-12-31', status:workStatus(o.status),
      accent:['#721f19','#a64b3e','#ca8170','#995d42','#c08b77'][index%5]
    };
  });
  const expenses:Expense[]=snapshot.contas.filter(r=>text(r.tipo)==='pagar' && text(r.status)!=='cancelado' && !r.deleted_at).map(row=>{
    const id=requiredWork(workIds,row.obra_id,'contas');
    return {
      id:`conta-${row.id}`,projectId:id,date:asDate(row.competencia||row.emissao),
      category:categoryOf(categoryNames.get(Number(row.categoria_id))||text(row.descricao)),
      description:text(row.descricao)||'Despesa',
      amount:cents(row.valor_centavos)/100,source:'canonico'
    };
  });
  const measurements:Measurement[]=snapshot.medicoes.filter(r=>!r.deleted_at && !['cancelada','cancelado'].includes(text(r.status))).map(row=>({
    id:`med-${row.id}`,projectId:requiredWork(workIds,row.obra_id,'medições'),
    description:text(row.descricao)||`Medição ${text(row.numero)||row.id}`,
    date:asDate(row.data||row.competencia), amount:cents(row.valor_liquido_centavos??row.valor_bruto_centavos)/100,
    status:measurementStatus(row.status)
  }));
  const rdoWorks=new Map(snapshot.rdos.map(row=>[Number(row.id),Number(row.obra_id)]));
  const machineGroups=new Map<string,Machine>();
  let machineCostTotalMinor=0;
  for(const item of snapshot.rdo_equipamentos.filter(r=>!r.deleted_at)){
    const obraId=Number(item.obra_id||rdoWorks.get(Number(item.rdo_id)));
    const projectId=requiredWork(workIds,obraId,'equipamentos de RDO');
    const machineName=text(item.nome)||'Equipamento não identificado';
    const key=`${projectId}:${machineName.toLowerCase()}`;
    const cost=cents(item.custo_centavos),hours=num(item.horas_uso);
    if(hours<0)throw new Error('Horas de máquina negativas.');
    machineCostTotalMinor+=cost;
    const previous=machineGroups.get(key);
    if(previous){previous.hours+=hours;previous.laborCost+=cost/100;}
    else machineGroups.set(key,{
      id:`rdo-${key}`,name:machineName,model:machineName,projectId,
      hours,fuelCost:0,maintenanceCost:0,laborCost:cost/100,status:'Operando'
    });
  }
  return {projects,expenses,machines:[...machineGroups.values()],measurements,machineCostTotalMinor};
}

export async function loadCanonicalSnapshot(fetcher: typeof fetch=fetch):Promise<CanonicalSnapshot> {
  const response=await fetcher('/api/canonical/snapshot',{headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw new Error(`Fonte canônica indisponível (HTTP ${response.status}).`);
  return toCanonicalSnapshot(await response.json());
}

export function toCanonicalSnapshot(value: unknown): CanonicalSnapshot {
  if (!value || typeof value!=='object') throw new Error('Resposta canônica inválida');
  const raw=value as Record<string,unknown>;
  const snapshot={} as CanonicalSnapshot;
  for(const table of canonicalTables) {
    if(!Array.isArray(raw[table])) throw new Error(`Faltam dados canônicos: ${table}`);
    (snapshot as unknown as Record<string,unknown>)[table]=raw[table];
  }
  return snapshot;
}
