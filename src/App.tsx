import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Building2, CalendarDays,
  CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Clock3, Download, FileSpreadsheet,
  Filter, HardHat, Layers3, LayoutDashboard, Menu, MoreHorizontal, PackageCheck,
  RefreshCw, Search, ShieldCheck, TrendingUp, Truck, UploadCloud, Wallet, Wrench, X
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import { demoExpenses, demoMachines, demoMeasurements, demoProjects } from './data/demo';
import { loadCanonicalSnapshot, toDashboardData, type CanonicalSnapshot } from './canonical/bridge';
import { CanonicalWorkspace } from './canonical/Workspace';
import {
  buildSummary, categoryColors, expenseCategories, exportCsv, filterExpenses, getCategoryTotals,
  getMonthlyTrend, getProjectRows, machineCostPerHour, normalizeImportedRows, parseCsv,
  type Expense, type Period, type Project
} from './lib/analytics';

type Section = 'overview' | 'works' | 'machines' | 'finance' | 'imports' | 'operacao';
type Preview = { file: string; valid: Expense[]; errors: string[] };
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const preciseMoney = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const compactMoney = (value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const dateBR = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
const monthBR = (month: string) => new Date(month + '-10T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const nameOf = (projectId: string, projects: Project[] = demoProjects) => projects.find(p => p.id === projectId)?.name || projectId;
const tooltipStyle = { background: '#ffffff', border: '1px solid #e2cfc5', borderRadius: 12, color: '#4a2820', boxShadow: '0 16px 36px #0005' };
const axisTick = { fill: '#8e776e', fontSize: 11 };
const gridStroke = '#efdfd7';

const navigation: { id: Section; label: string; subtitle?: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'works', label: 'Gestão de obras', icon: HardHat },
  { id: 'machines', label: 'Máquinas e frota', icon: Truck },
  { id: 'finance', label: 'Financeiro', icon: Wallet },
  { id: 'imports', label: 'Importar dados', icon: FileSpreadsheet },
  { id: 'operacao', label: 'Registros canônicos', icon: Layers3 }
];
const pageMeta: Record<Section, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'CENTRAL DE INTELIGÊNCIA', title: 'Visão geral', description: 'Acompanhe o cenário completo da sua operação.' },
  works: { eyebrow: 'OPERAÇÃO & DESEMPENHO', title: 'Gestão de obras', description: 'Custo, execução e prazos em uma única visão.' },
  machines: { eyebrow: 'ATIVOS & PRODUTIVIDADE', title: 'Máquinas e frota', description: 'Controle operacional, disponibilidade e custo por hora.' },
  finance: { eyebrow: 'GESTÃO FINANCEIRA', title: 'Painel financeiro', description: 'Entenda onde o dinheiro está sendo aplicado.' },
  imports: { eyebrow: 'INTEGRAÇÃO DE DADOS', title: 'Central de importação', description: 'Transforme arquivos operacionais em indicadores.' },
  operacao: { eyebrow: 'DADOS OPERACIONAIS', title: 'Registros canônicos', description: 'Módulos do Obra na Mão conectados sem copiar registros.' }
};

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function StatCard({ icon, label, value, foot, tone = 'mint' }: { icon: ReactNode; label: string; value: string; foot: string; tone?: 'mint' | 'blue' | 'amber' | 'purple' }) {
  return <article className={'stat-card tone-' + tone}>
    <div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon">{icon}</span></div>
    <strong className="stat-value">{value}</strong>
    <span className="stat-foot">{foot}</span>
    <span className="stat-glow" aria-hidden="true" />
  </article>;
}

function Panel({ title, subtitle, right, children, className = '' }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={'panel ' + className}>
    <div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{right}</div>
    {children}
  </section>;
}

function Status({ label }: { label: string }) {
  const cls = label === 'Atenção' || label === 'Pendente' || label === 'Manutenção' ? 'warning' :
    label === 'Em análise' || label === 'Ociosa' ? 'neutral' : 'success';
  return <span className={'status status-' + cls}><span className="status-dot" />{label}</span>;
}

function Progress({ value, color = '#721f19' }: { value: number; color?: string }) {
  return <div className="progress-track" aria-label={value + '% concluído'}><div className="progress-fill" style={{ width: Math.min(100, Math.max(0, value)) + '%', backgroundColor: color }} /></div>;
}

function Brand() {
  return <div className="brand">
    <img className="brand-icon" src="./artisys-icon.svg" alt="ArtiSys" width={38} height={38} />
  </div>;
}

function BrandSidebar({ section, setSection, menuOpen, setMenuOpen, connected }: { section: Section; setSection: (s: Section) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void; connected: boolean }) {
  return <>
    {menuOpen && <button type="button" className="sidebar-scrim" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
    <aside className={'sidebar ' + (menuOpen ? 'sidebar-open' : '')}>
      <div className="sidebar-brand"><Brand /><button className="sidebar-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={19} /></button></div>
      <div className="workspace-label">AMBIENTE DO CLIENTE</div>
      <div className="workspace-card"><span className="workspace-avatar"><Building2 size={18} /></span><span><strong>Opuz Engenharia</strong><small>{connected ? 'Fonte canônica conectada' : 'Ambiente demonstrativo'}</small></span><ChevronDown size={15} className="workspace-arrow" /></div>
      <p className="nav-label">MENU PRINCIPAL</p>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {navigation.map(item => <button key={item.id} className={'nav-item ' + (section === item.id ? 'active' : '')} onClick={() => { setSection(item.id); setMenuOpen(false); }}>
          <item.icon size={19} strokeWidth={section === item.id ? 2.2 : 1.75} /><span>{item.label}</span>
          {section === item.id && <span className="nav-active-indicator" />}
        </button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-insight"><div className="sidebar-insight-icon"><Activity size={17} /></div><strong>Resumo da operação</strong><p>Indicadores gerenciais de obras e equipamentos. Os valores desta prévia são ilustrativos.</p></div>
      <div className="sidebar-footer"><div className="tiny-avatar">OP</div><div><strong>Opuz Engenharia</strong><small>Painel demonstrativo</small></div><MoreHorizontal size={18} /></div>
    </aside>
  </>;
}

function ChartEmpty() { return <div className="empty-chart"><BarChart3 size={24} />Sem lançamentos para os filtros escolhidos.</div>; }

function Overview({ entries, projects, machines, measurements, setSection, setProject }: { entries: Expense[]; projects: Project[]; machines: typeof demoMachines; measurements: typeof demoMeasurements; setSection: (v: Section) => void; setProject: (v: string) => void }) {
  const summary = buildSummary(projects, entries);
  const monthly = getMonthlyTrend(entries);
  const category = getCategoryTotals(entries);
  const projectRows = getProjectRows(projects, entries);
  return <>
    <div className="hero">
      <div className="hero-copy">
        <span className="hero-kicker"><span className="kicker-mark" /> OPUZ ENGENHARIA · VISÃO OPERACIONAL</span>
        <h2>Suas obras, em foco.<br /><em>Decisões com clareza.</em></h2>
        <p>Acompanhe custos, produtividade e evolução de cada obra em um único painel de gestão.</p>
        <div className="hero-actions"><button className="btn btn-primary" onClick={() => setSection('works')}>Consultar obras <ArrowUpRight size={17} /></button><button className="btn btn-ghost" onClick={() => setSection('machines')}>Ver equipamentos <ArrowRight size={16} /></button></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="art-circle art-circle-1" /><div className="art-circle art-circle-2" /><div className="art-circle art-circle-3" /><div className="art-center"><BarChart3 size={34} /></div><span className="art-node art-node-a" /><span className="art-node art-node-b" /><span className="art-node art-node-c" /></div>
    </div>
    <div className="stat-grid">
      <StatCard icon={<Wallet size={19} />} label="Orçamento das obras" value={compactMoney(summary.budget)} foot="Valor planejado dos contratos" />
      <StatCard icon={<TrendingUp size={19} />} label="Custos registrados" value={compactMoney(summary.spent)} foot="Total no período selecionado" tone="blue" />
      <StatCard icon={<Layers3 size={19} />} label="Saldo orçamentário" value={compactMoney(summary.balance)} foot="Orçamento menos custos filtrados" tone="purple" />
      <StatCard icon={<HardHat size={19} />} label="Obras monitoradas" value={String(summary.projectCount).padStart(2, '0')} foot={summary.atRisk + ' com atenção ao planejamento'} tone="amber" />
    </div>
    <div className="section-label-row"><div><span className="section-kicker">ANÁLISE CONSOLIDADA</span><h2>O que os números mostram</h2></div><span className="muted-note"><Activity size={15} /> Indicadores calculados dos lançamentos</span></div>
    <div className="analytics-grid">
      <Panel title="Evolução dos custos" subtitle="Despesas registradas mês a mês" className="trend-panel" right={<span className="mini-label">R$ · mensal</span>}>
        {monthly.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={262}>
          <AreaChart data={monthly} margin={{ top: 15, right: 8, left: 3, bottom: 0 }}>
            <defs><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#721f19" stopOpacity={0.29}/><stop offset="100%" stopColor="#721f19" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 6" />
            <XAxis dataKey="month" tickFormatter={monthBR} tick={axisTick} tickLine={false} axisLine={false} dy={12} />
            <YAxis tickFormatter={v => compactMoney(Number(v))} tick={axisTick} tickLine={false} axisLine={false} width={65} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => money(Number(v))} labelFormatter={v => 'Competência ' + String(v)} />
            <Area type="monotone" dataKey="amount" name="Custos" stroke="#721f19" strokeWidth={3} fill="url(#expenseFill)" isAnimationActive={false} dot={{ r: 3, fill: '#721f19', strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer></div> : <ChartEmpty />}
        <div className="panel-footline"><span><i className="legend-dot violet" /> Custos efetivos da demonstração</span><span>Fonte: lançamentos da amostra</span></div>
      </Panel>
      <Panel title="Distribuição de custos" subtitle="Participação por categoria" right={<span className="mini-label">4 categorias</span>}>
        {entries.length ? <><div className="donut-chart"><ResponsiveContainer width="100%" height={194}>
          <PieChart><Pie data={category} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={63} outerRadius={85} paddingAngle={3} stroke="none" isAnimationActive={false}>
            {category.map(item => <Cell key={item.name} fill={item.color} />)}
          </Pie><Tooltip contentStyle={tooltipStyle} formatter={v => money(Number(v))} /></PieChart>
        </ResponsiveContainer><div className="donut-center"><small>Distribuído</small><strong>100%</strong></div></div>
        <div className="donut-legend">{category.map(c => <div key={c.name}><span><i style={{ background: c.color }} />{c.name}</span><strong>{entries.length ? Math.round(c.value / summary.spent * 100) : 0}%</strong></div>)}</div></> : <ChartEmpty />}
      </Panel>
    </div>
    <div className="bottom-grid">
      <Panel title="Desempenho por obra" subtitle="Execução física e situação operacional" right={<button className="text-link" onClick={() => setSection('works')}>Todas as obras <ArrowRight size={15} /></button>} className="works-panel">
        <div className="table-scroll"><table className="data-table"><thead><tr><th>OBRA</th><th>CUSTO REGISTRADO</th><th>AVANÇO</th><th>STATUS</th><th /></tr></thead><tbody>
          {projectRows.map(project => <tr key={project.id}><td><span className="work-name">{project.name}</span><span className="cell-subtext">{project.code} · {project.location}</span></td><td><strong>{money(project.spent)}</strong><span className="cell-subtext">de {money(project.budget)}</span></td><td><div className="table-progress"><span>{project.progress}%</span><Progress value={project.progress} color={project.accent}/></div></td><td><Status label={project.status} /></td><td><button className="row-arrow" aria-label={'Abrir ' + project.name} onClick={() => { setProject(project.id); setSection('works'); }}><ChevronRight size={17}/></button></td></tr>)}
          {!projectRows.length && <tr><td colSpan={5}><ChartEmpty /></td></tr>}
        </tbody></table></div>
      </Panel>
      <Panel title="Visão de campo" subtitle="Ocorrências que merecem acompanhamento" right={<span className="mini-label">DEMONSTRAÇÃO</span>}>
        <div className="highlights">
          <div className="highlight"><span className="highlight-icon warn"><CircleAlert size={19}/></span><div><strong>{projects.filter(p => p.status === 'Atenção').length} obra(s) em atenção</strong><p>Desvios relevantes no cronograma</p></div><ArrowUpRight size={16}/></div>
          <div className="highlight"><span className="highlight-icon blue"><Wrench size={19}/></span><div><strong>{machines.filter(m => m.status === 'Manutenção').length} equipamento(s) em manutenção</strong><p>Acompanhe a disponibilidade da frota</p></div><ArrowUpRight size={16}/></div>
          <div className="highlight"><span className="highlight-icon mint"><PackageCheck size={19}/></span><div><strong>{measurements.filter(m => m.status === 'Aprovada').length} medições aprovadas</strong><p>Conferência e andamento de medições</p></div><ArrowUpRight size={16}/></div>
        </div>
        <button className="panel-outline-button" onClick={() => setSection('finance')}>Analisar indicadores financeiros <ArrowRight size={16}/></button>
      </Panel>
    </div>
  </>;
}

function Works({ projects, entries, search, setSearch, setProject }: { projects: Project[]; entries: Expense[]; search: string; setSearch: (v: string) => void; setProject: (v: string) => void }) {
  const rows = getProjectRows(projects, entries).filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="page-intro"><div><span className="section-kicker">PORTFÓLIO OPERACIONAL</span><h2>Obras sob controle, do início ao fim.</h2><p>Compare o avanço físico, o planejado e o orçamento registrado para cada frente de operação.</p></div><div className="intro-icon"><Building2 size={29}/></div></div>
    <div className="stat-grid three-cards">
      <StatCard icon={<Building2 size={19}/>} label="Obras na seleção" value={String(projects.length).padStart(2, '0')} foot="Empreendimentos acompanhados" />
      <StatCard icon={<Activity size={19}/>} label="Avanço físico médio" value={projects.length ? Math.round(projects.reduce((s,p) => s+p.progress, 0)/projects.length) + '%' : '—'} foot="Percentual de execução informado" tone="blue" />
      <StatCard icon={<CircleAlert size={19}/>} label="Obras em atenção" value={String(projects.filter(p=>p.status==='Atenção').length).padStart(2,'0')} foot="Sinalizadas na amostra" tone="amber"/>
    </div>
    <Panel title="Portfólio de obras" subtitle="Selecione uma obra para aplicar o filtro global" right={<label className="searchbox"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar obra" aria-label="Buscar obra"/></label>}>
      <div className="project-card-grid">{rows.map(project => {
        const spent = entries.filter(e=>e.projectId===project.id).reduce((s,e)=>s+e.amount,0);
        return <button key={project.id} className="project-card" onClick={() => setProject(project.id)}>
          <div className="project-card-head"><span className="project-code">{project.code}</span><Status label={project.status}/></div>
          <h3>{project.name}</h3><p className="project-location"><Building2 size={13}/>{project.location}</p>
          <div className="project-divider"/>
          <div className="project-data-line"><span>Execução física</span><strong>{project.progress}%</strong></div><Progress value={project.progress} color={project.accent}/>
          <div className="project-data-line secondary-line"><span>Planejado</span><strong>{project.planned}%</strong></div>
          <div className="project-money"><div><small>Orçamento total</small><strong>{money(project.budget)}</strong></div><div><small>Custos filtrados</small><strong>{money(spent)}</strong></div></div>
          <div className="project-footer"><span><CalendarDays size={14}/> Previsão {dateBR(project.deadline)}</span><span>Detalhar <ArrowUpRight size={14}/></span></div>
        </button>;
      })}</div>
      {!rows.length && <div className="empty-state">Nenhuma obra corresponde à pesquisa.</div>}
    </Panel>
    <div className="info-banner"><ShieldCheck size={18}/><span>Indicadores de execução física e datas são ilustrativos. Os custos são calculados a partir do livro de lançamentos da demonstração.</span></div>
  </>;
}

function Machines({ machines, projects, connected }: { machines: typeof demoMachines; projects: Project[]; connected: boolean }) {
  const totalHours = machines.reduce((s,m)=>s+m.hours,0);
  const costs = machines.reduce((s,m)=>s+m.fuelCost+m.maintenanceCost+m.laborCost,0);
  const chartData = machines.map(m => ({ name:m.model, value:machineCostPerHour(m) || 0, status:m.status })).sort((a,b)=>b.value-a.value);
  return <>
    <div className="page-intro"><div><span className="section-kicker">MONITORAMENTO DE ATIVOS</span><h2>Cada hora de máquina tem um custo.</h2><p>{connected ? 'Horas e custo apontados nos RDOs canônicos de cada obra.' : 'Visualize produtividade, combustível, manutenção e custo operacional dos equipamentos.'}</p></div><div className="intro-icon"><Truck size={30}/></div></div>
    <div className="stat-grid">
      <StatCard label="Máquinas cadastradas" value={String(machines.length).padStart(2,'0')} foot={connected ? 'Equipamentos agrupados dos RDOs' : 'Ativos associados às obras'} icon={<Truck size={19}/>}/>
      <StatCard label="Horas trabalhadas" value={number(totalHours) + 'h'} foot="Horímetros simulados" icon={<Clock3 size={19}/>} tone="blue"/>
      <StatCard label="Custo operacional" value={compactMoney(costs)} foot={connected ? 'Custo apontado nos RDOs' : 'Combustível, manutenção e equipe'} icon={<Wallet size={19}/>} tone="purple"/>
      <StatCard label="Em manutenção" value={String(machines.filter(m=>m.status==='Manutenção').length).padStart(2,'0')} foot="Ativos temporariamente indisponíveis" icon={<Wrench size={19}/>} tone="amber"/>
    </div>
    <div className="analytics-grid">
      <Panel title="Custo por hora / equipamento" subtitle="Custo operacional total dividido pelas horas" className="trend-panel" right={<span className="mini-label">R$ / hora</span>}>
        {chartData.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={chartData} layout="vertical" margin={{ top: 10, left: 0, right: 28, bottom: 0 }}><CartesianGrid stroke={gridStroke} horizontal={false} strokeDasharray="4 5"/><XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>'R$ '+v}/><YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={88}/><Tooltip cursor={{ fill:'#f6ede7' }} contentStyle={tooltipStyle} formatter={v=>preciseMoney(Number(v))}/><Bar name="Custo/hora" dataKey="value" fill="#721f19" radius={[0,6,6,0]} barSize={17} isAnimationActive={false}/></BarChart></ResponsiveContainer> : <ChartEmpty/>}
      </Panel>
      <Panel title="Composição dos custos" subtitle={connected ? 'Registro consolidado dos RDOs — sem inferir diesel ou manutenção' : 'Valores ilustrativos da frota selecionada'}>
        <div className="cost-breakdown">{[
          {name:'Combustível',value:machines.reduce((s,m)=>s+m.fuelCost,0),color:'#721f19'},
          {name:'Manutenção',value:machines.reduce((s,m)=>s+m.maintenanceCost,0),color:'#ca8170'},
          {name:'Mão de obra',value:machines.reduce((s,m)=>s+m.laborCost,0),color:'#a64b3e'}
        ].map(item=><div key={item.name} className="cost-line"><div><span><i style={{background:item.color}}/>{item.name}</span><strong>{money(item.value)}</strong></div><Progress value={costs ? item.value / costs * 100 : 0} color={item.color}/></div>)}</div>
        <div className="cost-hint"><Activity size={17}/> Custo médio da frota: <strong>{totalHours ? preciseMoney(costs/totalHours) : '—'} / h</strong></div>
      </Panel>
    </div>
    <Panel title="Cadastro de equipamentos" subtitle="Monitoramento da frota demonstrativa" right={<span className="mini-label">{machines.length} equipamentos</span>}>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>EQUIPAMENTO</th><th>OBRA ALOCADA</th><th>HORAS</th><th>CUSTO TOTAL</th><th>CUSTO/HORA</th><th>STATUS</th></tr></thead><tbody>
        {machines.map(m=><tr key={m.id}><td><span className="work-name">{m.model}</span><span className="cell-subtext">{m.id} · {m.name}</span></td><td><span className="cell-small">{nameOf(m.projectId,projects)}</span></td><td><strong>{number(m.hours)}h</strong></td><td><strong>{money(m.fuelCost+m.maintenanceCost+m.laborCost)}</strong></td><td><strong className="violet-text">{machineCostPerHour(m) === null ? '—' : preciseMoney(machineCostPerHour(m)!)}</strong></td><td><Status label={m.status}/></td></tr>)}
        {!machines.length && <tr><td colSpan={6}><ChartEmpty/></td></tr>}
      </tbody></table></div>
    </Panel>
    <div className="info-banner"><CircleAlert size={18}/><span>{connected ? 'Valores originados dos apontamentos RDO. O servidor não separa esses custos por combustível e manutenção neste contrato; não use este gráfico como decomposição contábil.' : 'Os valores de maquinário ilustram um cálculo de custo/hora. Não representam custos reais informados pela Opuz.'}</span></div>
  </>;
}

function Finance({ entries, measurements, projects }: { entries: Expense[]; measurements: typeof demoMeasurements; projects: Project[] }) {
  const categories = getCategoryTotals(entries);
  const months = getMonthlyTrend(entries);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const ordered = [...entries].sort((a,b)=>b.date.localeCompare(a.date));
  const onExport = () => download('artisys-bi-lancamentos.csv', exportCsv([
    ['obra','data','categoria','descricao','valor'],
    ...ordered.map(item => [nameOf(item.projectId,projects),item.date,item.category,item.description,item.amount])
  ]));
  return <>
    <div className="page-intro"><div><span className="section-kicker">RASTREABILIDADE DOS CUSTOS</span><h2>Dos lançamentos à estratégia.</h2><p>Identifique despesas por categoria, período e obra, sem perder o contexto operacional.</p></div><div className="intro-icon"><Wallet size={29}/></div></div>
    <div className="stat-grid three-cards">
      <StatCard label="Despesas registradas" value={compactMoney(total)} foot={entries.length + ' lançamentos na seleção'} icon={<Wallet size={19}/>}/>
      <StatCard label="Medições acompanhadas" value={String(measurements.length).padStart(2,'0')} foot="Boletins simulados" icon={<Layers3 size={19}/>} tone="blue"/>
      <StatCard label="Valor medido" value={compactMoney(measurements.reduce((s,m)=>s+m.amount,0))} foot="Independentemente do recebimento" icon={<CheckCircle2 size={19}/>} tone="purple"/>
    </div>
    <div className="analytics-grid">
      <Panel title="Evolução por natureza de custo" subtitle="Distribuição mensal dos lançamentos" className="trend-panel">
        {months.length ? <ResponsiveContainer width="100%" height={268}><AreaChart data={months} margin={{top:12,right:6,left:3,bottom:0}}><CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 6"/><XAxis dataKey="month" tickFormatter={monthBR} tick={axisTick} axisLine={false} tickLine={false} dy={10}/><YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>compactMoney(Number(v))} width={65}/><Tooltip contentStyle={tooltipStyle} formatter={v=>money(Number(v))}/>{expenseCategories.map(category=><Area key={category} name={category} type="monotone" dataKey={category} stackId="1" fill={categoryColors[category]} fillOpacity={0.58} stroke={categoryColors[category]} strokeWidth={1.5} isAnimationActive={false}/>)}</AreaChart></ResponsiveContainer> : <ChartEmpty/>}
      </Panel>
      <Panel title="Despesas por categoria" subtitle="Total no recorte selecionado">
        <div className="category-ledger">{categories.map(c=><div className="category-row" key={c.name}><div className="category-row-icon" style={{color:c.color,background:c.color+'18'}}><ArrowUpRight size={17}/></div><div><strong>{c.name}</strong><small>{total ? Math.round(c.value/total*100) : 0}% do total</small></div><strong>{money(c.value)}</strong></div>)}</div>
      </Panel>
    </div>
    <Panel title="Livro de lançamentos" subtitle="Registros do período com rastreabilidade de origem" right={<button className="btn btn-small btn-outline" onClick={onExport}><Download size={15}/> Exportar CSV</button>}>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>DATA</th><th>DESCRIÇÃO</th><th>OBRA</th><th>CATEGORIA</th><th>ORIGEM</th><th className="text-right">VALOR</th></tr></thead><tbody>
        {ordered.slice(0,45).map(e=><tr key={e.id}><td><span className="cell-small">{dateBR(e.date)}</span></td><td><span className="work-name">{e.description}</span></td><td><span className="cell-small">{nameOf(e.projectId,projects)}</span></td><td><span className="chip">{e.category}</span></td><td><span className="cell-small">{e.source === 'demo' ? 'Amostra' : e.source === 'canonico' ? 'Obra na Mão' : 'Importação'}</span></td><td className="text-right"><strong>{preciseMoney(e.amount)}</strong></td></tr>)}
        {!ordered.length && <tr><td colSpan={6}><ChartEmpty/></td></tr>}
      </tbody></table></div>
      {ordered.length>45 && <p className="table-count">Exibindo os 45 lançamentos mais recentes. O CSV exporta todos os {ordered.length} registros filtrados.</p>}
    </Panel>
    <Panel title="Medições por obra" subtitle="Controle gerencial de boletins e aprovações" className="measurements-panel">
      <div className="measurement-list">{measurements.map(m=><div className="measurement-item" key={m.id}><div className="measurement-badge"><FileSpreadsheet size={18}/></div><div className="measurement-details"><strong>{m.description}</strong><small>{m.id} · {nameOf(m.projectId,projects)} · {dateBR(m.date)}</small></div><strong>{money(m.amount)}</strong><Status label={m.status}/></div>)}{!measurements.length&&<div className="empty-state">Não há medições nessa seleção.</div>}</div>
    </Panel>
  </>;
}

async function fileToRows(file: File): Promise<Record<string, unknown>[]> {
  if (file.name.toLowerCase().endsWith('.csv')) return parseCsv(await file.text());
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Use um arquivo CSV ou XLSX.');
  const exceljs = await import('exceljs');
  const workbook = new exceljs.default.Workbook();
  await workbook.xlsx.load((await file.arrayBuffer()) as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Planilha sem abas.');
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(cell => String(cell ?? ''));
  const results: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1);
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const value = values[index];
      record[header] = value instanceof Date ? value.toISOString().slice(0,10) : value ?? '';
    });
    if (Object.values(record).some(value => value !== '')) results.push(record);
  });
  return results;
}

function Imports({ imported, onApply, onReset }: { imported: Expense[]; onApply: (rows: Expense[]) => void; onReset: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const template = () => download('modelo-artisys-bi.csv', exportCsv([
    ['obra', 'data', 'categoria', 'descricao', 'valor'],
    ['Terraplenagem Industrial', '2026-10-20', 'Máquinas', 'Diesel de escavadeira', '1500,50'],
    ['Infraestrutura Viária', '2026-10-20', 'Materiais', 'Brita graduada', '2750,00']
  ]));
  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(''); setPreview(null);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('O limite da demonstração é de 8 MB por arquivo.');
      const rows = await fileToRows(file);
      if (!rows.length) throw new Error('O arquivo não contém linhas de dados.');
      const result = normalizeImportedRows(rows, demoProjects);
      setPreview({ file: file.name, ...result });
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.'); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  return <>
    <div className="page-intro"><div><span className="section-kicker">CONEXÃO COM PLANILHAS</span><h2>Seus dados, uma visão mais inteligente.</h2><p>Importe despesas operacionais em CSV ou XLSX e visualize os valores no painel, sem serviços externos.</p></div><div className="intro-icon"><UploadCloud size={29}/></div></div>
    <div className="import-layout">
      <Panel title="Importação de lançamentos" subtitle="Uma etapa de cada vez, com validação antes de aplicar" className="upload-panel">
        <input ref={fileInput} type="file" accept=".csv,.xlsx" hidden onChange={e=>void handleFile(e.target.files?.[0])} />
        <div className={'dropzone ' + (drag ? 'dragging' : '')}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={e=>{e.preventDefault();setDrag(false);}}
          onDrop={e=>{e.preventDefault();setDrag(false);void handleFile(e.dataTransfer.files[0]);}}>
          <div className="upload-icon"><UploadCloud size={29}/></div>
          <h3>{busy ? 'Lendo e validando o arquivo...' : 'Arraste sua planilha para cá'}</h3>
          <p>Ou selecione um arquivo do seu computador</p>
          <button className="btn btn-primary" disabled={busy} onClick={()=>fileInput.current?.click()}><FileSpreadsheet size={17}/> Escolher arquivo</button>
          <small>CSV ou XLSX · Até 8 MB · Processado no navegador</small>
        </div>
        {error && <div role="alert" className="import-error"><CircleAlert size={17}/>{error}</div>}
        {preview && <div className="import-preview">
          <div className="preview-header"><div><strong><FileSpreadsheet size={17}/>{preview.file}</strong><small>{preview.valid.length} registros válidos · {preview.errors.length} linha(s) com erro</small></div><button className="icon-button" onClick={()=>setPreview(null)} aria-label="Descartar prévia"><X size={18}/></button></div>
          {preview.errors.length>0 && <div className="import-error"><CircleAlert size={17}/><span>{preview.errors.slice(0,3).join(' ')} {preview.errors.length>3?'Outros erros foram omitidos.':''}</span></div>}
          {preview.valid.length>0 && <><div className="preview-rows">{preview.valid.slice(0,4).map(e=><div key={e.id}><span>{nameOf(e.projectId)}<small>{e.description}</small></span><strong>{preciseMoney(e.amount)}</strong></div>)}</div><button className="btn btn-primary full-width" onClick={()=>{onApply(preview.valid);setPreview(null);}}>Aplicar {preview.valid.length} lançamento(s) ao painel <ArrowRight size={16}/></button></>}
        </div>}
      </Panel>
      <div className="import-side">
        <Panel title="Formato esperado" subtitle="Campos usados para montar os indicadores">
          <div className="schema-list">{[
            ['obra','Nome ou código de uma obra cadastrada'],
            ['data','AAAA-MM-DD ou DD/MM/AAAA'],
            ['categoria','Máquinas, Equipe, Materiais ou Terceiros'],
            ['descricao','Identificação do lançamento'],
            ['valor','Valor positivo em reais']
          ].map(([name,desc],idx)=><div key={name}><span>{idx+1}</span><div><strong>{name}</strong><small>{desc}</small></div></div>)}</div>
          <button className="btn btn-outline full-width" onClick={template}><Download size={16}/> Baixar modelo CSV</button>
        </Panel>
        <div className="import-security"><ShieldCheck size={23}/><div><strong>Importação local e transparente</strong><p>Os arquivos são processados no navegador. Nesta demonstração, os dados importados ficam somente na sessão, sem servidor ou armazenamento permanente.</p></div></div>
        {imported.length>0 && <Panel title="Dados importados nesta sessão"><div className="imported-state"><CheckCircle2 size={20}/><div><strong>{imported.length} lançamentos adicionados</strong><small>Somados à base fictícia no painel</small></div></div><button className="btn btn-outline full-width" onClick={onReset}><RefreshCw size={16}/> Restaurar apenas dados fictícios</button></Panel>}
      </div>
    </div>
    <div className="info-banner"><CircleAlert size={18}/><span>Esta etapa demonstra a importação gerencial. Integração com banco central, autenticação e importação de dados reais serão configuradas somente após definição do escopo com o cliente.</span></div>
  </>;
}

export default function App() {
  const [section, setSection] = useState<Section>('overview');
  const [selectedProject, setSelectedProject] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [imported, setImported] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [canonical,setCanonical] = useState<CanonicalSnapshot|null>(null);
  const [sourceError,setSourceError] = useState('');
  const [sourcePending,setSourcePending] = useState(true);
  const refreshCanonical = async () => {
    try {
      const source=await loadCanonicalSnapshot();
      setCanonical(source);setSourceError('');
    }catch(e) {
      const message=e instanceof Error?e.message:String(e);
      if(!message.includes('HTTP 404'))setSourceError(message);
    }finally{setSourcePending(false);}
  };
  useEffect(()=>{void refreshCanonical();},[]);
  const connected=canonical!==null;
  const projection=useMemo(()=>canonical?toDashboardData(canonical):null,[canonical]);
  const sourceProjects=projection?.projects??demoProjects;
  const sourceMachines=projection?.machines??demoMachines;
  const sourceMeasurements=projection?.measurements??demoMeasurements;
  const allEntries = useMemo(() => projection?projection.expenses:[...demoExpenses, ...imported], [projection,imported]);
  const entries = useMemo(() => filterExpenses(allEntries, selectedProject, period), [allEntries, selectedProject, period]);
  const projects = useMemo(() => selectedProject === 'all' ? sourceProjects : sourceProjects.filter(p=>p.id===selectedProject), [sourceProjects,selectedProject]);
  const machines = useMemo(() => sourceMachines.filter(m=>selectedProject==='all'||m.projectId===selectedProject), [sourceMachines,selectedProject]);
  const measurements = useMemo(() => sourceMeasurements.filter(m=>selectedProject==='all'||m.projectId===selectedProject), [sourceMeasurements,selectedProject]);
  const meta = pageMeta[section];
  const navigate = (newSection: Section) => { setSection(newSection); window.scrollTo({top:0,behavior:'smooth'}); };
  const globalExport = () => download('artisys-bi-resumo.csv', exportCsv([
    ['Obra','Orçamento','Custo no período','Execução física (%)','Planejado (%)','Status'],
    ...getProjectRows(projects, entries).map(p=>[p.name,p.budget,p.spent,p.progress,p.planned,p.status])
  ]));

  return <div className="app-shell">
    <BrandSidebar section={section} setSection={navigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} connected={connected}/>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu icon-button" aria-label="Abrir menu" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button><div className="breadcrumbs"><span>Opuz Engenharia</span><ChevronRight size={14}/><strong>{meta.title}</strong></div></div>
        <div className="topbar-actions"><span className="demo-indicator"><i/> {connected ? 'CANÔNICO' : 'DEMONSTRAÇÃO'}</span><span className="top-separator"/><span className="top-date"><CalendarDays size={16}/> 21 out, 2026</span><button className="icon-button top-export" title="Exportar resumo" aria-label="Exportar resumo" onClick={globalExport}><Download size={19}/></button><span className="header-avatar">OP</span></div>
      </header>
      <div className="content">
        <div className="page-header"><div><span className="page-eyebrow">{meta.eyebrow}</span><h1>{meta.title}<span className="title-point">.</span></h1><p>{meta.description}</p></div><div className="page-header-right"><span className="data-warning"><ShieldCheck size={15}/> {connected ? 'Fonte: Obra na Mão' : 'Dados 100% simulados'}</span></div></div>
        {section !== 'imports' && section !== 'operacao' && <div className="filters-bar"><div className="filters-title"><Filter size={17}/><span>Filtros de análise</span></div><div className="filters-controls">
          <label className="select-wrap"><Building2 size={16}/><select aria-label="Filtrar por obra" value={selectedProject} onChange={e=>setSelectedProject(e.target.value)}><option value="all">Todas as obras</option>{sourceProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown size={15}/></label>
          <label className="select-wrap period-select"><CalendarDays size={16}/><select aria-label="Filtrar por período" value={period} onChange={e=>setPeriod(e.target.value as Period)}><option value="all">Todo o histórico</option><option value="90d">Últimos 90 dias</option><option value="30d">Últimos 30 dias</option></select><ChevronDown size={15}/></label>
          {(selectedProject!=='all'||period!=='all')&&<button className="filter-reset" onClick={()=>{setSelectedProject('all');setPeriod('all')}}><X size={14}/> Limpar filtros</button>}
        </div></div>}
        {sourceError && <div className="info-banner" role="alert"><CircleAlert size={17}/><span>Conexão canônica indisponível: {sourceError}. Não foram misturados dados reais aos fictícios.</span></div>}
        {sourcePending && <div className="info-banner">Verificando fonte canônica…</div>}
        {imported.length>0 && !connected && section!=='imports' && <div className="import-notice"><CheckCircle2 size={17}/>{imported.length} lançamento(s) importado(s) nesta sessão estão incluídos nos custos. <button onClick={()=>navigate('imports')}>Gerenciar <ArrowRight size={14}/></button></div>}
        {section === 'overview' && <Overview entries={entries} projects={projects} machines={machines} measurements={measurements} setSection={navigate} setProject={setSelectedProject}/>}
        {section === 'works' && <Works projects={projects} entries={entries} search={search} setSearch={setSearch} setProject={setSelectedProject}/>}
        {section === 'machines' && <Machines machines={machines} projects={sourceProjects} connected={connected}/>}
        {section === 'finance' && <Finance entries={entries} measurements={measurements} projects={sourceProjects}/>}
        {section === 'imports' && (connected?<div className="panel"><h3>Importador transacional</h3><p>Com a conexão canônica ativa, não são permitidas importações temporárias que criem uma segunda verdade. Use o Importador Universal já existente no Obra na Mão ou o serviço de importação transacional autorizado.</p><button className="btn btn-primary" onClick={()=>navigate('operacao')}>Abrir registros canônicos</button></div>:<Imports imported={imported} onApply={rows=>setImported(old=>[...old,...rows])} onReset={()=>setImported([])}/>)}
        {section === 'operacao' && (canonical ? <CanonicalWorkspace snapshot={canonical} onRefresh={refreshCanonical} /> : <div className="panel"><h3>Conectar a fonte canônica</h3><p>Esta hospedagem estática não tem acesso ao banco do Obra na Mão. Inicie localmente o gateway autorizado com OBRA_LAN_API_URL e OBRA_LAN_DEVICE_TOKEN, conforme o README, para acessar todas as entidades e editar na fonte.</p><p>Não há banco paralelo no BI e o aplicativo não armazena credenciais no navegador.</p></div>)}
        <footer className="app-footer"><span>© 2026 · Painel demonstrativo para Opuz Engenharia</span><span>{connected ? 'Fonte de dados: serviço canônico Obra na Mão' : 'Dados fictícios'} • Tecnologia <a href="https://artisys.dev" target="_blank" rel="noreferrer">ArtiSys</a></span></footer>
      </div>
    </main>
  </div>;
}
