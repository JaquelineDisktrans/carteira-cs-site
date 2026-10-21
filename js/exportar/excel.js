// js/exportar/excel.js — planilhas: cobrança das unidades, base em aberto e plano 5W2H.
// Usa SheetJS (carregado sob demanda por arquivo.js).

import { baixar, carregarBiblioteca } from "./arquivo.js";
import * as f from "../formato.js";

const TIPOS = { T: "Troca", M: "Troca de modelo", N: "Encomenda", E: "Envio", R: "Recebimento", D: "Devolução" };
const ROMANEIO = { sem: "Sem romaneio", aguardando: "Aguardando rota", emrota: "Em controle de entrega", outro: "Outro" };

function linhaDetalhe(x) {
  return {
    Cliente: x.clienteNome, "Loja": x.loja, UF: x.uf, "Código loja": x.codLoja, Tipo: TIPOS[x.tipo] || x.tipo,
    "Solicitação": x.chave, Abertura: f.dataCompleta(x.abertura), Prazo: f.dataCompleta(x.prazo),
    "Situação": x.atrasado ? "Atrasado" : "No prazo", "Dias úteis de atraso": x.atraso, "Aging (d.u.)": x.aging,
    "Status do romaneio": ROMANEIO[x.rom] || x.rom, Romaneio: x.romaneio, "Nº Disk": x.disk, "Valor mensal (R$)": x.valor,
  };
}

function nomeAba(nome, usados) {
  let base = String(nome).replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Unidade";
  let final = base;
  let i = 2;
  while (usados.has(final)) { final = `${base.slice(0, 26)} ${i}`; i += 1; }
  usados.add(final);
  return final;
}

function folha(XLSX, linhas, larguras) {
  const ws = XLSX.utils.json_to_sheet(linhas);
  if (larguras) ws["!cols"] = larguras.map((wch) => ({ wch }));
  return ws;
}

function salvar(XLSX, wb, nome) {
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  baixar(nome, new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

const LARGURAS = [18, 34, 5, 12, 14, 16, 11, 11, 10, 10, 10, 22, 10, 10, 12];

/** Uma aba por unidade de atendimento, atrasados primeiro, mais uma aba de resumo. */
export async function gerarCobrancaUnidades(detalhe, sufixo) {
  await carregarBiblioteca("xlsx");
  const { XLSX } = window;
  const wb = XLSX.utils.book_new();
  const porUnidade = new Map();
  detalhe.forEach((x) => {
    if (!porUnidade.has(x.unidade)) porUnidade.set(x.unidade, []);
    porUnidade.get(x.unidade).push(x);
  });
  const unidades = [...porUnidade.entries()].sort((a, b) => b[1].filter((x) => x.atrasado).length - a[1].filter((x) => x.atrasado).length);
  const resumo = unidades.map(([nome, itens]) => ({
    "Unidade de atendimento": nome, Tipo: itens[0].unidadeTipo, "Em aberto": itens.length,
    Atrasados: itens.filter((x) => x.atrasado).length, "5+ d.u. de atraso": itens.filter((x) => x.atraso >= 5).length,
    "Sem romaneio": itens.filter((x) => x.rom === "sem").length, "Maior atraso (d.u.)": Math.max(0, ...itens.map((x) => x.atraso)),
  }));
  XLSX.utils.book_append_sheet(wb, folha(XLSX, resumo, [34, 14, 10, 10, 16, 13, 17]), "Resumo");
  const usados = new Set(["Resumo"]);
  unidades.forEach(([nome, itens]) => {
    const ordenados = [...itens].sort((a, b) => b.atraso - a.atraso || String(a.abertura).localeCompare(String(b.abertura)));
    const linhas = ordenados.map((x) => ({ ...linhaDetalhe(x), "Retorno da unidade": "" }));
    XLSX.utils.book_append_sheet(wb, folha(XLSX, linhas, [...LARGURAS, 30]), nomeAba(nome, usados));
  });
  salvar(XLSX, wb, `cobranca-unidades-${sufixo}-${f.hojeIso()}.xlsx`);
}

export async function gerarBaseAberto(detalhe, sufixo) {
  await carregarBiblioteca("xlsx");
  const { XLSX } = window;
  const wb = XLSX.utils.book_new();
  const linhas = detalhe.map((x) => ({ ...linhaDetalhe(x), "Unidade de atendimento": x.unidade }));
  XLSX.utils.book_append_sheet(wb, folha(XLSX, linhas, [...LARGURAS, 30]), "Em aberto");
  salvar(XLSX, wb, `base-em-aberto-${sufixo}-${f.hojeIso()}.xlsx`);
}

export async function gerarPlanoExcel(plano) {
  await carregarBiblioteca("xlsx");
  const { XLSX } = window;
  const hoje = f.hojeIso();
  const linhas = plano.map((p) => ({
    "O quê": p.oque, "Por quê": p.porque, Onde: p.onde, Quem: p.quem, Quando: f.dataCompleta(p.quando), Como: p.como, Quanto: p.quanto,
    Status: p.feito ? "Concluída" : (p.quando && p.quando < hoje ? "Vencida" : "No prazo"), Origem: p.rotuloOrigem,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, folha(XLSX, linhas, [44, 30, 26, 18, 11, 36, 12, 11, 30]), "Plano 5W2H");
  salvar(XLSX, wb, `plano-5w2h-${hoje}.xlsx`);
}
