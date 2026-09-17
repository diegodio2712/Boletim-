# Boletim+

**Ferramentas para o RCO** · Versão 0.9.2 · Extensão para Google Chrome

> Extensão independente, criada por um professor da rede. **Não tem vínculo com a SEED-PR** nem com o RCO oficial.

Extensão para o **Registro de Classe Online (RCO)** da rede estadual do Paraná. Na página de **Avaliação**, ela colore as somatórias e, no 3º trimestre, mostra na própria tabela do RCO as notas do 1º e do 2º trimestre, a meta de cada estudante no 3º e a média anual.

A extensão **só lê dados**. Ela não altera, não salva e não envia nenhuma nota ao RCO.

Tudo pode ser ligado e desligado num **painel de opções**, que abre ao clicar no ícone da extensão.

---

## O que a extensão faz

### 0. Painel de opções

Clique no ícone do Boletim+ na barra do Chrome (as barrinhas azuis com um +). Se não aparecer, clique no ícone de peça 🧩 e fixe a extensão.

| Opção | O que faz | Padrão |
|---|---|---|
| **Cores nas notas** | Verde a partir de 6,0 e vermelho abaixo, em todos os trimestres (também controla as cores da coluna Meta) | Ligada |
| **Previsão no 3º trimestre** | Mostra o botão "Mostrar 1º e 2º trimestre" acima da tabela | Ligada |
| ↳ **Abrir já ligada** | O botão começa ligado ao abrir a página | Desligada |
| ↳ **Esconder avaliações** | Oculta AV1, AV2 e recuperações no modo ligado | Ligada |
| ↳ **Coluna Meta no 3º Tri** | Mostra ou esconde essa coluna | Ligada |
| ↳ **Coluna Média Anual** | Mostra ou esconde essa coluna | Ligada |
| ↳ **Números em negrito** | Deixa os números das colunas em negrito | Ligada |

- **As mudanças valem na hora**, na página do RCO que estiver aberta, sem recarregar.
- **As opções com ↳** só ficam disponíveis com a previsão ligada.
- **Com a previsão desligada**, a extensão não faz nenhuma consulta extra ao RCO.
- **Restaurar padrão** volta tudo para a tabela acima.
- **As escolhas ficam salvas** na sua conta do Chrome e valem em todos os computadores em que você estiver conectado.


### 1. Cores nas somatórias

Em qualquer página de avaliação (1º, 2º ou 3º trimestre), o número da coluna **Somatória** ganha cor:

| Cor | Quando |
|---|---|
| 🟢 Verde | 6,0 ou mais |
| 🔴 Vermelho | menos de 6,0 |
| Sem cor | sem nota (`-`) |

Só a cor do texto muda. O restante do visual do RCO (fundos, fontes e bordas) continua igual.

No 3º trimestre, a somatória é parcial, então fica vermelha enquanto não chega a 6,0.

### 2. Botão "Mostrar 1º e 2º trimestre"

Na página de avaliação do **3º trimestre**, aparece um botão liga/desliga logo acima da tabela.

- **Ele começa desligado** (a menos que a opção *Abrir já ligada* esteja ativa). Ao abrir ou recarregar a página, a tabela aparece exatamente como o RCO a mostra, com as colunas de avaliação e os lápis de edição.
- **Ligado**, a mesma tabela do RCO passa a mostrar:

| Nº | Nome | Situação | 1º Tri | 2º Tri | 3º Tri | Meta no 3º Tri | Média Anual |
|---|---|---|---|---|---|---|---|

Nesse modo:
- as colunas de avaliação (AV1, AV2, recuperações etc.) ficam escondidas, se a opção *Esconder avaliações* estiver ativa;
- a coluna **Somatória** do RCO aparece com o título **3º Tri**;
- **1º Tri** e **2º Tri** são adicionadas antes dela;
- **Meta no 3º Tri** e **Média Anual** são adicionadas depois dela.

Todos os números dessas cinco colunas aparecem em **negrito** (opção *Números em negrito*). As colunas Meta e Média Anual podem ser escondidas no painel.

Desligando o botão, a tabela volta ao normal na hora.

### 3. As colunas do modo ligado

| Coluna | O que mostra | Cor |
|---|---|---|
| **1º Tri** | Somatória final do 1º trimestre | 🟢 ≥ 6,0 · 🔴 < 6,0 |
| **2º Tri** | Somatória final do 2º trimestre | 🟢 ≥ 6,0 · 🔴 < 6,0 |
| **3º Tri** | Somatória atual do 3º trimestre (a coluna original do RCO) | 🟢 ≥ 6,0 · 🔴 < 6,0 |
| **Meta no 3º Tri** | Quanto o estudante precisa somar no 3º trimestre para passar | 🟢 já atingiu · 🔴 acima de 10 · sem cor: em aberto |
| **Média Anual** | Média dos três trimestres, usando a nota atual do 3º | 🟢 ≥ 6,0 · 🔴 < 6,0 |

**Dicas ao passar o mouse:**
- **Meta no 3º Tri** mostra quanto ainda falta, por exemplo *"Faltam 1.5 (já tem 5.0 no 3º)"*.
- **Média Anual** mostra a conta feita, por exemplo *"(4.0 + 7.5 + 5.0) ÷ 3"*.

**Casos especiais:**
- **Estudantes com situação** (por exemplo, *Transf*) e sem nota no 3º trimestre aparecem com `—` em Meta e Média, e a situação aparece ao passar o mouse.
- **Estudantes sem nota** no 1º ou no 2º trimestre também aparecem com `—`.
- **Enquanto as notas carregam**, as células mostram `…`.

---

## Como os cálculos são feitos

A aprovação considera **média anual 6,0**, que equivale a **18,0 pontos na soma dos três trimestres**.

```
Média Anual    = (1º Tri + 2º Tri + 3º Tri) ÷ 3
Meta no 3º Tri = 18,0 − (1º Tri + 2º Tri)          (nunca menor que 0)
Falta          = Meta no 3º Tri − 3º Tri atual     (mostrado ao passar o mouse)
```

**Leitura da Meta:**
- **Meta ≤ 3º Tri atual:** o estudante já garantiu a média (🟢).
- **Meta > 10,0:** não é possível alcançar só com o 3º trimestre (🔴).
- **Caso contrário:** a meta ainda está em aberto.

**Arredondamento:** os valores são exibidos com uma casa decimal e usam as somatórias exatamente como o RCO as informa. Se o RCO arredondar a média final de outro jeito, pode haver diferença de 0,1 em casos de fronteira.

**Personalização:** os critérios ficam no início do `content.js`:

```js
const CONFIG = {
  mediaAprovacao: 6.0,
  numTrimestres: 3,
  notaMaxTrimestre: 10.0,
  cacheMinutos: 5,
  janelaBusca: 12
};
```

---

## Como funciona por dentro

### De onde vêm os dados

Ao abrir a avaliação de uma turma, o RCO consulta a API da SEED:

```
GET https://apigateway-educacao.paas.pr.gov.br/seed/rcdig/estadual/v1/classe/v1/relatorios/avaliacaoParcialAlunos
    ?codClasse=<turma/disciplina>
    &codPeriodoAvaliacao=<período>
```

Essa consulta exige dois cabeçalhos, `Authorization: Bearer <token de login>` e `consumerid: RCDIGWEB`.

A resposta traz:
- **no corpo:** uma lista de estudantes, com `numChamada`, `nome`, `descrAbrevSituacaoMatricula`, as notas de cada avaliação (`nota<código>`) e a somatória (`final`);
- **no cabeçalho `fields`:** os rótulos das colunas, como `"AV1\n(4.0)"` e `"Somatória"`.

### Passo a passo

1. **Observa a consulta do RCO.** O `injetado.js` roda dentro da página e percebe quando o RCO faz a consulta `avaliacaoParcialAlunos`, seja por `fetch` ou por `XMLHttpRequest`. Ele guarda o endereço e os cabeçalhos dessa consulta.
2. **Descobre os trimestres da turma.** O `content.js` pede ao `injetado.js` que repita a consulta para os códigos de período próximos ao atual (do código atual −12 até +3). Os períodos que retornam estudantes são os trimestres da turma. Em 2026, por exemplo, são 9, 10 e 11, ou seja, 1º, 2º e 3º.
3. **Identifica o 3º trimestre.** Se o período aberto é o último dos três, a página é do 3º trimestre. Se a turma não tiver exatamente três períodos, a extensão usa o texto "3º Trimestre" da tela e os dois períodos anteriores.
4. **Lê as notas.** Do 1º e do 2º trimestre, usa o campo `final` (somatória). Do 3º, usa a própria consulta que o RCO acabou de fazer.
5. **Monta as colunas na tabela.** A tabela do RCO é localizada pelos títulos "Nome" e "Somatória", e as colunas extras são inseridas nela.
6. **Mantém tudo sincronizado.** Se o RCO redesenhar a tabela (depois de salvar uma nota, trocar de aba ou ordenar), as colunas e as cores são recolocadas automaticamente. Se o RCO fizer uma nova consulta, os dados são atualizados.

### Cache

- **Períodos da turma:** a descoberta é guardada por 30 minutos.
- **Notas do 1º e 2º trimestre:** são guardadas por 5 minutos.
- **Escopo:** o cache vive só na aba aberta. As notas nunca são gravadas no computador; ao recarregar a página, tudo é buscado de novo.

---

## Privacidade e segurança

- **O login não sai da página.** O token e o `consumerid` ficam apenas no `injetado.js`, que roda no próprio RCO. O `content.js` nunca os recebe.
- **As consultas são repetidas só no mesmo endereço.** A extensão só repete a consulta `avaliacaoParcialAlunos`, no mesmo servidor e para a mesma turma, trocando apenas o `codPeriodoAvaliacao`.
- **Nada é enviado para fora.** Não há servidores externos, rastreamento nem coleta de dados.
- **Só as preferências são gravadas.** O painel salva apenas as escolhas de ligar e desligar (`chrome.storage.sync`). Nenhuma nota, nome ou dado do RCO é guardado.
- **Nada é escrito no RCO.** A extensão faz apenas consultas de leitura (`GET`), as mesmas que o próprio RCO faz.
- **Permissões mínimas.** A extensão só roda em `https://rco.paas.pr.gov.br/*` e pede apenas `storage`, para guardar as preferências do painel.

---

## Instalação

1. Extraia o arquivo `.zip`.
2. No Chrome, abra `chrome://extensions`.
3. Ative o **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação** e escolha a pasta que contém o `manifest.json`.
5. Confira se o card mostra **Boletim+ – ferramentas para o RCO 0.9.2**.
6. Clique no ícone de peça 🧩 da barra do Chrome e fixe a extensão, para o painel ficar sempre à mão.
7. Abra ou recarregue o RCO com **F5**.

**Requisito:** Chrome 111 ou mais recente.

**Para atualizar:** substitua os arquivos na mesma pasta e clique no ícone de **recarregar** no card da extensão. Depois, dê F5 no RCO.

---

## Arquivos

| Arquivo | Função |
|---|---|
| `manifest.json` | Configuração da extensão (Manifest V3) |
| `injetado.js` | Roda no contexto da página (`world: MAIN`): observa a consulta de notas do RCO e repete a consulta para outros trimestres, com o login da sessão |
| `content.js` | Descobre os trimestres, calcula as colunas, insere o botão e as colunas na tabela, aplica as cores e segue as opções do painel |
| `popup.html` / `popup.js` | Painel de opções que abre ao clicar no ícone da extensão |
| `icones/` | Ícones da extensão (16, 32, 48 e 128 px) |
| `README.md` | Este documento |

---

## Limitações conhecidas

- **Depende do formato atual do RCO.** A extensão foi feita a partir do comportamento do RCO em setembro de 2026: a consulta `avaliacaoParcialAlunos`, o cabeçalho `fields` e a tabela com as colunas "Nome" e "Somatória". Mudanças no sistema podem exigir ajustes.
- **Pressupõe três trimestres.** Turmas com outra organização (semestral, por exemplo) só funcionam se a tela indicar "3º Trimestre".
- **Estudantes são associados pelo nome** entre os trimestres. Um nome escrito de forma diferente entre os trimestres pode não ser encontrado.
- **A média anual usa a nota parcial do 3º trimestre.** Ela vai subindo conforme as avaliações são lançadas.
- **Recuperações não entram na meta.** A extensão não considera recuperações futuras nem regras especiais (conselho de classe, recuperação final).
- **A sessão pode expirar.** Se o login do RCO expirar, a busca falha. Nesse caso aparece um aviso ao lado do botão; basta recarregar a página.

---

## Solução de problemas

| Sintoma | O que fazer |
|---|---|
| O botão não aparece | Confira no painel se **Previsão no 3º trimestre** está ligada, se a página é do **3º trimestre** e se o card da extensão mostra a versão 0.9.2. Recarregue o RCO. |
| Aparece um aviso ao lado do botão | Recarregue a página. Se o aviso falar em sessão expirada, entre no RCO de novo. |
| As colunas de avaliação não somem no modo ligado | Confira no painel se **Esconder avaliações** está ligada. Se estiver, o cabeçalho do RCO pode ter mudado. Tire um print só do cabeçalho da tabela. |
| Nada funciona | Abra o Console (F12), recarregue e procure mensagens com o prefixo `[Boletim+]`. |

---

## Histórico de versões

| Versão | Mudanças |
|---|---|
| **0.9.2** | Novo nome: **Boletim+ – ferramentas para o RCO**. Ícone com o sinal de +. Aviso de extensão independente. |
| 0.9.1 | Correção: com *Cores nas notas* desligada, a coluna Meta no 3º Tri também fica sem cor. |
| 0.9.0 | Painel de opções no ícone da extensão, com liga/desliga para cores, previsão, abrir já ligada, esconder avaliações, colunas Meta e Média Anual e negrito. Ícones próprios. |
| 0.8.1 | Números das colunas 1º Tri, 2º Tri, 3º Tri, Meta no 3º Tri e Média Anual em negrito. Correção: o título "Somatória" agora é trocado de verdade por "3º Tri", então sai certo ao copiar a tabela. |
| 0.8.0 | Botão começa sempre desligado. Colunas renomeadas para 1º Tri, 2º Tri, 3º Tri, Meta no 3º Tri e Média Anual. Nova coluna Média Anual. Retirada a frase informativa. Mantidas as cores originais do RCO, exceto verde/vermelho nas notas. |
| 0.7.0 | Colunas do 1º e 2º trimestre dentro da própria tabela do RCO, com botão liga/desliga. Volta das cores nas somatórias. |
| 0.6.0 | Reescrita com base na API real do RCO (`avaliacaoParcialAlunos`, `codPeriodoAvaliacao`). |
| 0.5.0 | Tentativa de busca automática por detecção genérica da API. |
| 0.4.0 | Quadro de resumo anual com notas salvas ao visitar cada trimestre. |
| 0.3.1 | Versão original: notas editáveis e somatória recalculada com cores. |
