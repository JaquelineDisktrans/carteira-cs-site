// js/telas/carteira.js — Saúde da carteira: indicadores, distribuição, aging e clientes.

import * as estado from "../estado.js";
import * as f from "../formato.js";
import { emRisco, nivelServicoAberto, saudeDaDistribuicao, somaDistribuicoes, somar } from "../indicadores.js";
import { barraFiltroCarteira } from "../filtro-carteira.js";
import { barraEmpilhada, cabecalhoTela, card, h, icone, indicador, legenda, pilulas, trocar } from "../ui.js";

const COR = { saudavel: "#004c96", atencao: "#ee9f95", risco: "#c8362b" };
const FILTROS = [["todos", "Todos"], ["troca", "Com troca atrasada"], ["novo", "Com novo atrasado"], ["risco", "Com equipamento em risco"], ["devol", "Com devolução"]];
const LIMITE_LOJAS = 20;

/** O cliente bate com a busca por nome, CLI, CS, razão social ou alguma loja. */
function clienteBateBusca(c, q) {
  if (!q) return true;
  const tem = (s) => String(s || "").toLowerCase().includes(q);
  return tem(c.nome) || tem(c.cli) || tem(c.resp) || tem(c.razao)
    || c.empresas.some((e) => tem(e.nome) || e.lojas.some((l) => tem(l.nome) || tem(l.cod)));
}

export function renderizarCarteira(conteudo) {
  const d = estado.dados();
  const filtros = { texto: "", tipo: "todos", abertos: new Set() };
  const corpoTabela = h("tbody");
  const tituloClientes = h("h2");
  const areaFiltros = h("div");
  const areaResumo = h("div", { class: "relatorio" });

  const busca = h("input", {
    class: "campo__entrada campo__entrada--busca", type: "search", id: "busca-carteira",
    placeholder: "Buscar por cliente, CLI, razão social, loja ou CS responsável",
    on: { input: (e) => { filtros.texto = e.target.value.trim().toLowerCase(); desenharTudo(); } },
  });

  const clientesVisiveis = () => estado.clientesFiltrados().filter((c) => clienteBateBusca(c, filtros.texto));

  function desenharFiltros() {
    trocar(areaFiltros, pilulas("Filtrar clientes", FILTROS, filtros.tipo, (v) => { filtros.tipo = v; desenharFiltros(); desenharTabela(); }));
  }

  function alternar(chave) {
    if (filtros.abertos.has(chave)) filtros.abertos.delete(chave);
    else filtros.abertos.add(chave);
    desenharTabela();
  }

  function desenharTabela() {
    const linhas = montarLinhas(clientesVisiveis(), filtros, alternar);
    tituloClientes.textContent = `Clientes · ${linhas.quantidade}`;
    trocar(corpoTabela, linhas.elementos);
  }

  function desenharTudo() {
    const clientes = clientesVisiveis();
    trocar(areaResumo,
      clientes.length ? null : h("p", { class: "mensagem", text: "Nenhum cliente com esse filtro." }),
      blocoIndicadores(clientes), blocoDistribuicao(clientes), blocoAging(clientes, d.buckets));
    desenharTabela();
  }

  desenharFiltros();
  desenharTudo();

  trocar(conteudo,
    cabecalhoTela("Gestão de carteira", "Saúde da carteira"),
    h("section", { class: "card", "aria-label": "Filtro da carteira" },
      barraFiltroCarteira(desenharTudo),
      h("div", { class: "linha-campos" },
        h("div", { class: "campo-busca" },
          h("label", { class: "visualmente-oculto", for: "busca-carteira", text: "Buscar na carteira" }),
          icone([["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "M20 20l-3.5-3.5" }]], "campo-busca__icone"),
          busca),
        h("span", { class: "fonte-dados", text: `Fonte: disktrans_gold (Microsoft Fabric) · extraído em ${d.atualizado}` }))),
    areaResumo,
    h("section", { class: "card card--sem-padding", "aria-label": "Clientes" },
      h("div", { class: "card__topo card__topo--com-padding" }, tituloClientes, areaFiltros),
      h("div", { class: "tabela-rolagem" },
        h("table", { class: "tabela" },
          h("thead", {}, h("tr", {},
            h("th", { text: "Cliente · razão social · loja" }),
            h("th", { text: "CS responsável" }),
            ...["Frota", "Trocas abertas", "Novos abertos", "N.S.", "Equip. em risco"].map((t) => h("th", { class: "tabela__num", text: t })))),
          corpoTabela)),
      h("p", { class: "card__nota card__nota--com-padding", text: "Clique em + para abrir o cliente por razão social (CNPJ raiz) e depois pelas lojas com algo em aberto. Entre parênteses: quantos estão atrasados. N.S. = equipamentos em aberto dentro do prazo ÷ total em aberto (troca + novo)." })));
}

function blocoIndicadores(clientes) {
  const tn = somar(clientes, (c) => c.abertos.troca.n);
  const tl = somar(clientes, (c) => c.abertos.troca.late);
  const nn = somar(clientes, (c) => c.abertos.novo.n);
  const nl = somar(clientes, (c) => c.abertos.novo.late);
  const ns = nivelServicoAberto(tn + nn, tl + nl);
  return h("section", { class: "grade", "aria-label": "Indicadores da carteira" },
    indicador({ destaque: true, rotulo: "N.S. · nível de serviço em aberto", valor: ns === null ? "—" : f.percentual(ns), detalhe: `${f.numero(tn + nn - tl - nl)} de ${f.numero(tn + nn)} trocas e novos no prazo` }),
    indicador({
      rotulo: "Equipamentos na carteira", valor: f.numero(somar(clientes, (c) => c.frota.total)),
      detalhe: h("div", { class: "indicador__divisao" },
        h("div", {}, h("div", { class: "rotulo", text: "Em troca" }), h("div", { class: "valor-forte", text: f.numero(tn) })),
        h("div", {}, h("div", { class: "rotulo", text: "Em novo" }), h("div", { class: "valor-forte", text: f.numero(nn) }))),
    }),
    indicador({ rotulo: "Clientes acompanhados", valor: f.numero(clientes.length), detalhe: `${f.numero(somar(clientes, (c) => c.lojasFrota))} lojas com frota` }),
    indicador({ rotulo: "Trocas em aberto", valor: f.numero(tn), detalhe: h("span", { class: "indicador__detalhe indicador__detalhe--risco", text: `${f.numero(tl)} atrasadas` }) }),
    indicador({ rotulo: "Novos em aberto", valor: f.numero(nn), detalhe: h("span", { class: "indicador__detalhe indicador__detalhe--risco", text: `${f.numero(nl)} atrasados` }) }),
    indicador({ rotulo: "Devoluções em aberto", valor: f.numero(somar(clientes, (c) => c.abertos.devol.n)), detalhe: `${f.numero(somar(clientes, (c) => c.abertos.devol.late))} atrasadas` }));
}

function blocoDistribuicao(clientes) {
  const faixas = [["troca", "Troca"], ["novo", "Novo"]].map(([g, nome]) => {
    const s = saudeDaDistribuicao(somaDistribuicoes(clientes, g));
    const t = Math.max(1, s.total);
    return h("div", { class: "faixa-saude" },
      h("div", {}, h("div", { class: "valor-forte", text: nome }), h("div", { class: "texto-pequeno texto-apagado", text: `${f.numero(s.total)} equipamentos` })),
      h("div", {},
        barraEmpilhada([{ rotulo: "Saudável", valor: s.saudavel, cor: COR.saudavel }, { rotulo: "Atenção", valor: s.atencao, cor: COR.atencao }, { rotulo: "Risco", valor: s.risco, cor: COR.risco }]),
        h("div", { class: "faixa-saude__numeros" },
          h("span", {}, h("strong", { text: f.numero(s.saudavel) }), ` saudáveis (${f.percentual(s.saudavel / t)})`),
          h("span", {}, h("strong", { text: f.numero(s.atencao) }), ` em atenção (${f.percentual(s.atencao / t)})`),
          h("span", { class: "texto-risco" }, h("strong", { text: f.numero(s.risco) }), ` em risco (${f.percentual(s.risco / t)})`))));
  });
  return h("section", { class: "card", "aria-label": "Distribuição de saúde" },
    h("div", { class: "card__topo" },
      h("h2", { text: "Distribuição de saúde dos equipamentos em aberto" }),
      legenda([[COR.saudavel, "Saudável · em dia"], [COR.atencao, "Atenção · até 4 d.u. de atraso"], [COR.risco, "Risco · 5 d.u. ou mais"]])),
    faixas);
}

function blocoAging(clientes, faixas) {
  const linhas = [["devol", "Devolução"], ["novo", "Novo"], ["troca", "Troca"]].map(([g, nome]) => ({ nome, dist: somaDistribuicoes(clientes, g) }));
  const totais = faixas.map((_, i) => somar(linhas, (l) => l.dist[i]));
  const geral = Math.max(1, totais.reduce((a, b) => a + b, 0));
  return card("Distribuição do aging (dias úteis de atraso)",
    h("p", { class: "card__nota", text: "Equipamentos em aberto por faixa de atraso, contada depois do prazo vencido. \"Em dia\" = ainda dentro do prazo." }),
    h("div", { class: "tabela-rolagem" },
      h("table", { class: "tabela" },
        h("thead", {}, h("tr", {}, h("th", { text: "Faixa" }), faixas.map((b) => h("th", { class: "tabela__centro", text: b })), h("th", { class: "tabela__num", text: "Total" }))),
        h("tbody", {},
          linhas.map((l) => h("tr", {},
            h("td", { class: "valor-forte", text: l.nome }),
            l.dist.map((v, i) => h("td", { class: "tabela__centro" }, h("span", { class: `chip-aging chip-aging--${v ? i : "vazio"}`, text: f.numero(v) }))),
            h("td", { class: "tabela__num valor-forte", text: f.numero(l.dist.reduce((a, b) => a + b, 0)) }))),
          h("tr", { class: "texto-apagado" },
            h("td", { text: "% do total" }),
            totais.map((v) => h("td", { class: "tabela__centro", text: f.percentualInteiro(v / geral) })),
            h("td", { class: "tabela__num", text: "100%" }))))));
}

function passaFiltroTipo(c, tipo) {
  if (tipo === "troca") return c.abertos.troca.late > 0;
  if (tipo === "novo") return c.abertos.novo.late > 0;
  if (tipo === "devol") return c.abertos.devol.n > 0;
  if (tipo === "risco") return emRisco(c) > 0;
  return true;
}

function montarLinhas(clientes, filtros, alternar) {
  const q = filtros.texto;
  const tem = (s) => String(s || "").toLowerCase().includes(q);
  const elementos = [];
  let quantidade = 0;

  clientes.filter((c) => passaFiltroTipo(c, filtros.tipo)).forEach((c) => {
    const clienteBate = !q || tem(c.nome) || tem(c.cli) || tem(c.resp) || tem(c.razao);
    const empresas = c.empresas.map((e) => {
      const empresaBate = clienteBate || tem(e.nome);
      const lojas = e.lojas.filter((l) => l.t + l.n > 0 && (empresaBate || tem(l.nome) || tem(l.cod)));
      return { e, lojas };
    }).filter((x) => x.lojas.length > 0);
    if (q && !clienteBate && !empresas.length) return;
    quantidade += 1;

    const forcado = Boolean(q) && !clienteBate;
    const aberto = forcado || filtros.abertos.has(c.cli);
    const ab = c.abertos;
    const risco = emRisco(c);
    elementos.push(linha({
      nivel: 0, titulo: c.nome, subtitulo: `${c.cli} · ${c.lojasFrota} lojas com frota · ${c.ufs} UFs`, link: `#/cliente360?cli=${c.cli}`,
      aberto, aoAlternar: () => alternar(c.cli), cs: c.resp, frota: c.frota.total,
      t: ab.troca.n, tl: ab.troca.late, n: ab.novo.n, nl: ab.novo.late, risco,
    }));
    if (!aberto) return;

    empresas.forEach(({ e, lojas }) => {
      const chave = `${c.cli}|${e.nome}`;
      const empAberta = forcado || filtros.abertos.has(chave);
      elementos.push(linha({
        nivel: 1, titulo: e.nome, subtitulo: `Razão social · ${lojas.length} lojas com solicitação em aberto`,
        aberto: empAberta, aoAlternar: () => alternar(chave), frota: e.frota, t: e.t, tl: e.tl, n: e.n, nl: e.nl,
      }));
      if (!empAberta) return;
      lojas.slice(0, LIMITE_LOJAS).forEach((l) => elementos.push(linha({
        nivel: 2, titulo: l.nome, subtitulo: `Loja ${l.cod} · ${l.uf}`, frota: l.frota, t: l.t, tl: l.tl, n: l.n, nl: l.nl,
      })));
      if (lojas.length > LIMITE_LOJAS) {
        elementos.push(h("tr", { class: "tabela__linha--nivel-2" },
          h("td", { colspan: 7 }, h("div", { class: "expansor", style: { "--recuo": "4.75rem" } },
            h("span", { class: "texto-apagado", text: `+ ${lojas.length - LIMITE_LOJAS} lojas · use a busca para achar uma loja ou veja a lista completa no Cliente 360` })))));
      }
    });
  });
  return { elementos, quantidade };
}

function linha({ nivel, titulo, subtitulo, link, aberto, aoAlternar, cs, frota, t, tl, n, nl, risco }) {
  const ns = nivelServicoAberto(t + n, tl + nl);
  const recuo = ["0rem", "2.25rem", "4.75rem"][nivel];
  const nomeEl = link
    ? h("a", { class: "expansor__titulo expansor__titulo--forte", href: link, text: titulo })
    : h("span", { class: "expansor__titulo", text: titulo });
  return h("tr", { class: nivel ? `tabela__linha--nivel-${nivel}` : "" },
    h("td", {},
      h("div", { class: "expansor", style: { "--recuo": recuo } },
        aoAlternar ? h("button", {
          type: "button", class: "expansor__botao", text: aberto ? "−" : "+", "aria-expanded": aberto ? "true" : "false",
          "aria-label": `${aberto ? "Recolher" : "Expandir"} ${titulo}`, on: { click: aoAlternar },
        }) : null,
        h("div", { class: "expansor__textos" }, nomeEl, h("span", { class: "texto-pequeno texto-apagado", text: subtitulo })))),
    h("td", { class: "texto-pequeno", text: cs || "" }),
    h("td", { class: "tabela__num valor-forte", text: f.numero(frota) }),
    h("td", { class: "tabela__num valor-forte" }, f.numero(t), tl ? h("span", { class: "texto-pequeno texto-risco", text: ` (${tl})` }) : null),
    h("td", { class: "tabela__num valor-forte" }, f.numero(n), nl ? h("span", { class: "texto-pequeno texto-risco", text: ` (${nl})` }) : null),
    h("td", { class: `tabela__num ${ns !== null && ns < 0.8 ? "texto-risco" : "valor-forte"}`, text: ns === null ? "—" : f.percentual(ns) }),
    h("td", { class: `tabela__num ${risco ? "texto-risco" : "texto-apagado"}`, text: risco === undefined ? "" : f.numero(risco) }));
}
