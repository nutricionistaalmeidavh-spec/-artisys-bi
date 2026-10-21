# ArtiSys BI · Visão gerencial conectável ao Obra na Mão

Painel gerencial independente, construído em React + TypeScript, com dados **100% fictícios** para apresentar à Opuz Engenharia como a ArtiSys pode transformar planilhas de obras e equipamentos em indicadores de negócio.

> **Dois modos distintos:** a prévia pública no GitHub Pages continua usando dados 100% fictícios. Ao executar o **gateway canônico local**, o BI lê e grava na API autenticada do Obra na Mão: não mantém outro banco, não replica as contas em planilhas e não exibe números fictícios misturados aos do servidor. A conexão depende de uma instalação já operante e autorizada do Obra na Mão.

## Executar localmente

Pré-requisitos: Node.js 22+ e npm.

```bash
git clone https://github.com/nutricionistaalmeidavh-spec/-artisys-bi.git
cd -- -artisys-bi
npm install
npm run dev
```

Abra o endereço local informado pelo Vite (geralmente http://localhost:5173).

Para validar o código:

```bash
npm test
npm run build
npm run preview
```

A versão construída fica em `dist/` e pode ser servida por qualquer servidor HTTP estático, inclusive em infraestrutura própria.

## Telas existentes

- **Visão geral:** KPIs calculados do livro de lançamentos, evolução de custos, composição das despesas, situação de obras e alertas simulados.
- **Obras:** orçamento, custo registrado, planejado x executado, status, previsão de entrega e filtros.
- **Máquinas e frota:** disponibilidade, horas, combustível, manutenção e custo operacional por hora de equipamento.
- **Financeiro:** despesas por período/categoria, lançamentos com origem, medição fictícia e exportação CSV.
- **Importação:** abertura de arquivos CSV ou XLSX, mapeamento por cabeçalho, validação, prévia, aplicação na sessão e download de modelo CSV.

Filtros por obra e período atualizam os lançamentos e gráficos derivados. O recorte temporal de 30/90 dias usa **21/10/2026** como data-base congelada para esta demonstração.

## Importar dados

O modelo tem as colunas:

| obra | data | categoria | descricao | valor |
|---|---|---|---|---|
| Terraplenagem Industrial | 2026-10-20 | Máquinas | Diesel | 1500,50 |

- `obra` deve ser um nome, código ou ID de obra existente na amostra.
- `data` aceita AAAA-MM-DD ou DD/MM/AAAA.
- `categoria` aceita Máquinas, Equipe, Materiais ou Terceiros.
- `valor` deve ser positivo e pode usar separador decimal brasileiro.
- CSV pode usar ponto e vírgula; campos entre aspas são respeitados.
- XLSX usa ExcelJS (código open source, processado no navegador).

**Importante:** os dados importados são adicionados aos fictícios somente na memória do navegador. Recarregar a página elimina a importação. Não há transmissão de planilhas para servidor nesta fase.

## Código reutilizado / referências

O projeto é **independente**, mas seus padrões funcionais foram analisados com base em módulos existentes da ArtiSys:

- [OBRANAMAOCOMERCIAL](https://github.com/nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL): conceitos de Obra 360, medições, orçamento e painel financeiro.
- [SistemasNichadosAgroFrota](https://github.com/nutricionistaalmeidavh-spec/SistemasNichadosAgroFrota): custo/hora, horímetro, combustível, status de máquinas e manutenção.
- [frontEnds](https://github.com/nutricionistaalmeidavh-spec/frontEnds): convenções de shell administrativo e interface React.
- [utilidades](https://github.com/nutricionistaalmeidavh-spec/utilidades): contratos de dashboard, relatório e importação.

Os componentes e agregações usados nesta demonstração foram implementados de forma independente; não há dependência de tempo de execução ou cópia integral de outro sistema.

## Arquitetura e custos

- React / TypeScript / Vite / Recharts / Lucide / ExcelJS.
- Bibliotecas open source e hospedagem self-hosted: **R$ 0 em licenças obrigatórias**.
- Sem Power BI, Azure, Google Gemini, API externa, chave paga ou fontes remotas.
- Próxima etapa potencial: serviço backend Node.js, SQLite local para instalação leve ou PostgreSQL para uso multiusuário centralizado. **Ainda não estão implementados.**

## Critérios de aceitação

`npm test` cobre coerência financeira, filtros de obra/período, categorias, custo/hora, parse CSV, validação de arquivos e proteção básica contra fórmulas maliciosas na exportação CSV. `npm run build` exige checagem TypeScript e build Vite.

## Observação comercial

O ambiente é um exemplo ilustrativo para reunião de descoberta. Qualquer dashboard com informações da Opuz exige alinhamento de escopo, integração autorizada e revisão de segurança/privacidade antes do uso em produção.

© 2026 ArtiSys. Código desta demonstração disponibilizado sob licença MIT.

## Prévia pública pelo GitHub Pages (sem Vercel)

O projeto já possui o workflow `.github/workflows/ci.yml`, que executa testes e build e, na branch `main`, envia a pasta `dist/` para o GitHub Pages somente após validação.

**Configuração única, feita pelo administrador do repositório:** abra [Settings → Pages](https://github.com/nutricionistaalmeidavh-spec/-artisys-bi/settings/pages), em **Build and deployment → Source**, selecione **GitHub Actions**. Essa opção precisa ser habilitada na interface do GitHub: o token padrão dos workflows não pode habilitar Pages num repositório em que o serviço ainda esteja desativado.

Em seguida, acesse [Actions](https://github.com/nutricionistaalmeidavh-spec/-artisys-bi/actions/workflows/ci.yml), escolha **Run workflow** com a branch `main` e aguarde os jobs `Testes e build` e `Publicar no GitHub Pages` ficarem verdes.

Endereço esperado **somente após o deployment confirmado**:

`https://nutricionistaalmeidavh-spec.github.io/-artisys-bi/`

Não há necessidade de token, domínio personalizado, Vercel ou qualquer plano pago.


## Modo canônico — usando o sistema já existente

O código foi conectado **ao contrato real de `apps/lan-server/src/server.mjs` do repositório `OBRANAMAOCOMERCIAL`**, não a um banco criado para o BI. No servidor original, `WorksService` consolida obras, frentes, orçamentos, contas, cronograma e medições, enquanto os módulos `MeasurementService` e `FinanceService` cuidam de operações sensíveis. O modelo de frota/maquinário em `SistemasNichadosAgroFrota` oferece regras de custo/hora, horímetro e manutenção; a API central de Obras expõe os apontamentos de máquinas nos RDOs. **Não presumimos que o servidor de frotas tenha uma API HTTP compatível enquanto essa integração não estiver definida.**

### Inicialização de um ambiente realmente conectado

1. Use uma instalação **própria e autorizada** do servidor LAN do Obra na Mão, com empresa, permissões e dispositivo já configurados. Não use credenciais de clientes sem permissão.
2. No terminal local, defina as variáveis apenas para o processo:
   ```bash
   export OBRA_LAN_API_URL="http://127.0.0.1:PORTA_DO_SERVIDOR_LAN"
   export OBRA_LAN_DEVICE_TOKEN="TOKEN_DO_DISPOSITIVO_AUTORIZADO"
   npm install
   npm test
   npm run build
   npm run serve:canonical
   ```
3. Abra `http://127.0.0.1:4175`. O gateway usa o Bearer Token **no servidor local**, nunca no bundle JavaScript nem no localStorage. A UI mostra **CANÔNICO** quando a leitura integral da API é validada.
4. Em **Registros canônicos**, é possível listar, pesquisar, criar, editar e excluir (com revisão otimista) registros dos módulos autorizados: obras, frentes, orçamento, cronograma, contas, RDOs, máquinas apontadas no RDO e tarefas. **Medições** e **categorias financeiras** ficam em modo leitura; medição exige o fluxo transacional de medição do sistema original. Erros de acesso, revisões ou validações são exibidos; não há fallback para registros simulados dentro da operação canônica.

### Regras de integridade

- `obras`, `itens_orcamentarios`, `contas`, `medicoes`, `cronograma_etapas`, `rdos` e `rdo_equipamentos` são lidos da mesma API. O BI **não cria outra fonte da verdade**.
- Valores financeiros permanecem em centavos na origem; a conversão para reais ocorre somente na projeção de apresentação.
- **A pagar** é custo, **a receber** é receita; contas canceladas não entram nas despesas. O custo do equipamento registrado em RDO **não é somado novamente** à conta financeira. O projeto evita duplicação de custos.
- Revisões são verificadas pelo serviço LAN em operações de edição ou exclusão. Os fluxos compostos de medição, contratos e compras **não** passam por CRUD genérico.
- A grade usa os campos canônicos, incluindo IDs de obra/frente/RDO, e grava na API de origem. As regras de identidade, autorização e validação ficam com o próprio servidor central.
- O servidor local vincula a interface a `127.0.0.1`; não o exponha na internet. Para acesso remoto/multiusuário, é preciso configurar um host seguro com controle de acesso. Esta integração não converte o GitHub Pages em backend.

### Diferença entre demonstração e sistema de gestão

- **No GitHub Pages:** painel público **somente demonstrativo**, sem autenticação e sem acesso ao servidor LAN. A aba de registros explica a necessidade de conexão.
- **No gateway local:** os cartões, tabelas, filtros e gráficos deixam de usar o dataset fictício e passam a consumir as entidades canônicas. O menu de operação permite escrita conforme permissões.
- Importação CSV/XLSX continua como ferramenta de demonstração no modo público. Quando conectado, **não** envia uma importação temporária para o painel: deve-se usar o **Importador Universal transacional já presente no Obra na Mão**, para evitar duas fontes conflitantes.
- Horímetro e manutenção detalhada do aplicativo **SistemasNichadosAgroFrota** dependem de conectar sua persistência autorizada; a primeira conexão Obra na Mão usa somente os apontamentos canônicos de equipamento/RDO, sem inventar categorias de diesel/manutenção que esse contrato não fornece.

### Repositórios realmente examinados

- `OBRANAMAOCOMERCIAL/apps/lan-server/src/repository.mjs` — campos e entidades aceitos
- `OBRANAMAOCOMERCIAL/apps/lan-server/src/server.mjs` — rotas, autenticação e bloqueios de mutação
- `OBRANAMAOCOMERCIAL/apps/lan-server/src/measurement-service.mjs` — medição composta com idempotência e concorrência
- `OBRANAMAOCOMERCIAL/apps/desktop/electron/services/works-service.cjs` — agregados da Obra 360
- `SistemasNichadosAgroFrota/apps/agro-maquinas/src/finance.js` — custo operacional/hora
- `SistemasNichadosAgroFrota/packages/vertical-persistence/src/repository.js` — repositório versionado de entidades
- `utilidades/modules/artisys-importer/src/index.mjs` — importação validada com plano e rollback

As fontes de domínio continuam nos repositórios originais: este projeto é um **consumidor/adaptador**, não uma cópia concorrente da lógica transacional.
