// js/exportar/pdf.js — fechamento semanal para o cliente (one page).
// Monta o bloco #impressao e abre a impressão do navegador ("Salvar como PDF").

import * as f from "../formato.js";
import { nivelServicoCliente } from "../indicadores.js";
import { h, limpar, trocar } from "../ui.js";

function indicadorImpresso(rotulo, valor, detalhe) {
  return h("div", { class: "impressao__indicador" },
    h("div", { class: "rotulo", text: rotulo }), h("div", { class: "impressao__valor", text: valor }), h("div", { class: "texto-pequeno", text: detalhe }));
}

function tabelaImpressa(titulo, cabecalho, linhas) {
  return h("section", {},
    h("h2", { text: titulo }),
    h("table", {},
      h("thead", {}, h("tr", {}, cabecalho.map((t) => h("th", { text: t })))),
      h("tbody", {}, linhas.map((l) => h("tr", {}, l.map((v) => h("td", { text: String(v) })))))));
}

export function gerarPdfCliente(c, dados, plano) {
  const area = document.getElementById("impressao");
  const t = c.atual.todas;
  const ns = nivelServicoCliente(c);
  const hoje = f.hojeIso();
  const acoes = plano.filter((p) => p.cli === c.cli && !p.feito).sort((a, b) => String(a.quando).localeCompare(String(b.quando)));

  trocar(area,
    h("header", { class: "impressao__topo" },
      h("div", {}, h("h1", { text: `Fechamento semanal · ${c.nome}` }), h("div", { text: `Disktrans · extraído em ${dados.atualizado}` })),
      h("img", { class: "impressao__logo", src: "assets/img/logo-disktrans.svg", alt: "Disktrans" })),
    h("div", { class: "impressao__indicadores" },
      indicadorImpresso("Nível de serviço · 90 dias", f.percentual(1 - t.late / Math.max(1, t.n)), `${f.numero(t.n)} solicitações`),
      indicadorImpresso("N.S. em aberto", ns === null ? "—" : f.percentual(ns), "trocas e novos no prazo hoje"),
      indicadorImpresso("Trocas em aberto", f.numero(c.abertos.troca.n), `${c.abertos.troca.late} atrasadas`),
      indicadorImpresso("Novos em aberto", f.numero(c.abertos.novo.n), `${c.abertos.novo.late} atrasados`)),
    tabelaImpressa("Lojas com atraso", ["Loja", "UF", "Risco (5+ d.u.)", "Atenção (1–4 d.u.)", "Em aberto", "Maior atraso"],
      c.ranking.slice(0, 10).map((r) => [r.nome, r.uf, r.risco, r.atencao, r.abertos, `${r.maxAtraso} d.u.`])),
    tabelaImpressa("Entregas e pendências por unidade de atendimento", ["Unidade", "Trocas abertas", "Trocas atrasadas", "Novos abertos", "Novos atrasados", "Em rota"],
      c.unidades.slice(0, 10).map((u) => [u.nome, u.t, u.tl, u.n, u.nl, u.ct + u.cn])),
    tabelaImpressa("Plano de ação combinado", ["O quê", "Onde", "Quando", "Status"],
      acoes.slice(0, 8).map((p) => [p.oque, p.onde, f.dataCompleta(p.quando), p.quando && p.quando < hoje ? "Em atraso" : "No prazo"])),
    h("p", { class: "impressao__rodape", text: "Nível de serviço = solicitações atendidas dentro do prazo ÷ total. Dias úteis (d.u.) contados após o vencimento do prazo." }));

  const limparDepois = () => { limpar(area); window.removeEventListener("afterprint", limparDepois); };
  window.addEventListener("afterprint", limparDepois);
  window.print();
}
