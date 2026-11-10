// js/telas/cliente360.js — visão completa de um cliente da carteira.

import * as estado from "../estado.js";
import * as f from "../formato.js";
import { irPara, parametroRota } from "../navegacao.js";
import { nivelServicoAberto, totalPulso } from "../indicadores.js";
import { barraEmpilhada, etiqueta, h, legenda, pilulas, selecao, trocar } from "../ui.js";
import { blocoDetalhamento } from "./cliente360-detalhe.js";

export function renderizarCliente360(conteudo) {
  const d = estado.dados();
  const cli = parametroRota("cli");
  const todos = estado.clientesAtivos();
  if (!todos.length) {
    trocar(conteudo, h("p", { class: "carregando", text: "Nenhum cliente ativo na roteirização." }));
    return;
  }
  // Cliente pedido no link sempre abre; os botões mostram os clientes do CS escolhido.
  const pedido = todos.find((x) => x.cli === cli);
  const doCs = estado.clientesDoCs();
  const clientes = doCs.length ? doCs : todos;
  const c = pedido || clientes[0];
  const opcoes = clientes.some((x) => x.cli === c.cli) ? clientes : [c, ...clientes];
  const opcoesCs = [["", "Carteira geral"], ...estado.responsaveis().map((r) => [r, r])];

  trocar(conteudo,
    h("div", { class: "card__topo" },
      h("a", { href: "#/carteira", text: "← Carteira" }),
      h("span", { class: "fonte-dados", text: `Fonte: disktrans_gold (Microsoft Fabric) · extraído em ${d.atualizado}` })),
    h("div", { class: "card__topo" },
      h("div", { class: "filtro-carteira" },
        selecao("CS responsável", opcoesCs, estado.filtroCarteira().cs, (v) => {
          estado.escolherCs(v);
          const primeiro = estado.clientesDoCs()[0];
          irPara("cliente360", primeiro ? `cli=${primeiro.cli}` : "");
        }, "campo filtro-carteira__cs"),
        pilulas("Cliente", opcoes.map((x) => [x.cli, x.nome]), c.cli, (v) => irPara("cliente360", `cli=${v}`))),
      h("a", { class: "botao botao--primario", href: `#/acionamentos?novo=${c.cli}`, text: "+ Novo acionamento" })),
    blocoResumo(c),
    blocoOperacoes(c),
    blocoJornada(c),
    blocoMensal(c),
    blocoDetalhamento(c));
}

function blocoResumo(c) {
  const ab = c.abertos;
  const tn = ab.troca.n + ab.novo.n;
  const tl = ab.troca.late + ab.novo.late;
  const nsAberto = nivelServicoAberto(tn, tl);
  const at = c.atual.todas;
  const an = c.anterior.todas;
  const ns90 = 1 - at.late / Math.max(1, at.n);
  const ns90a = 1 - an.late / Math.max(1, an.n);
  const enc = totalPulso(c.pulso.enc);
  const dev = totalPulso(c.pulso.dev);
  const fr = c.frota;
  const partes = [[fr.manual, "manuais"], [fr.eletrica, "elétricas"], [fr.empilhadeira, "empilhadeiras"]].filter(([v]) => v).map(([v, t]) => `${f.numero(v)} ${t}`);
  const portal = c.atual.troca.n ? Math.round((c.portalTroca / c.atual.troca.n) * 100) : 0;

  const mosaico = [
    ["Frota locada", f.numero(fr.total), partes.join(" · ")],
    ["Lojas com frota", f.numero(c.lojasFrota), `de ${f.numero(c.lojas)} cadastradas · ${c.ufs} UFs${fr.acessorio ? ` · + ${fr.acessorio} baterias e carregadores` : ""}`],
    ["N.S. em aberto", nsAberto === null ? "—" : f.percentual(nsAberto), `${f.numero(tn - tl)} de ${f.numero(tn)} trocas e novos no prazo`, nsAberto !== null && nsAberto < 0.8],
    ["Nível de serviço · 90 dias", f.percentual(ns90), `${ns90 >= ns90a ? "▲" : "▼"} vs. ${f.percentual(ns90a)} nos 90 anteriores`, ns90 < 0.7],
    ["Em aberto · todas as operações", f.numero(tn + ab.devol.n), `${f.numero(ab.troca.n)} trocas · ${f.numero(ab.novo.n)} novos · ${f.numero(ab.devol.n)} devoluções`],
    ["Encomendas · 12 meses", f.numero(enc), `${f.numero(c.pulso.encAbertas)} em aberto · ${f.numero(dev)} devoluções`],
  ];

  return h("section", { class: "card resumo", "aria-label": "Resumo do cliente" },
    h("div", { class: "resumo__principal" },
      h("div", { class: "pilulas" },
        etiqueta("Operação ativa", "azul"), etiqueta(`Grupo ${c.cli}`), etiqueta(`CS responsável: ${c.resp}`), etiqueta(`Cliente desde ${f.mesAno(c.desde)}`)),
      h("div", {},
        h("h1", { class: "resumo__nome", text: c.nome }),
        h("p", { class: "resumo__razao", text: c.razao }),
        h("p", { class: "resumo__linha", text: `${f.numero(c.lojas)} lojas cadastradas · ${f.numero(c.lojasFrota)} com frota ativa · ${c.ufs} UFs · ${portal}% das trocas abertas pelo Portal em 90 dias · atraso médio de pagamento ${f.decimal(c.atrasoPgto)} dia` })),
      h("div", { class: "mosaico" },
        mosaico.map(([rotulo, valor, sub, risco]) => h("div", { class: "mosaico__item" },
          h("span", { class: "rotulo", text: rotulo }),
          h("span", { class: `mosaico__valor${risco ? " mosaico__valor--risco" : ""}`, text: valor }),
          h("span", { class: "texto-pequeno texto-apagado", text: sub }))))),
    blocoRanking(c));
}

function blocoRanking(c) {
  return h("div", { class: "ranking" },
    h("div", {},
      h("h2", { text: "Lojas com problema" }),
      h("p", { class: "texto-pequeno texto-apagado", text: "Equipamentos em aberto (troca + novo) fora do prazo, por loja. Risco = 5+ d.u. de atraso · Atenção = 1 a 4 d.u." })),
    c.ranking.length
      ? h("ol", { class: "ranking__lista" },
        c.ranking.map((r, i) => h("li", { class: "ranking__item" },
          h("span", { class: "ranking__posicao", text: i + 1 }),
          h("div", {},
            h("div", { class: "ranking__nome", text: r.nome }),
            h("div", { class: "texto-pequeno texto-apagado", text: `${r.uf} · ${r.abertos} em aberto · máx. ${r.maxAtraso} d.u.` })),
          h("div", { class: "ranking__chips" },
            etiqueta(`${r.risco} risco`, r.risco ? "risco" : "apagada"),
            etiqueta(`${r.atencao} atenção`, r.atencao ? "atencao" : "apagada")))))
      : h("p", { class: "texto-apagado", text: "Nenhuma loja com atraso agora." }),
    legenda([["#c8362b", "Risco"], ["#ee9f95", "Atenção"]]));
}

function blocoOperacoes(c) {
  const ab = c.abertos;
  const definicoes = [["troca", "TROCA · substituição por quebra", "azul"], ["novo", "NOVO · encomenda de equipamento", "laranja"], ["devol", "DEVOLUÇÃO · recebimento e devolução", ""]];
  const cartoes = definicoes.map(([g, nome, cor]) => {
    const x = ab[g];
    return h("div", { class: "operacao" },
      h("div", { class: "card__topo" }, etiqueta(nome, cor), h("span", { class: "texto-pequeno texto-apagado", text: x.n ? `mais antiga: ${f.diaMes(x.maisAntiga)}` : "nada em aberto" })),
      h("div", { class: "operacao__numeros" },
        h("div", {}, h("div", { class: "rotulo", text: "Em aberto" }), h("div", { class: "numero-grande", text: f.numero(x.n) })),
        h("div", {}, h("div", { class: "rotulo", text: "Em atraso" }), h("div", { class: `numero-grande${x.late ? " numero-grande--risco" : ""}`, text: f.numero(x.late) }),
          x.n ? h("div", { class: "texto-pequeno texto-risco", text: `${Math.round((x.late / x.n) * 100)}% das abertas` }) : null),
        h("div", {}, h("div", { class: "rotulo", text: "Aging" }), h("div", { class: "numero-grande", text: f.decimal(x.agingMed) }), h("div", { class: "texto-pequeno texto-apagado", text: `d.u. médio · máx. ${x.agingMax}` }))),
      barraEmpilhada([{ rotulo: "Aguardando rota", valor: x.rom.aguardando, cor: "#004c96" }, { rotulo: "Em controle de entrega", valor: x.rom.emrota, cor: "#0a7ac9" }, { rotulo: "Sem romaneio", valor: x.rom.sem, cor: "#b7bdc9" }]),
      h("span", { class: "texto-pequeno texto-apagado", text: `${x.rom.aguardando} aguardando rota · ${x.rom.emrota} em controle de entrega · ${x.rom.sem} sem romaneio` }));
  });

  const tipos = [["T", "Troca", "troca"], ["M", "Troca de modelo", "troca"], ["N", "Encomenda", "novo"], ["E", "Envio", "novo"], ["R", "Recebimento", "devolução"], ["D", "Devolução", "devolução"]];
  return h("section", { class: "card", "aria-label": "Em aberto e em atraso por tipo de operação" },
    h("div", { class: "card__topo" },
      h("h2", { text: "Em aberto e em atraso: troca · novo · devolução" }),
      h("span", { class: "texto-pequeno texto-apagado", text: `${f.numero(ab.troca.n + ab.novo.n + ab.devol.n)} em aberto · ${f.numero(ab.troca.late + ab.novo.late + ab.devol.late)} em atraso` })),
    h("div", { class: "grade grade--media" }, cartoes),
    h("div", { class: "tabela-rolagem" },
      h("table", { class: "tabela tabela--estreita" },
        h("caption", { class: "tabela__legenda", text: "Todas as operações · últimos 90 dias" }),
        h("thead", {}, h("tr", {}, h("th", { text: "Operação" }), ...["Em aberto", "Abertas em atraso", "Volume 90d", "Nível de serviço 90d", "Tempo médio 90d"].map((t) => h("th", { class: "tabela__num", text: t })))),
        h("tbody", {}, tipos.map(([cod, nome, grupo]) => {
          const p = c.porTipo[cod];
          const pct = p.n ? (p.n - p.late) / p.n : 0;
          return h("tr", {},
            h("td", {}, h("span", { class: "valor-forte", text: nome }), h("span", { class: "texto-pequeno texto-apagado", text: ` · ${grupo}` })),
            h("td", { class: "tabela__num valor-forte", text: f.numero(p.open) }),
            h("td", { class: `tabela__num ${p.openLate ? "texto-risco" : "texto-apagado"}`, text: f.numero(p.openLate) }),
            h("td", { class: "tabela__num", text: f.numero(p.n) }),
            h("td", { class: `tabela__num ${p.n && pct < 0.7 ? "texto-risco" : "valor-forte"}`, text: p.n ? f.percentual(pct) : "—" }),
            h("td", { class: "tabela__num", text: p.n ? `${f.decimal(p.dur)} d.u.` : "—" }));
        })))));
}

function blocoJornada(c) {
  const enc = totalPulso(c.pulso.enc);
  const dev = totalPulso(c.pulso.dev);
  const etapas = (c.jornada && c.jornada.length) ? c.jornada : [
    { titulo: "Primeiro pedido", detalhe: "Início do relacionamento", data: f.mesAno(c.desde), situacao: "feito" },
    { titulo: "Operação ativa", detalhe: `${f.numero(c.frota.total)} equipamentos em ${c.lojasFrota} lojas · ${c.ufs} UFs`, data: "hoje", situacao: "atual" },
    { titulo: "Renovação", detalhe: "[data de renovação do contrato]", data: "a definir", situacao: "proxima" },
    { titulo: "Expansão / devolução", detalhe: `${f.numero(enc)} encomendas × ${f.numero(dev)} devoluções em 12 meses`, data: "acompanhamento", situacao: "proxima" },
  ];
  return h("section", { class: "card", "aria-label": "Jornada do cliente" },
    h("h2", { text: "Jornada do cliente" }),
    h("div", { class: "tabela-rolagem" },
      h("ol", { class: "jornada", style: { "--etapas": etapas.length } },
        etapas.map((e, i) => h("li", { class: "jornada__etapa" },
          h("div", { class: "jornada__marca" },
            h("span", { class: `jornada__ponto${e.situacao === "feito" ? " jornada__ponto--feito" : ""}${e.situacao === "atual" ? " jornada__ponto--atual" : ""}`, text: i + 1 }),
            i < etapas.length - 1 ? h("span", { class: `jornada__linha${e.situacao === "feito" ? " jornada__linha--feita" : ""}` }) : null),
          h("span", { class: "jornada__titulo", text: e.titulo }),
          h("span", { text: e.detalhe }),
          h("span", { class: "texto-apagado", text: e.data }))))));
}

function blocoMensal(c) {
  let visao = "todas";
  const area = h("div", { class: "card", "aria-label": "Evolução das solicitações" });
  const escopo = { todas: "Troca, troca de modelo, encomenda, envio, recebimento e devolução", troca: "Troca e troca de modelo", novo: "Encomenda e envio", devol: "Recebimento e devolução" };

  function valores(m) {
    if (visao === "todas") return [m.troca[0] + m.novo[0] + m.devol[0], m.troca[1] + m.novo[1] + m.devol[1]];
    return m[visao];
  }

  function desenhar() {
    const maximo = Math.max(1, ...c.meses.map((m) => valores(m)[0]));
    const A = c.atual[visao];
    const P = c.anterior[visao];
    const pa = 1 - A.late / Math.max(1, A.n);
    const pp = 1 - P.late / Math.max(1, P.n);
    trocar(area,
      h("div", { class: "card__topo" },
        h("h2", { text: "Solicitações por mês e nível de serviço (SLA)" }),
        pilulas("Tipo de solicitação", [["todas", "Todas"], ["troca", "Troca"], ["novo", "Novo"], ["devol", "Devolução"]], visao, (v) => { visao = v; desenhar(); })),
      h("div", { class: "resumo-faixa" },
        h("div", {}, h("div", { class: "rotulo", text: "Volume · 90 dias" }), h("div", { class: "resumo-faixa__valor", text: f.numero(A.n) }),
          h("div", { class: "texto-pequeno texto-apagado", text: `${A.n >= P.n ? "+" : ""}${Math.round((A.n / Math.max(1, P.n) - 1) * 100)}% vs. ${f.numero(P.n)}` })),
        h("div", {}, h("div", { class: "rotulo", text: "Nível de serviço (SLA) · 90 dias" }), h("div", { class: `resumo-faixa__valor${pa < 0.7 ? " texto-risco" : ""}`, text: f.percentual(pa) }),
          h("div", { class: "texto-pequeno texto-apagado", text: `vs. ${f.percentual(pp)} nos 90 anteriores` })),
        h("div", {}, h("div", { class: "rotulo", text: "Tempo médio de atendimento" }), h("div", { class: "resumo-faixa__valor", text: f.decimal(A.dur) }), h("div", { class: "texto-pequeno texto-apagado", text: "dias úteis · 90 dias" })),
        h("div", {}, h("div", { class: "rotulo", text: "Inclui" }), h("div", { class: "texto-pequeno valor-forte", text: escopo[visao] }))),
      legenda([["#004c96", "No prazo"], ["#e07a6c", "Atrasadas"]]),
      h("div", { class: "tabela-rolagem" },
        h("div", { class: "colunas", role: "img", "aria-label": "Solicitações por mês e percentual no prazo" },
          c.meses.map((m, i) => {
            const [total, atras] = valores(m);
            const pct = total ? Math.round(((total - atras) / total) * 100) : 0;
            return h("div", { class: "colunas__mes" },
              h("span", { class: pct < 60 ? "texto-risco" : "valor-forte", text: total ? `${pct}%` : "—" }),
              h("div", { class: "colunas__barra", style: { "--altura": `${Math.max(2, Math.round((total / maximo) * 160))}px` } },
                h("span", { class: "colunas__atrasado", style: { "--atraso": `${total ? Math.round((atras / total) * 100) : 0}%` } }),
                h("span", { class: "colunas__prazo" })),
              h("span", { class: "valor-forte", text: f.numero(total) }),
              h("span", { class: "texto-apagado", text: `${f.mesCurto(m.mes)}${i === c.meses.length - 1 ? "*" : ""}` }));
          }))),
      h("p", { class: "card__nota", text: "Solicitações por mês de abertura, com o SLA oficial do sistema (prazo × encerramento do romaneio). *Mês corrente parcial. Comparativo: 90 dias anteriores." }));
  }
  desenhar();
  return area;
}
