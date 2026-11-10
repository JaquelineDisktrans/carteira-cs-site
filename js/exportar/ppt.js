// js/exportar/ppt.js — apresentações de fechamento (semanal, mensal) e fórum com o cliente.
// Usa PptxGenJS (carregado sob demanda por arquivo.js). Padrão visual Disktrans.

import { carregarBiblioteca } from "./arquivo.js";
import * as f from "../formato.js";
import { emRisco, nivelServicoCliente, saudeDaDistribuicao, somaDistribuicoes, somar, totalPulso } from "../indicadores.js";

const COR = { navy: "022064", azul: "004C96", azulClaro: "0A7AC9", laranja: "0A7AC9", risco: "C8362B", atencao: "EE9F95", texto: "3A3A4A", cinza: "6B7280", fundo: "F5F6F8" };
const FONTE_TITULO = "Barlow";
const FONTE = "Inter";

function novoDeck(PptxGenJS) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.defineSlideMaster({
    title: "DISKTRANS",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: COR.navy } } },
      { rect: { x: 0.5, y: 1.05, w: 0.6, h: 0.05, fill: { color: COR.laranja } } },
    ],
    slideNumber: { x: 12.6, y: 7.0, color: COR.cinza, fontSize: 9 },
  });
  return pptx;
}

function titulo(slide, texto, subtitulo) {
  slide.addText(texto, { x: 0.5, y: 0.35, w: 12.3, h: 0.6, fontFace: FONTE_TITULO, fontSize: 26, bold: true, color: COR.navy });
  if (subtitulo) slide.addText(subtitulo, { x: 0.5, y: 1.15, w: 12.3, h: 0.35, fontFace: FONTE, fontSize: 12, color: COR.cinza });
}

function capa(pptx, texto, subtitulo) {
  const s = pptx.addSlide();
  s.background = { color: COR.navy };
  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 3.55, w: 0.9, h: 0.07, fill: { color: COR.laranja } });
  s.addText("CUSTOMER SUCCESS · DISKTRANS", { x: 0.8, y: 2.2, w: 11, h: 0.4, fontFace: FONTE_TITULO, fontSize: 14, bold: true, color: "C2DCF1", charSpacing: 3 });
  s.addText(texto, { x: 0.8, y: 2.6, w: 11.5, h: 0.9, fontFace: FONTE_TITULO, fontSize: 40, bold: true, color: "FFFFFF" });
  s.addText(subtitulo, { x: 0.8, y: 3.8, w: 11.5, h: 0.5, fontFace: FONTE, fontSize: 16, color: "E6F0FA" });
}

function cartoesKpi(slide, itens, y = 1.7) {
  const largura = 12.3 / itens.length;
  itens.forEach(([rotulo, valor, detalhe, destaque], i) => {
    const x = 0.5 + i * largura;
    slide.addShape("rect", { x, y, w: largura - 0.2, h: 1.6, fill: { color: destaque ? COR.navy : COR.fundo }, line: { color: destaque ? COR.navy : "E9ECF1" } });
    slide.addText(rotulo, { x: x + 0.15, y: y + 0.1, w: largura - 0.5, h: 0.35, fontFace: FONTE, fontSize: 11, bold: true, color: destaque ? "C2DCF1" : COR.texto });
    slide.addText(valor, { x: x + 0.15, y: y + 0.45, w: largura - 0.5, h: 0.65, fontFace: FONTE_TITULO, fontSize: 30, bold: true, color: destaque ? "FFFFFF" : COR.navy });
    slide.addText(detalhe, { x: x + 0.15, y: y + 1.1, w: largura - 0.5, h: 0.4, fontFace: FONTE, fontSize: 9, color: destaque ? "E6F0FA" : COR.cinza });
  });
}

function tabela(slide, cabecalho, linhas, opcoes = {}) {
  const head = cabecalho.map((t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: COR.navy }, fontSize: 10, fontFace: FONTE } }));
  const corpo = linhas.map((l) => l.map((v) => ({ text: String(v), options: { fontSize: 10, fontFace: FONTE, color: COR.texto } })));
  slide.addTable([head, ...corpo], { x: 0.5, y: opcoes.y || 1.7, w: opcoes.w || 12.3, colW: opcoes.colW, border: { type: "solid", color: "E9ECF1", pt: 0.5 }, autoPage: true, autoPageRepeatHeader: true });
}

function slideVisaoGeral(pptx, clientes, dados) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  const tn = somar(clientes, (c) => c.abertos.troca.n + c.abertos.novo.n);
  const tl = somar(clientes, (c) => c.abertos.troca.late + c.abertos.novo.late);
  titulo(s, "Visão geral da carteira", `${clientes.length} clientes · extraído em ${dados.atualizado}`);
  cartoesKpi(s, [
    ["N.S. em aberto", tn ? f.percentual(1 - tl / tn) : "—", `${f.numero(tn - tl)} de ${f.numero(tn)} no prazo`, true],
    ["Equipamentos na carteira", f.numero(somar(clientes, (c) => c.frota.total)), `${f.numero(somar(clientes, (c) => c.lojasFrota))} lojas com frota`],
    ["Trocas em aberto", f.numero(somar(clientes, (c) => c.abertos.troca.n)), `${f.numero(somar(clientes, (c) => c.abertos.troca.late))} atrasadas`],
    ["Novos em aberto", f.numero(somar(clientes, (c) => c.abertos.novo.n)), `${f.numero(somar(clientes, (c) => c.abertos.novo.late))} atrasados`],
    ["Equipamentos em risco", f.numero(somar(clientes, emRisco)), "5+ d.u. de atraso"],
  ]);
  const saude = [["troca", "Troca"], ["novo", "Novo"]].map(([g, nome]) => {
    const x = saudeDaDistribuicao(somaDistribuicoes(clientes, g));
    return [nome, f.numero(x.saudavel), f.numero(x.atencao), f.numero(x.risco), f.numero(x.total)];
  });
  tabela(s, ["Saúde dos equipamentos em aberto", "Saudável (em dia)", "Atenção (1–4 d.u.)", "Risco (5+ d.u.)", "Total"], saude, { y: 3.6 });
  const faixas = dados.buckets;
  const aging = [["devol", "Devolução"], ["novo", "Novo"], ["troca", "Troca"]].map(([g, nome]) => [nome, ...somaDistribuicoes(clientes, g).map(f.numero)]);
  tabela(s, ["Aging", ...faixas], aging, { y: 4.9 });
}

function slideClientes(pptx, clientes) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(s, "Clientes da carteira", "N.S. em aberto, atrasos e risco por cliente");
  tabela(s, ["Cliente", "CS", "Frota", "Trocas (atras.)", "Novos (atras.)", "N.S.", "Em risco", "N.S. 90d"],
    clientes.map((c) => {
      const ns = nivelServicoCliente(c);
      const t = c.atual.todas;
      return [c.nome, c.resp, f.numero(c.frota.total), `${f.numero(c.abertos.troca.n)} (${c.abertos.troca.late})`,
        `${f.numero(c.abertos.novo.n)} (${c.abertos.novo.late})`, ns === null ? "—" : f.percentual(ns), f.numero(emRisco(c)), f.percentual(1 - t.late / Math.max(1, t.n))];
    }));
}

function slideRanking(pptx, c) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(s, `${c.nome} · lojas com problema`, "Equipamentos fora do prazo por loja (risco = 5+ d.u.; atenção = 1–4 d.u.)");
  tabela(s, ["#", "Loja", "UF", "Risco", "Atenção", "Em aberto", "Maior atraso"],
    c.ranking.slice(0, 12).map((r, i) => [i + 1, r.nome, r.uf, r.risco, r.atencao, r.abertos, `${r.maxAtraso} d.u.`]), { colW: [0.5, 6.0, 0.8, 1.1, 1.1, 1.3, 1.5] });
}

function slideUnidades(pptx, c) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(s, `${c.nome} · unidades de atendimento`, "Trocas e novos em aberto, atrasos e controle de entrega");
  tabela(s, ["Unidade", "Tipo", "Trocas", "Trocas atras.", "Novos", "Novos atras.", "Em rota (troca)", "Em rota (novo)"],
    c.unidades.slice(0, 14).map((u) => [u.nome, u.tipo, u.t, u.tl, u.n, u.nl, u.ct, u.cn]));
}

function slideMensal(pptx, c) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(s, `${c.nome} · solicitações por mês`, "Volume no prazo × atrasado (todas as operações)");
  const rotulos = c.meses.map((m) => f.mesCurto(m.mes));
  const total = (m, i) => m.troca[i] + m.novo[i] + m.devol[i];
  s.addChart("bar", [
    { name: "No prazo", labels: rotulos, values: c.meses.map((m) => total(m, 0) - total(m, 1)) },
    { name: "Atrasadas", labels: rotulos, values: c.meses.map((m) => total(m, 1)) },
  ], { x: 0.5, y: 1.6, w: 12.3, h: 5.2, barGrouping: "stacked", chartColors: [COR.azul, "E07A6C"], showLegend: true, legendPos: "b", catAxisLabelFontSize: 10, valAxisLabelFontSize: 10 });
}

function slidePulso(pptx, clientes) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(s, "Encomendas × devoluções · 12 meses", "Movimento da frota por cliente");
  tabela(s, ["Cliente", "Encomendas", "Devoluções", "Saldo de equipamentos", "Saldo R$/mês", "Principal motivo de encomenda", "Principal motivo de devolução"],
    clientes.map((c) => {
      const e = totalPulso(c.pulso.enc);
      const d = totalPulso(c.pulso.dev);
      return [c.nome, f.numero(e), f.numero(d), f.numero(e - d), f.dinheiro(c.pulso.encValor - c.pulso.devValor), (c.pulso.enc[0] || ["—"])[0], (c.pulso.dev[0] || ["—"])[0]];
    }));
}

function slidePlano(pptx, plano, hoje) {
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  const abertas = plano.filter((p) => !p.feito).sort((a, b) => String(a.quando).localeCompare(String(b.quando)));
  titulo(s, "Plano de ação (5W2H)", `${abertas.length} ações abertas · ${abertas.filter((p) => p.quando && p.quando < hoje).length} vencidas`);
  tabela(s, ["O quê", "Onde", "Quem", "Quando", "Status"],
    abertas.slice(0, 12).map((p) => [p.oque, p.onde, p.quem, f.dataCompleta(p.quando), p.quando && p.quando < hoje ? "Vencida" : "No prazo"]), { colW: [5.6, 2.8, 1.6, 1.1, 1.2] });
}

async function salvar(pptx, nome) {
  await pptx.writeFile({ fileName: nome });
}

/** Fechamento da carteira (semanal = operação; mensal = acrescenta evolução e movimento da frota). */
export async function gerarFechamento(tipo, clientes, dados, plano) {
  await carregarBiblioteca("pptx");
  const pptx = novoDeck(window.PptxGenJS);
  const hoje = f.hojeIso();
  capa(pptx, tipo === "mensal" ? "Fechamento mensal da carteira" : "Fechamento semanal da carteira", `Extraído em ${dados.atualizado} · ${clientes.map((c) => c.nome).join(" · ")}`);
  slideVisaoGeral(pptx, clientes, dados);
  slideClientes(pptx, clientes);
  clientes.forEach((c) => {
    slideRanking(pptx, c);
    if (tipo === "mensal") slideMensal(pptx, c);
  });
  if (tipo === "mensal") slidePulso(pptx, clientes);
  slidePlano(pptx, plano, hoje);
  await salvar(pptx, `fechamento-${tipo}-carteira-${hoje}.pptx`);
}

/** Fórum mensal com um cliente. */
export async function gerarForum(c, dados, plano) {
  await carregarBiblioteca("pptx");
  const pptx = novoDeck(window.PptxGenJS);
  const hoje = f.hojeIso();
  const ns = nivelServicoCliente(c);
  const t = c.atual.todas;
  capa(pptx, `Fórum de resultados · ${c.nome}`, `Disktrans · extraído em ${dados.atualizado}`);
  const s = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(s, "Resultados operacionais", `${f.numero(c.frota.total)} equipamentos em ${c.lojasFrota} lojas · ${c.ufs} UFs`);
  cartoesKpi(s, [
    ["Nível de serviço · 90 dias", f.percentual(1 - t.late / Math.max(1, t.n)), `${f.numero(t.n)} solicitações`, true],
    ["N.S. em aberto", ns === null ? "—" : f.percentual(ns), "hoje"],
    ["Tempo médio de atendimento", `${f.decimal(t.dur)} d.u.`, "90 dias"],
    ["Trocas em aberto", f.numero(c.abertos.troca.n), `${c.abertos.troca.late} atrasadas`],
    ["Novos em aberto", f.numero(c.abertos.novo.n), `${c.abertos.novo.late} atrasados`],
  ]);
  slideMensal(pptx, c);
  slideRanking(pptx, c);
  const lojas = pptx.addSlide({ masterName: "DISKTRANS" });
  titulo(lojas, "Lojas com mais trocas · 90 dias", "Trocas por loja, atrasos e reincidência em até 30 dias");
  tabela(lojas, ["Loja", "UF", "Frota", "Trocas 90d", "Atrasadas", "Reincid. ≤30d"], c.topTrocas.map((x) => [x.nome, x.uf, x.frota, x.n, x.late, x.reinc]));
  slidePulso(pptx, [c]);
  slidePlano(pptx, plano.filter((p) => p.cli === c.cli), hoje);
  await salvar(pptx, `forum-${c.cli}-${hoje}.pptx`);
}
