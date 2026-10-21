import { useMemo, useState } from 'react';
import { Check, CircleAlert, Database, FileSpreadsheet, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import type { CanonicalRecord, CanonicalSnapshot } from './bridge';

type Field={ key:string; label:string; type?:'number'|'date'|'text'; required?:boolean };
type Grid={ name:string; description:string; fields:Field[]; write:boolean };
const grid:Record<string,Grid>={
  obras:{name:'Obras',description:'Cadastro mestre de obras — o mesmo domínio do Obra na Mão.',write:true,fields:[
    {key:'nome',label:'Obra',required:true},{key:'codigo',label:'Código'},
    {key:'endereco',label:'Local'},{key:'status',label:'Situação'},
    {key:'percentual_fisico',label:'Avanço %',type:'number'},
    {key:'valor_contratado_centavos',label:'Contrato (centavos)',type:'number'},
    {key:'previsao_termino',label:'Previsão',type:'date'}]},
  frentes_obra:{name:'Frentes',description:'Frentes associadas ao cadastro mestre de obras.',write:true,fields:[
    {key:'obra_id',label:'ID obra',type:'number',required:true},{key:'nome',label:'Frente',required:true},{key:'codigo',label:'Código'},
    {key:'status',label:'Situação'}]},
  itens_orcamentarios:{name:'Orçamento',description:'Quantidades e valores unitários canônicos; os totais são calculados.',write:true,fields:[
    {key:'obra_id',label:'ID obra',type:'number',required:true},{key:'frente_id',label:'ID frente',type:'number'},
    {key:'codigo',label:'Código'},{key:'descricao',label:'Descrição',required:true},{key:'unidade',label:'Unid.'},
    {key:'quantidade',label:'Qtd.',type:'number'},{key:'valor_unitario_centavos',label:'R$/unid. (centavos)',type:'number'}]},
  cronograma_etapas:{name:'Cronograma',description:'Etapas reais vinculadas à obra.',write:true,fields:[
    {key:'obra_id',label:'ID obra',type:'number',required:true},{key:'nome',label:'Etapa',required:true},
    {key:'percentual_previsto',label:'Previsto %',type:'number'},{key:'percentual_realizado',label:'Executado %',type:'number'},
    {key:'previsto_fim',label:'Conclusão',type:'date'},{key:'status',label:'Situação'}]},
  contas:{name:'Financeiro',description:'Único livro contábil canônico (despesas e receitas sem duplicar lançamentos).',write:true,fields:[
    {key:'obra_id',label:'ID obra',type:'number',required:true},{key:'tipo',label:'Tipo pagar/receber',required:true},
    {key:'descricao',label:'Descrição',required:true},{key:'valor_centavos',label:'Valor (centavos)',type:'number',required:true},
    {key:'competencia',label:'Competência'},{key:'emissao',label:'Emissão',type:'date'},
    {key:'vencimento',label:'Vencimento',type:'date'},{key:'status',label:'Situação'}]},
  rdos:{name:'RDOs',description:'Diário de obra: registro operacional de campo.',write:true,fields:[
    {key:'obra_id',label:'ID obra',type:'number',required:true},{key:'frente_id',label:'ID frente',type:'number'},
    {key:'data',label:'Data',type:'date',required:true},{key:'clima',label:'Clima'},{key:'status',label:'Situação'},
    {key:'atividades',label:'Atividades'}]},
  rdo_equipamentos:{name:'Equipamentos / RDO',description:'Apontamentos de equipamentos já vinculados a RDO; usados no custo/hora.',write:true,fields:[
    {key:'rdo_id',label:'ID RDO',type:'number',required:true},{key:'frente_id',label:'ID frente',type:'number'},
    {key:'nome',label:'Máquina',required:true},{key:'horas_uso',label:'Horas',type:'number'},
    {key:'custo_centavos',label:'Custo (centavos)',type:'number'}]},
  tarefas_obra:{name:'Tarefas',description:'Pendências associadas às obras.',write:true,fields:[
    {key:'obra_id',label:'ID obra',type:'number',required:true},{key:'titulo',label:'Tarefa',required:true},
    {key:'responsavel',label:'Responsável'},{key:'prazo',label:'Prazo',type:'date'},
    {key:'prioridade',label:'Prioridade'},{key:'status',label:'Situação'}]},
  medicoes:{name:'Medições',description:'Leitura das medições existentes; alterações exigem o serviço transacional, nunca CRUD genérico.',write:false,fields:[
    {key:'obra_id',label:'ID obra',type:'number'},{key:'numero',label:'Medição'},
    {key:'descricao',label:'Descrição'},{key:'valor_liquido_centavos',label:'Líquido (centavos)',type:'number'},
    {key:'status',label:'Situação'}]},
  categorias_financeiras:{name:'Categorias',description:'Categorias financeiras existentes na fonte canônica.',write:false,fields:[
    {key:'nome',label:'Categoria'},{key:'natureza',label:'Natureza'},{key:'grupo_dre',label:'Grupo DRE'}]}
};
const tableOrder=['obras','frentes_obra','itens_orcamentarios','cronograma_etapas','contas','rdos','rdo_equipamentos','tarefas_obra','medicoes','categorias_financeiras'] as const;
function cast(field:Field,value:string) {
  if(field.type==='number') {
    if(value.trim()==='')return null;
    const num=Number(value);
    if(!Number.isFinite(num))throw new Error(field.label+' deve ser um número válido.');
    if(field.key.endsWith('_centavos')&&!Number.isSafeInteger(num))throw new Error(field.label+' deve ser inteiro, em centavos.');
    return num;
  }
  return value.trim()||null;
}
export function CanonicalWorkspace({snapshot,onRefresh}:{
  snapshot:CanonicalSnapshot; onRefresh:()=>Promise<void>
}) {
  const [table,setTable]=useState<keyof CanonicalSnapshot>('obras');
  const [editing,setEditing]=useState<number|'new'|null>(null);
  const [draft,setDraft]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const schema=grid[table];const records=snapshot[table];
  const filtered=useMemo(()=>records.filter(r=>Object.values(r).some(x=>String(x??'').toLowerCase().includes(search.toLowerCase()))),[records,search]);
  function begin(record?:CanonicalRecord) {
    setEditing(record?.id??'new');setError('');setFeedback('');
    setDraft(Object.fromEntries(schema.fields.map(f=>[f.key,record?.[f.key]==null?'':String(record[f.key])])));
  }
  function fieldValue(field:Field) {
    const val=draft[field.key]??'';
    if(field.required&&!val.trim())throw new Error('Preencha '+field.label);
    return cast(field,val);
  }
  async function submit() {
    setSaving(true);setError('');setFeedback('');
    try {
      const data=Object.fromEntries(schema.fields.map(f=>[f.key,fieldValue(f)]));
      const isNew=editing==='new';
      const rec=isNew?null:records.find(r=>r.id===editing);
      if(!isNew&&!rec)throw new Error('Registro não encontrado. Atualize os dados.');
      if(rec&&!Number.isSafeInteger(Number(rec.revision)))throw new Error('O servidor não retornou revisão; edição bloqueada para impedir sobrescrita.');
      const path='/api/canonical/'+table+(isNew?'':'/'+rec!.id);
      const response=await fetch(path,{method:isNew?'POST':'PUT',headers:{'content-type':'application/json'},
        body:JSON.stringify(isNew?data:{expectedRevision:rec!.revision,data})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||result.error||'Falha ao salvar no servidor canônico.');
      await onRefresh();setEditing(null);setFeedback('Registro confirmado no serviço canônico.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o registro.');}
    finally{setSaving(false);}
  }
  async function remove(row:CanonicalRecord) {
    if(!window.confirm('Excluir o registro #'+row.id+' da fonte canônica? Esta operação será auditada pelo sistema de origem.'))return;
    setSaving(true);setError('');setFeedback('');
    try{
      if(!Number.isSafeInteger(Number(row.revision)))throw new Error('Revisão de concorrência ausente.');
      const response=await fetch('/api/canonical/'+table+'/'+row.id+'?expectedRevision='+row.revision,{method:'DELETE'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||result.error);
      await onRefresh();setEditing(null);setFeedback('Registro excluído pelo serviço canônico.');
    }catch(e){setError(e instanceof Error?e.message:'Falha ao excluir.');}
    finally{setSaving(false);}
  }
  return <section className="canonical-workspace">
    <div className="page-intro"><div><span className="section-kicker">FONTE ÚNICA DE DADOS</span><h2>Operação canônica</h2><p>As informações são lidas e gravadas na estrutura do Obra na Mão. Os indicadores consultam esses mesmos registros.</p></div><div className="intro-icon"><Database size={30}/></div></div>
    <div className="info-banner"><Database size={18}/><span>Conectado ao servidor central do Obra na Mão. Não há segundo banco no BI. Editar aqui significa alterar a fonte real, respeitando as permissões e revisões do servidor.</span></div>
    <div className="canonical-tabs" role="tablist" aria-label="Módulos canônicos">
      {tableOrder.map(key=><button type="button" role="tab" aria-selected={table===key} key={key}
        className={'canonical-tab '+(table===key?'selected':'')}
        onClick={()=>{setTable(key);setEditing(null);setSearch('');setError('');setFeedback('')}}>{grid[key].name}<span>{snapshot[key].length}</span></button>)}
    </div>
    <div className="panel">
      <div className="panel-heading">
        <div><h3>{schema.name}</h3><p>{schema.description}</p></div>
        <div className="canonical-actions">
          <input aria-label={'Buscar em '+schema.name} placeholder="Filtrar registros" value={search} onChange={e=>setSearch(e.target.value)}/>
          <button className="btn btn-outline btn-small" onClick={()=>void onRefresh()}><RefreshCw size={15}/> Atualizar</button>
          {schema.write&&<button className="btn btn-primary btn-small" onClick={()=>begin()}><Plus size={15}/> Novo</button>}
        </div>
      </div>
      {error&&<div className="import-error" role="alert"><CircleAlert size={17}/>{error}</div>}
      {feedback&&<div className="import-notice" role="status"><Check size={17}/>{feedback}</div>}
      <div className="table-scroll">
        <table className="data-table canonical-grid">
          <thead><tr><th>ID</th>{schema.fields.map(field=><th key={field.key}>{field.label}</th>)}<th>AÇÕES</th></tr></thead>
          <tbody>
            {editing==='new'&&<tr className="canonical-editing"><td>Novo</td>{schema.fields.map(field=><td key={field.key}><input aria-label={field.label} type={field.type==='date'?'date':field.type==='number'?'number':'text'} step={field.type==='number'?'any':undefined} value={draft[field.key]??''} onChange={e=>setDraft(old=>({...old,[field.key]:e.target.value}))}/></td>)}<td><button className="btn btn-small btn-primary" disabled={saving} onClick={()=>void submit()}><Save size={14}/> Salvar</button><button className="btn btn-small btn-outline" onClick={()=>setEditing(null)}><X size={14}/></button></td></tr>}
            {filtered.map(row=><tr key={row.id} className={editing===row.id?'canonical-editing':''}><td><strong>#{row.id}</strong></td>
              {schema.fields.map(field=><td key={field.key}>{editing===row.id?<input aria-label={field.label+' #'+row.id} type={field.type==='date'?'date':field.type==='number'?'number':'text'} step={field.type==='number'?'any':undefined} value={draft[field.key]??''} onChange={e=>setDraft(old=>({...old,[field.key]:e.target.value}))}/>:<span>{String(row[field.key]??'—')}</span>}</td>)}
              <td className="canonical-row-actions">{schema.write?(editing===row.id?<><button className="btn btn-small btn-primary" disabled={saving} onClick={()=>void submit()}><Save size={14}/> Salvar</button><button className="btn btn-small btn-outline" onClick={()=>setEditing(null)} aria-label="Cancelar"><X size={14}/></button></>:<><button className="icon-button" onClick={()=>begin(row)} aria-label={'Editar '+row.id}><Pencil size={16}/></button><button className="icon-button" onClick={()=>void remove(row)} aria-label={'Excluir '+row.id}><Trash2 size={16}/></button></>):<span>Somente leitura</span>}</td>
            </tr>)}
            {!filtered.length&&editing!=='new'&&<tr><td colSpan={schema.fields.length+2}>Nenhum registro canônico encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="canonical-note"><FileSpreadsheet size={14}/> Grade operacional ligada às mesmas tabelas consumidas pelos indicadores. Campos em centavos seguem o contrato do Obra na Mão; medições são somente leitura para preservar sua operação transacional.</p>
    </div>
  </section>;
}
