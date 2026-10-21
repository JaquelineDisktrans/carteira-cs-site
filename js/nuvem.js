// js/nuvem.js — grava e lê as coleções editáveis no Supabase (tabela public.registros).
// A sessão fica só em memória (persistSession: false): nada vai para o localStorage.

import { CONFIG } from "./config.js";
import { carregarBiblioteca } from "./exportar/arquivo.js";

const CHAVES = { roteirizacao: "cli", acionamentos: "id", plano: "id" };
let cliente = null;

export function conectada() {
  return cliente !== null;
}

/** Entra com a conta da equipe. Lança Error se não conseguir. */
export async function conectar(senha) {
  await carregarBiblioteca("supabase");
  const novo = window.supabase.createClient(CONFIG.SUPABASE.url, CONFIG.SUPABASE.chavePublicavel, {
    auth: { persistSession: false, autoRefreshToken: true },
  });
  const { error } = await novo.auth.signInWithPassword({ email: CONFIG.SUPABASE.emailEquipe, password: senha });
  if (error) throw new Error("nuvem");
  cliente = novo;
}

export async function desconectar() {
  if (cliente) await cliente.auth.signOut();
  cliente = null;
}

/** Baixa o pacote criptografado mais recente (bucket privado "pacotes"). */
export async function baixarPacote() {
  const { data, error } = await cliente.storage.from("pacotes").download("painel.enc.json");
  if (error || !data) throw new Error("nuvem");
  return JSON.parse(await data.text());
}

/** Devolve { roteirizacao: [...], acionamentos: [...], plano: [...] }. */
export async function carregarColecoes() {
  const { data, error } = await cliente.from("registros").select("colecao, dados");
  if (error) throw new Error("nuvem");
  const saida = { roteirizacao: [], acionamentos: [], plano: [] };
  data.forEach((linha) => { if (saida[linha.colecao]) saida[linha.colecao].push(linha.dados); });
  return saida;
}

/** Grava (insere ou atualiza) os itens alterados de uma coleção. */
export async function salvarItens(colecao, itens) {
  if (!cliente || !itens.length) return;
  const chave = CHAVES[colecao];
  const linhas = itens.map((dados) => ({ colecao, id: String(dados[chave]), dados }));
  const { error } = await cliente.from("registros").upsert(linhas, { onConflict: "colecao,id" });
  if (error) throw new Error("nuvem");
}

export function chaveDa(colecao) {
  return CHAVES[colecao];
}
