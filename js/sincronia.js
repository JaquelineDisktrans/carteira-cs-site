// js/sincronia.js — liga o estado da tela à nuvem (Supabase) e mostra o aviso de gravação.

import * as estado from "./estado.js";
import * as nuvem from "./nuvem.js";

let cancelarOuvinte = null;
let temporizador = null;

export function aviso(texto, tipo = "") {
  const el = document.getElementById("aviso-nuvem");
  if (!el) return;
  el.textContent = texto;
  el.className = `aviso-nuvem${tipo ? ` aviso-nuvem--${tipo}` : ""}`;
  el.hidden = false;
  clearTimeout(temporizador);
  if (tipo !== "erro" && tipo !== "local") temporizador = setTimeout(() => { el.hidden = true; }, 2500);
}

async function gravar(colecao, alterados) {
  if (!alterados.length) return;
  aviso("Salvando…");
  try {
    await nuvem.salvarItens(colecao, alterados);
    estado.marcarSincronizado();
    aviso("Alterações salvas para a equipe.", "ok");
  } catch {
    aviso("Não consegui salvar na nuvem. Use \"Baixar alterações\" para não perder o que mudou.", "erro");
  }
}

/** Entra na conta da equipe. Devolve true se conectou. */
export async function conectarNuvem(senha) {
  try {
    await nuvem.conectar(senha);
    return true;
  } catch {
    return false;
  }
}

/**
 * Depois de carregar o pacote: com nuvem, as edições passam a ser lidas e gravadas
 * no Supabase; sem nuvem, o painel segue só com o pacote local e avisa.
 */
export async function ativarSincronia(conectado) {
  if (!conectado) {
    aviso("Modo local: as edições valem só nesta página. Use \"Baixar alterações\" antes de sair.", "local");
    return;
  }
  try {
    estado.aplicarDaNuvem(await nuvem.carregarColecoes());
    cancelarOuvinte = estado.aoAlterar(gravar);
  } catch {
    aviso("Não consegui ler as edições da equipe. Use \"Baixar alterações\" antes de sair.", "erro");
  }
}

export async function encerrarSincronia() {
  if (cancelarOuvinte) cancelarOuvinte();
  cancelarOuvinte = null;
  const el = document.getElementById("aviso-nuvem");
  if (el) el.hidden = true;
  await nuvem.desconectar();
}
