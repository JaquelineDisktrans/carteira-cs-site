// js/telas/cliente360-detalhe.js — abas de detalhamento do Cliente 360:
// em aberto por unidade de atendimento (expande lojas), lojas com mais trocas, encomendas e devoluções.

import * as f from "../formato.js";
import { totalPulso } from "../indicadores.js";
import { barra, h, trocar } from "../ui.js";

const ABAS = [["unidades", "Em aberto por unidade"], ["lojas", "Lojas com mais trocas · 90d"], ["pulso", "Encomendas e devoluções"]];

export function blocoDetalhamento(c) {
  let aba = "unidades";
  const abertas = new Set();
  const corpo = h("div");
  const lista = h("div", { class: "abas", role: "tablist", "aria-label": "Seções do cliente" });
  const secao = h("section", { class: "card card--sem-padding", "aria-label": "Detalhamento" }, lista, corpo);

  function desenhar() {
    const total = c.abertos.troca.n + c.abertos.novo.n + c.abertos.devol.n;
    trocar(lista, ABAS.map(([id, rotulo]) => h("button", {
      type: "button", role: "tab", class: "abas__aba", "aria-selected": id === aba ? "true" : "false",
      text: id === "unidades" ? `${rotulo} (${f.numero(total)})` : rotulo, on: { click: () => { aba = id; desenhar(); } },
    })));
    if (aba === "unidades") trocar(corpo, tabelaUnidades(c, abertas, desenhar));
    else if (aba === "lojas") trocar(corpo, tabelaLojas(c));
    else trocar(corpo, painelPulso(c));
  }
  desenhar();
  return secao;
}

function celulas(x) {
  return [
    h("td", { class: "tabela__num valor-forte", text: f.numero(x.t) }),
    h("td", { class: `tabela__num ${x.tl ? "texto-risco" : "texto-apagado"}`, text: f.numero(x.tl) }),
    h("td", { class: "tabela__num valor-forte", text: f.numero(x.n) }),
    h("td", { class: `tabela__num ${x.nl ? "texto-risco" : "texto-apagado"}`, text: f.numero(x.nl) }),
    h("td", { class: "tabela__num valor-forte", text: f.numero(x.ct) }),
    h("td", { class: "tabela__num valor-forte", text: f.numero(x.cn) }),
  ];
}

function tabelaUnidades(c, abertas, redesenhar) {
  const linhas = [];
  c.unidades.forEach((u) => {
    const aberta = abertas.has(u.nome);
    linhas.push(h("tr", {},
      h("td", {}, h("div", { class: "expansor" },
        h("button", {
          type: "button", class: "expansor__botao", text: aberta ? "−" : "+", "aria-expanded": aberta ? "true" : "false",
          "aria-label": `${aberta ? "Recolher" : "Expandir"} ${u.nome}`,
          on: { click: () => { if (aberta) abertas.delete(u.nome); else abertas.add(u.nome); redesenhar(); } },
        }),
        h("div", { class: "expansor__textos" }, h("span", { class: "expansor__titulo expansor__titulo--forte", text: u.nome }), h("span", { class: "texto-pequeno texto-apagado", text: `${u.tipo} · ${u.lojas.length} lojas` })))),
      celulas(u)));
    if (aberta) {
      u.lojas.forEach((l) => linhas.push(h("tr", { class: "tabela__linha--nivel-2" },
        h("td", {}, h("div", { class: "expansor", style: { "--recuo": "2.375rem" } },
          h("div", { class: "expansor__textos" }, h("span", { class: "expansor__titulo", text: l.nome }), h("span", { class: "texto-pequeno texto-apagado", text: l.uf })))),
        celulas(l))));
    }
  });
  return [
    h("div", { class: "tabela-rolagem" },
      h("table", { class: "tabela" },
        h("thead", {}, h("tr", {}, h("th", { text: "Unidade de atendimento · loja" }),
          ...["Trocas abertas", "Trocas atrasadas", "Novos abertos", "Novos atrasados", "Controle de entrega · troca", "Controle de entrega · novo"].map((t) => h("th", { class: "tabela__num", text: t })))),
        h("tbody", {}, linhas))),
    h("p", { class: "card__nota card__nota--com-padding", text: "Controle de entrega = solicitações com romaneio em rota (status \"Controle Entrega\"). Clique em + para ver as lojas atendidas pela unidade." }),
  ];
}

function tabelaLojas(c) {
  return h("div", { class: "tabela-rolagem" },
    h("table", { class: "tabela tabela--estreita" },
      h("thead", {}, h("tr", {}, h("th", { text: "Loja" }), ...["Frota", "Trocas 90d", "Trocas / frota", "Atrasadas", "Reincid. ≤30d"].map((t) => h("th", { class: "tabela__num", text: t })))),
      h("tbody", {}, c.topTrocas.map((s) => {
        const taxa = s.frota ? Math.round((s.n / s.frota) * 100) : null;
        return h("tr", {},
          h("td", {}, h("span", { class: "valor-forte", text: s.nome }), h("span", { class: "texto-apagado", text: ` · ${s.uf}` })),
          h("td", { class: "tabela__num", text: f.numero(s.frota) }),
          h("td", { class: "tabela__num valor-forte", text: f.numero(s.n) }),
          h("td", { class: `tabela__num ${taxa !== null && taxa >= 75 ? "texto-risco" : ""}`, text: taxa === null ? "—" : `${taxa}%` }),
          h("td", { class: `tabela__num ${s.late >= 40 ? "texto-risco" : ""}`, text: f.numero(s.late) }),
          h("td", { class: "tabela__num", text: f.numero(s.reinc) }));
      }))));
}

function barrasMotivo(titulo, itens, total, nota, cor) {
  const maior = itens.length ? itens[0][1] : 1;
  return h("div", { class: "card__topo" },
    h("div", { class: "relatorio" },
      h("h3", {}, titulo, h("span", { class: "texto-apagado", text: ` (${f.numero(total)} itens)` })),
      itens.map(([motivo, n]) => h("div", { class: "funil__linha" },
        h("span", { text: motivo }), barra(n / maior, cor), h("span", { class: "tabela__num valor-forte", text: f.numero(n) }))),
      h("span", { class: "texto-pequeno texto-apagado", text: nota })));
}

function painelPulso(c) {
  const p = c.pulso;
  return h("div", { class: "grade grade--media card__topo--com-padding" },
    barrasMotivo("Encomendas · 12 meses", p.enc, totalPulso(p.enc), `${f.dinheiro(p.encValor)}/mês em valor de locação encomendado · ${f.numero(p.encAbertas)} itens em aberto`, "#004c96"),
    barrasMotivo("Devoluções · 12 meses", p.dev, totalPulso(p.dev), `${f.dinheiro(p.devValor)}/mês em valor de locação devolvido`, "#8a93a4"));
}
