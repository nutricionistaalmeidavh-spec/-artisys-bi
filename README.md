# ArtiSys BI · Demonstração para Engenharia

Painel gerencial independente, construído em React + TypeScript, com dados **100% fictícios** para apresentar à Opuz Engenharia como a ArtiSys pode transformar planilhas de obras e equipamentos em indicadores de negócio.

> **Estado atual: protótipo navegável de front-end.** Não é uma implantação da Opuz, não usa números reais de clientes e ainda não possui banco, login, API nem sincronização. Esses módulos serão definidos depois da reunião comercial e da avaliação das planilhas do cliente.

## Executar localmente

Pré-requisitos: Node.js 22+ e npm.

\`\`\`bash
git clone https://github.com/nutricionistaalmeidavh-spec/-artisys-bi.git
cd -- -artisys-bi
npm install
npm run dev
\`\`\`

Abra o endereço local informado pelo Vite (geralmente http://localhost:5173).

Para validar o código:

\`\`\`bash
npm test
npm run build
npm run preview
\`\`\`

A versão construída fica em \`dist/\` e pode ser servida por qualquer servidor HTTP estático, inclusive em infraestrutura própria.

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

- \`obra\` deve ser um nome, código ou ID de obra existente na amostra.
- \`data\` aceita AAAA-MM-DD ou DD/MM/AAAA.
- \`categoria\` aceita Máquinas, Equipe, Materiais ou Terceiros.
- \`valor\` deve ser positivo e pode usar separador decimal brasileiro.
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

\`npm test\` cobre coerência financeira, filtros de obra/período, categorias, custo/hora, parse CSV, validação de arquivos e proteção básica contra fórmulas maliciosas na exportação CSV. \`npm run build\` exige checagem TypeScript e build Vite.

## Observação comercial

O ambiente é um exemplo ilustrativo para reunião de descoberta. Qualquer dashboard com informações da Opuz exige alinhamento de escopo, integração autorizada e revisão de segurança/privacidade antes do uso em produção.

© 2026 ArtiSys. Código desta demonstração disponibilizado sob licença MIT.
