// js/app.js — ponto de entrada: login, carregamento dos dados e troca de telas.

import { buscarPacoteDados } from "./api.js";
import { descriptografar } from "./cripto.js";
import * as estado from "./estado.js";
import { montarMenu, rotaAtual } from "./navegacao.js";
import { baixarPacote } from "./nuvem.js";
import { ativarSincronia, conectarNuvem, encerrarSincronia } from "./sincronia.js";
import { trocar } from "./ui.js";
import { renderizarCarteira } from "./telas/carteira.js";
import { renderizarCliente360 } from "./telas/cliente360.js";
import { renderizarAcionamentos } from "./telas/acionamentos.js";
import { renderizarDashboard } from "./telas/dashboard.js";
import { renderizarPlano } from "./telas/plano.js";
import { renderizarRoteirizacao } from "./telas/roteirizacao.js";
import { renderizarRelatorios } from "./telas/relatorios.js";

const TELAS = {
  carteira: renderizarCarteira,
  cliente360: renderizarCliente360,
  acionamentos: renderizarAcionamentos,
  dashboard: renderizarDashboard,
  plano: renderizarPlano,
  roteirizacao: renderizarRoteirizacao,
  relatorios: renderizarRelatorios,
};

const MENSAGENS_ERRO = {
  senha: "Senha incorreta. Confira com o responsável pela carteira.",
  contexto: "Abra o painel pelo link do site ou pelo atalho abrir-painel.bat. Aberto direto do arquivo, o navegador bloqueia a descriptografia.",
  arquivo: "Não consegui baixar os dados da carteira. Tente de novo em alguns minutos.",
  "senha-ou-rede": "Senha incorreta ou sem conexão com a internet. Confira e tente de novo.",
};

function mostrarTela() {
  if (!estado.carregado()) return;
  const id = rotaAtual();
  montarMenu(document.getElementById("menu"), id, { nomeUsuario: "Equipe CS", aoSair: sair });
  const conteudo = document.getElementById("conteudo");
  trocar(conteudo);
  TELAS[id](conteudo);
  conteudo.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function sair() {
  encerrarSincronia();
  estado.descarregar();
  document.getElementById("painel").hidden = true;
  document.getElementById("tela-login").hidden = false;
  trocar(document.getElementById("conteudo"));
  document.getElementById("campo-senha").focus();
}

async function entrar(evento) {
  evento.preventDefault();
  const campo = document.getElementById("campo-senha");
  const erro = document.getElementById("erro-login");
  const botao = document.getElementById("botao-entrar");
  erro.hidden = true;
  if (!campo.value) {
    erro.textContent = "Digite a senha da equipe.";
    erro.hidden = false;
    return;
  }
  botao.disabled = true;
  botao.textContent = "Abrindo…";
  try {
    // Dados mais recentes vêm do Supabase (bucket privado); a cópia junto das telas
    // só é usada se a nuvem estiver fora do ar.
    const conectado = await conectarNuvem(campo.value);
    let pacote = null;
    if (conectado) {
      try {
        pacote = await baixarPacote();
      } catch {
        pacote = null;
      }
    }
    if (!pacote) {
      try {
        pacote = await buscarPacoteDados();
      } catch {
        // Sem cópia local (site público): sem nuvem, ou a senha está errada ou falta conexão.
        throw new Error(conectado ? "arquivo" : "senha-ou-rede");
      }
    }
    estado.carregar(await descriptografar(pacote, campo.value));
    await ativarSincronia(conectado);
    campo.value = "";
    document.getElementById("tela-login").hidden = true;
    document.getElementById("painel").hidden = false;
    mostrarTela();
  } catch (falha) {
    const chave = String(falha.message || "").split(" ")[0];
    erro.textContent = MENSAGENS_ERRO[chave] || "Não foi possível abrir os dados. Tente de novo.";
    erro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
}

function iniciar() {
  document.getElementById("form-login").addEventListener("submit", entrar);
  window.addEventListener("hashchange", mostrarTela);
  window.addEventListener("beforeunload", (e) => {
    if (estado.temAlteracoes()) e.preventDefault();
  });
}

document.addEventListener("DOMContentLoaded", iniciar);
