// js/formato.js — formatação de números, valores e datas no padrão brasileiro.

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function numero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

export function decimal(valor, casas = 1) {
  return Number(valor || 0).toFixed(casas).replace(".", ",");
}

export function percentual(fracao) {
  return `${(fracao * 100).toFixed(1).replace(".", ",")}%`;
}

export function percentualInteiro(fracao) {
  return `${Math.round(fracao * 100)}%`;
}

export function dinheiro(valor) {
  const v = Number(valor || 0);
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(2).replace(".", ",")} mi`;
  if (v >= 1e3) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

/** "2026-10" → "out/26" */
export function mesCurto(anoMes) {
  const [ano, mes] = String(anoMes).split("-");
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}

/** "2023-07-10" → "jul/2023" */
export function mesAno(dataIso) {
  const [ano, mes] = String(dataIso).split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

/** "2026-10-15" → "15/10" */
export function diaMes(dataIso) {
  if (!dataIso) return "—";
  const [, mes, dia] = String(dataIso).split("-");
  return `${dia}/${mes}`;
}

/** "2026-10-15" → "15/10/2026" */
export function dataCompleta(dataIso) {
  if (!dataIso) return "";
  const [ano, mes, dia] = String(dataIso).slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Diferença em dias corridos entre duas datas ISO. */
export function diasEntre(deIso, ateIso) {
  const de = new Date(`${deIso}T00:00:00`);
  const ate = new Date(`${ateIso}T00:00:00`);
  return Math.round((ate - de) / 86400000);
}

/** Dias úteis (seg–sex) depois de `deIso` até `ateIso`. Feriados não entram. */
export function diasUteis(deIso, ateIso) {
  if (!deIso || deIso >= ateIso) return 0;
  const atual = new Date(`${deIso}T00:00:00`);
  const fim = new Date(`${ateIso}T00:00:00`);
  let dias = 0;
  while (atual < fim) {
    atual.setDate(atual.getDate() + 1);
    const semana = atual.getDay();
    if (semana !== 0 && semana !== 6) dias += 1;
  }
  return dias;
}

export function hojeIso() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}
