import type { Expense, Machine, Measurement, Project } from '../lib/analytics';

export const demoProjects: Project[] = [
  { id: 'obra-01', code: 'OB-001', name: 'Terraplenagem Industrial', location: 'Curitiba, PR', client: 'Complexo Industrial Norte', budget: 920000, progress: 72, planned: 76, deadline: '2026-11-28', status: 'Em execução', accent: '#af58ff' },
  { id: 'obra-02', code: 'OB-002', name: 'Infraestrutura Viária', location: 'Araucária, PR', client: 'Corredor Logístico Sul', budget: 680000, progress: 61, planned: 68, deadline: '2026-12-18', status: 'Em execução', accent: '#678bff' },
  { id: 'obra-03', code: 'OB-003', name: 'Demolição Controlada', location: 'São José dos Pinhais, PR', client: 'Parque Empresarial', budget: 410000, progress: 91, planned: 87, deadline: '2026-11-05', status: 'Em execução', accent: '#e2bd86' },
  { id: 'obra-04', code: 'OB-004', name: 'Pátio Logístico', location: 'Pinhais, PR', client: 'Terminal de Cargas', budget: 550000, progress: 73, planned: 91, deadline: '2026-10-31', status: 'Atenção', accent: '#f5a77f' },
  { id: 'obra-05', code: 'OB-005', name: 'Rede de Drenagem', location: 'Colombo, PR', client: 'Distrito Operacional', budget: 300000, progress: 45, planned: 49, deadline: '2027-01-15', status: 'Em execução', accent: '#c58aff' }
];

const projectMonthly: Record<string, number[]> = {
  'obra-01': [65000, 83000, 102000, 113000, 104000, 88000],
  'obra-02': [44000, 61000, 76000, 84000, 80000, 65000],
  'obra-03': [31000, 41000, 52000, 57000, 64000, 46000],
  'obra-04': [33000, 46000, 65000, 73000, 78000, 71000],
  'obra-05': [13000, 22000, 28000, 31000, 42000, 32000]
};

const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const categories = [
  { name: 'Máquinas', weight: 0.36, description: 'Operação e manutenção de equipamentos' },
  { name: 'Equipe', weight: 0.29, description: 'Equipes de campo e encargos' },
  { name: 'Materiais', weight: 0.23, description: 'Insumos e materiais de obra' },
  { name: 'Terceiros', weight: 0.12, description: 'Serviços contratados' }
] as const;

export const demoExpenses: Expense[] = demoProjects.flatMap((project) =>
  months.flatMap((month, monthIndex) => {
    const amount = projectMonthly[project.id][monthIndex];
    let allocated = 0;
    return categories.map((category, categoryIndex) => {
      const categoryAmount = categoryIndex === categories.length - 1 ? amount - allocated : Math.round(amount * category.weight);
      allocated += categoryAmount;
      return {
        id: project.id + '-' + month + '-' + categoryIndex,
        projectId: project.id,
        date: month + '-' + (10 + categoryIndex * 3),
        category: category.name,
        description: category.description,
        amount: categoryAmount,
        source: 'demo' as const
      };
    });
  })
);

export const demoMachines: Machine[] = [
  { id: 'EQ-001', name: 'Escavadeira hidráulica', model: 'CAT 320', projectId: 'obra-01', hours: 218, fuelCost: 21800, maintenanceCost: 7800, laborCost: 12300, status: 'Operando' },
  { id: 'EQ-002', name: 'Trator de esteira', model: 'CAT D6', projectId: 'obra-01', hours: 196, fuelCost: 28400, maintenanceCost: 9200, laborCost: 10400, status: 'Operando' },
  { id: 'EQ-003', name: 'Motoniveladora', model: 'CAT 140K', projectId: 'obra-02', hours: 174, fuelCost: 15400, maintenanceCost: 5100, laborCost: 9800, status: 'Operando' },
  { id: 'EQ-004', name: 'Retroescavadeira', model: 'JCB 3CX', projectId: 'obra-04', hours: 132, fuelCost: 10900, maintenanceCost: 8700, laborCost: 7200, status: 'Manutenção' },
  { id: 'EQ-005', name: 'Caminhão basculante', model: 'Volvo FMX', projectId: 'obra-02', hours: 201, fuelCost: 19400, maintenanceCost: 6200, laborCost: 10600, status: 'Operando' },
  { id: 'EQ-006', name: 'Rolo compactador', model: 'Hamm 3411', projectId: 'obra-05', hours: 107, fuelCost: 8400, maintenanceCost: 3100, laborCost: 5900, status: 'Ociosa' },
  { id: 'EQ-007', name: 'Escavadeira hidráulica', model: 'Hyundai R220', projectId: 'obra-03', hours: 188, fuelCost: 17800, maintenanceCost: 5400, laborCost: 9500, status: 'Operando' }
];

export const demoMeasurements: Measurement[] = [
  { id: 'MED-024', projectId: 'obra-01', description: 'Movimentação de terra · lote 03', date: '2026-10-15', amount: 78500, status: 'Aprovada' },
  { id: 'MED-023', projectId: 'obra-02', description: 'Sub-base e compactação', date: '2026-10-12', amount: 46200, status: 'Em análise' },
  { id: 'MED-022', projectId: 'obra-04', description: 'Pavimentação · etapa 02', date: '2026-10-10', amount: 61200, status: 'Pendente' },
  { id: 'MED-021', projectId: 'obra-03', description: 'Demolição e destinação', date: '2026-09-29', amount: 48300, status: 'Aprovada' },
  { id: 'MED-020', projectId: 'obra-05', description: 'Instalação de drenagem', date: '2026-09-25', amount: 28900, status: 'Aprovada' }
];
