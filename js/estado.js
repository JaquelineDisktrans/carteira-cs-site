// js/estado.js — dados descriptografados e alterações feitas na sessão.
// Tudo fica só em memória: fechar ou recarregar a página apaga os dados
// (por isso nada vai para localStorage, que guardaria dado de cliente em claro).

let pacote = null;
let alterado = false;
const ouvintes = new Set();

// Filtro da carteira compartilhado entre as telas: CS responsável ("" = carteira geral)
// e clientes marcados (vazio = todos os clientes daquele CS).
const filtro = { cs: "", clis: new Set() };

export function filtroCarteira() {
  return filtro;
}

export function escolherCs(cs) {
  filtro.cs = cs;
  filtro.clis.clear();
}

export function alternarCliente(cli) {
  if (filtro.clis.has(cli)) filtro.clis.delete(cli);
  else filtro.clis.add(cli);
}

export function limparClientes() {
  filtro.clis.clear();
}

/** Clientes ativos do CS escolhido (ou da carteira geral). */
export function clientesDoCs() {
  return clientesAtivos(filtro.cs || null);
}

/** Clientes do CS escolhido, restritos aos marcados nos botões. */
export function clientesFiltrados() {
  const doCs = clientesDoCs();
  return filtro.clis.size ? doCs.filter((c) => filtro.clis.has(c.cli)) : doCs;
}

export function carregar(dados) {
  pacote = dados;
  alterado = false;
}

export function descarregar() {
  pacote = null;
  alterado = false;
  filtro.cs = "";
  filtro.clis.clear();
}

export function carregado() {
  return pacote !== null;
}

export function dados() {
  return pacote;
}

export function roteirizacao() {
  return pacote.roteirizacao;
}

/** Clientes ativos na roteirização, na ordem da roteirização. */
export function clientesAtivos(responsavel = null) {
  const porCli = new Map(pacote.clientes.map((c) => [c.cli, c]));
  return pacote.roteirizacao
    .filter((r) => r.ativo && porCli.has(r.cli) && (!responsavel || r.resp === responsavel))
    .map((r) => ({ ...porCli.get(r.cli), resp: r.resp }));
}

export function responsaveis() {
  return [...new Set(pacote.roteirizacao.map((r) => r.resp).filter(Boolean))];
}

export function acionamentos() {
  return pacote.acionamentos;
}

export function plano() {
  return pacote.plano;
}

const CHAVE = { roteirizacao: "cli", acionamentos: "id", plano: "id" };

/** Substitui uma coleção editável e avisa os ouvintes com os itens novos ou alterados. */
export function salvar(colecao, valor) {
  const antes = new Map((pacote[colecao] || []).map((item) => [item[CHAVE[colecao]], JSON.stringify(item)]));
  const alterados = valor.filter((item) => antes.get(item[CHAVE[colecao]]) !== JSON.stringify(item));
  pacote[colecao] = valor;
  alterado = true;
  ouvintes.forEach((fn) => fn(colecao, alterados));
}

/** Troca as coleções editáveis pelas que vieram da nuvem (sem disparar gravação). */
export function aplicarDaNuvem(colecoes) {
  Object.entries(colecoes).forEach(([nome, lista]) => {
    if (lista.length) pacote[nome] = lista;
  });
}

/** Com a nuvem ativa, nada fica pendente só no navegador. */
export function marcarSincronizado() {
  alterado = false;
}

export function temAlteracoes() {
  return alterado;
}

export function aoAlterar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Conteúdo para back/pipeline/editaveis (entregue ao responsável pela atualização). */
export function editaveis() {
  return {
    roteirizacao: pacote.roteirizacao,
    acionamentos: pacote.acionamentos,
    plano: pacote.plano,
  };
}
