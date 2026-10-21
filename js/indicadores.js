// js/indicadores.js — somas e razões sobre os números já calculados pelo pipeline.
// As regras (atraso, aging, SLA) vêm prontas do disktrans_gold; aqui só agregamos.

export const GRUPOS = { troca: "Troca", novo: "Novo", devol: "Devolução" };

/** Faixas de aging: 0 = em dia; 1 = 1 d.u.; 2 = 2–4; 3 = 5; 4..7 = 6–9, 10–15, 16–30, +30. */
export function saudeDaDistribuicao(dist) {
  const saudavel = dist[0];
  const atencao = dist[1] + dist[2];
  const risco = dist.slice(3).reduce((a, b) => a + b, 0);
  return { saudavel, atencao, risco, total: saudavel + atencao + risco };
}

export function somaDistribuicoes(clientes, grupo) {
  const total = [0, 0, 0, 0, 0, 0, 0, 0];
  clientes.forEach((c) => c.abertos[grupo].dist.forEach((v, i) => { total[i] += v; }));
  return total;
}

export function emRisco(cliente) {
  return ["troca", "novo"].reduce((a, g) => a + saudeDaDistribuicao(cliente.abertos[g].dist).risco, 0);
}

/** N.S. em aberto = (abertos − atrasados) ÷ abertos, troca + novo. null se nada aberto. */
export function nivelServicoAberto(abertos, atrasados) {
  return abertos ? 1 - atrasados / abertos : null;
}

export function nivelServicoCliente(cliente) {
  const ab = cliente.abertos;
  return nivelServicoAberto(ab.troca.n + ab.novo.n, ab.troca.late + ab.novo.late);
}

export function somar(lista, fn) {
  return lista.reduce((a, item) => a + fn(item), 0);
}

export function totalPulso(lista) {
  return lista.reduce((a, [, n]) => a + n, 0);
}

/** Card do kanban fora do SLA da etapa. */
export function acionamentoAtrasado(cartao, sla) {
  return cartao.etapa !== "concluido" && cartao.dias > sla[cartao.etapa];
}
