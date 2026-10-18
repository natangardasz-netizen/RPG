/* ========================================
   ELEMENTOS DO DOM
======================================== */
const arquivoMapa = document.getElementById("arquivoMapa");
const arquivoMusica = document.getElementById("arquivoMusica");

const mapa = document.getElementById("mapa");
const areaMapa = document.getElementById("areaMapa");
const mensagem = document.getElementById("mensagem");

const listaMapas = document.getElementById("listaMapas");
const listaMusicas = document.getElementById("listaMusicas");

const zoomMais = document.getElementById("zoomMais");
const zoomMenos = document.getElementById("zoomMenos");
const centralizar = document.getElementById("centralizar");
const telaCheia = document.getElementById("telaCheia");

const grid = document.getElementById("grid");
const mostrarGrid = document.getElementById("mostrarGrid");
const mostrarMapas = document.getElementById("mostrarMapas");
const musicas = document.getElementById("musicas");

const painelMapas = document.querySelector(".painelMapas");
const painelMusicas = document.querySelector(".painelMusicas");

const playerAudio = document.getElementById("playerAudio");
const musicaAtual = document.getElementById("musicaAtual");

const canvasDesenho = document.getElementById("canvasDesenho");
const regua = document.getElementById("regua");

// Botões das ferramentas
const btnMedir = document.getElementById("medir");
const btnDesenhar = document.getElementById("desenhar");
const btnEspelhoH = document.getElementById("espelhoH");
const btnEspelhoV = document.getElementById("espelhoV");
const btnLimpar = document.getElementById("limparDesenho");

/* ========================================
   VARIÁVEIS DO MAPA E NAVEGAÇÃO
======================================== */
let zoom = 1;
let posicaoX = 0;
let posicaoY = 0;
let arrastando = false;
let inicioX = 0;
let inicioY = 0;

let mapaAtual = null;
let urlMapaAtual = null;
let urlsMiniaturas = [];
let urlsMusicas = [];

let rotacao = 0;

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;
const ZOOM_PASSO = 0.1;
const TAMANHO_GRADE = 50;

/* ========================================
   ESTADOS DAS FERRAMENTAS
======================================== */
let modoAtual = "navegar";
let desenhando = false;
let medindo = false;
let inicioDesenhoX = 0;
let inicioDesenhoY = 0;

const ctx = canvasDesenho ? canvasDesenho.getContext("2d") : null;

/* ========================================
   BANCO DE DADOS (INDEXEDDB)
======================================== */
let bancoDados;
const requisicaoBanco = indexedDB.open("MesaDigitalRPG", 2);

requisicaoBanco.onupgradeneeded = function (evento) {
  bancoDados = evento.target.result;
  if (!bancoDados.objectStoreNames.contains("mapas")) {
    bancoDados.createObjectStore("mapas", {
      keyPath: "id",
      autoIncrement: true,
    });
  }
  if (!bancoDados.objectStoreNames.contains("musicas")) {
    bancoDados.createObjectStore("musicas", {
      keyPath: "id",
      autoIncrement: true,
    });
  }
};

requisicaoBanco.onsuccess = function (evento) {
  bancoDados = evento.target.result;
  carregarListaMapas();
};

requisicaoBanco.onerror = function () {
  alert("Não foi possível abrir o banco de dados local.");
};

/* ========================================
   ADICIONAR E CARREGAR MAPAS
======================================== */
arquivoMapa.addEventListener("change", function () {
  const arquivo = this.files[0];
  if (!arquivo || !bancoDados) return;

  const transacao = bancoDados.transaction(["mapas"], "readwrite");
  const tabela = transacao.objectStore("mapas");

  tabela.add({
    nome: arquivo.name,
    imagem: arquivo,
    data: new Date(),
  });

  transacao.oncomplete = function () {
    carregarListaMapas();
  };

  arquivoMapa.value = "";
});

function carregarListaMapas() {
  urlsMiniaturas.forEach((url) => URL.revokeObjectURL(url));
  urlsMiniaturas = [];
  listaMapas.innerHTML = "";

  const transacao = bancoDados.transaction(["mapas"], "readonly");
  const tabela = transacao.objectStore("mapas");
  const requisicao = tabela.getAll();

  requisicao.onsuccess = function () {
    const mapas = requisicao.result;
    if (mapas.length === 0) {
      listaMapas.innerHTML = `<p class="semMapas">Nenhum mapa adicionado.</p>`;
      return;
    }
    mapas.forEach(criarItemMapa);
  };
}

function criarItemMapa(item) {
  const elemento = document.createElement("div");
  elemento.className = "itemMapa";

  const miniatura = document.createElement("img");
  const url = URL.createObjectURL(item.imagem);
  urlsMiniaturas.push(url);
  miniatura.src = url;
  miniatura.alt = item.nome;

  const nome = document.createElement("span");
  nome.className = "nomeMapa";
  nome.textContent = item.nome;

  const botaoExcluir = document.createElement("button");
  botaoExcluir.className = "excluirMapa";
  botaoExcluir.textContent = "🗑";

  elemento.appendChild(miniatura);
  elemento.appendChild(nome);
  elemento.appendChild(botaoExcluir);

  elemento.addEventListener("click", () => abrirMapa(item.id));
  botaoExcluir.addEventListener("click", (e) => {
    e.stopPropagation();
    excluirMapa(item.id);
  });

  listaMapas.appendChild(elemento);
}

function abrirMapa(id) {
  const transacao = bancoDados.transaction(["mapas"], "readonly");
  const tabela = transacao.objectStore("mapas");
  const requisicao = tabela.get(id);

  requisicao.onsuccess = function () {
    const item = requisicao.result;
    if (!item) return;

    mapaAtual = item;
    if (urlMapaAtual) URL.revokeObjectURL(urlMapaAtual);

    urlMapaAtual = URL.createObjectURL(item.imagem);
    mapa.src = urlMapaAtual;

    mapa.onload = function () {
      ajustarGridECanvas();
      centralizarMapa();
    };

    mapa.style.display = "block";
    mensagem.style.display = "none";
    carregarMusicasDoMapa();
  };
}

function excluirMapa(id) {
  if (!confirm("Deseja realmente excluir este mapa?")) return;

  const transacao = bancoDados.transaction(["mapas"], "readwrite");
  transacao.objectStore("mapas").delete(id);

  transacao.oncomplete = function () {
    if (mapaAtual && mapaAtual.id === id) {
      mapaAtual = null;
      if (urlMapaAtual) URL.revokeObjectURL(urlMapaAtual);
      urlMapaAtual = null;

      mapa.src = "";
      mapa.style.display = "none";
      mensagem.style.display = "block";
      canvasDesenho.style.display = "none";
      pararMusica();
    }
    carregarListaMapas();
  };
}

/* ========================================
   TRANSFORMAÇÕES E REDIMENSIONAMENTO
======================================== */
function atualizarMapa() {
  const transformacao = `translate(${posicaoX}px, ${posicaoY}px) scale(${zoom}) rotate(${rotacao}deg)`;

  mapa.style.transform = transformacao;
  grid.style.transform = transformacao;
  canvasDesenho.style.transform = transformacao;
  regua.style.transform = transformacao;

  grid.style.backgroundSize = `${TAMANHO_GRADE}px ${TAMANHO_GRADE}px`;
}

function ajustarGridECanvas() {
  if (!mapa.naturalWidth || !mapa.naturalHeight) return;

  const w = mapa.naturalWidth + "px";
  const h = mapa.naturalHeight + "px";

  grid.style.width = w;
  grid.style.height = h;

  canvasDesenho.width = mapa.naturalWidth;
  canvasDesenho.height = mapa.naturalHeight;
  canvasDesenho.style.width = w;
  canvasDesenho.style.height = h;
  canvasDesenho.style.display = "block";

  regua.style.width = w;
  regua.style.height = h;
}

/* ========================================
   GIRAR MAPA
======================================== */
if (btnEspelhoH) {
  btnEspelhoH.addEventListener("click", () => {
    rotacao = (rotacao + 90) % 360;
    atualizarMapa();
  });
}

if (btnEspelhoV) {
  btnEspelhoV.addEventListener("click", () => {
    rotacao = (rotacao + 180) % 360;
    atualizarMapa();
  });
}

/* ========================================
   SELEÇÃO DE FERRAMENTAS (COM TOGGLE)
======================================== */
function definirModo(novoModo) {
  const modoAnterior = modoAtual;

  if (modoAtual === novoModo) {
    modoAtual = "navegar";
  } else {
    modoAtual = novoModo;
  }

  // Se saiu do modo medir, limpa a régua
  if (modoAnterior === "medir" && modoAtual !== "medir") {
    medindo = false;
    regua.innerHTML = "";
  }

  [btnMedir, btnDesenhar].forEach((btn) => {
    if (btn) btn.style.background = "#292929";
  });

  if (modoAtual === "desenhar" && btnDesenhar)
    btnDesenhar.style.background = "#555";
  if (modoAtual === "medir" && btnMedir) btnMedir.style.background = "#555";

  if (modoAtual === "navegar") {
    mapa.style.cursor = "grab";
  } else {
    mapa.style.cursor = "crosshair";
  }
}

if (btnDesenhar)
  btnDesenhar.addEventListener("click", () => definirModo("desenhar"));
if (btnMedir) btnMedir.addEventListener("click", () => definirModo("medir"));

if (btnLimpar) {
  btnLimpar.addEventListener("click", () => {
    if (ctx && canvasDesenho) {
      ctx.clearRect(0, 0, canvasDesenho.width, canvasDesenho.height);
    }
  });
}

/* ========================================
   CÁLCULO EXATO DE COORDENADAS NO MAPA (100% PRECISÃO)
======================================== */
function obterCoordenadasLocais(evento) {
  if (!mapa.naturalWidth || !mapa.naturalHeight) return { x: 0, y: 0 };

  const rect = mapa.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dxScreen = evento.clientX - cx;
  const dyScreen = evento.clientY - cy;

  const rad = (-rotacao * Math.PI) / 180;
  const dxRot = dxScreen * Math.cos(rad) - dyScreen * Math.sin(rad);
  const dyRot = dxScreen * Math.sin(rad) + dyScreen * Math.cos(rad);

  const x = dxRot / zoom + mapa.naturalWidth / 2;
  const y = dyRot / zoom + mapa.naturalHeight / 2;

  return { x, y };
}

/* ========================================
   AÇÕES DO MOUSE
======================================== */
areaMapa.addEventListener("mousedown", function (evento) {
  if (mapa.style.display === "none") return;

  // Botão direito cancela medição em andamento
  if (evento.button === 2 && modoAtual === "medir" && medindo) {
    medindo = false;
    regua.innerHTML = "";
    return;
  }

  if (modoAtual === "navegar") {
    arrastando = true;
    inicioX = evento.clientX - posicaoX;
    inicioY = evento.clientY - posicaoY;
    mapa.classList.add("arrastando");
    return;
  }

  const coords = obterCoordenadasLocais(evento);
  const mouseX = coords.x;
  const mouseY = coords.y;

  if (modoAtual === "desenhar") {
    desenhando = true;
    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY);
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  } else if (modoAtual === "medir") {
    if (!medindo) {
      // 1º clique: define o ponto inicial e começa a seguir o mouse
      medindo = true;
      inicioDesenhoX = mouseX;
      inicioDesenhoY = mouseY;
      // Já mostra a régua no ponto (tamanho zero)
      atualizarRegua(mouseX, mouseY);
    } else {
      // 2º clique: finaliza a medição (mantém a linha por 3 segundos)
      medindo = false;
      setTimeout(() => {
        if (!medindo) regua.innerHTML = "";
      }, 3000);
    }
  }
});

// Impede o menu de contexto no botão direito durante medição
areaMapa.addEventListener("contextmenu", function (evento) {
  if (modoAtual === "medir") {
    evento.preventDefault();
  }
});

function atualizarRegua(mouseX, mouseY) {
  const dx = mouseX - inicioDesenhoX;
  const dy = mouseY - inicioDesenhoY;
  const distanciaPx = Math.sqrt(dx * dx + dy * dy);
  const distanciaQuadrados = (distanciaPx / TAMANHO_GRADE).toFixed(1);
  const angulo = Math.atan2(dy, dx) * (180 / Math.PI);

  regua.innerHTML = `
    <div class="linhaRegua" style="
      left: ${inicioDesenhoX}px;
      top: ${inicioDesenhoY}px;
      width: ${distanciaPx}px;
      transform: rotate(${angulo}deg);
    "></div>
    <div class="textoRegua" style="
      left: ${mouseX + 12}px;
      top: ${mouseY + 12}px;
    ">${distanciaQuadrados} qd. (${(distanciaQuadrados * 1.5).toFixed(1)}m)</div>
  `;
}

document.addEventListener("mousemove", function (evento) {
  if (arrastando) {
    posicaoX = evento.clientX - inicioX;
    posicaoY = evento.clientY - inicioY;
    atualizarMapa();
    return;
  }

  if (mapa.style.display === "none" || !canvasDesenho) return;
  const coords = obterCoordenadasLocais(evento);
  const mouseX = coords.x;
  const mouseY = coords.y;

  if (desenhando && modoAtual === "desenhar") {
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
  } else if (medindo && modoAtual === "medir") {
    // A linha acompanha o mouse em tempo real (sem precisar segurar o botão)
    atualizarRegua(mouseX, mouseY);
  }
});

document.addEventListener("mouseup", function () {
  if (arrastando) {
    arrastando = false;
    mapa.classList.remove("arrastando");
  }

  if (desenhando) {
    desenhando = false;
  }
  // Medição agora é controlada por cliques (não pelo soltar do botão)
});

/* ========================================
   CONTROLES DE ZOOM E VISUALIZAÇÃO
======================================== */
function ajustarZoom(delta) {
  zoom += delta;
  if (zoom < ZOOM_MIN) zoom = ZOOM_MIN;
  if (zoom > ZOOM_MAX) zoom = ZOOM_MAX;
  zoom = Math.round(zoom * 100) / 100;
  atualizarMapa();
}

zoomMais.addEventListener("click", () => ajustarZoom(ZOOM_PASSO));
zoomMenos.addEventListener("click", () => ajustarZoom(-ZOOM_PASSO));

areaMapa.addEventListener(
  "wheel",
  function (evento) {
    if (mapa.style.display === "none") return;
    evento.preventDefault();
    ajustarZoom(evento.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO);
  },
  { passive: false },
);

function centralizarMapa() {
  zoom = 1;
  posicaoX = 0;
  posicaoY = 0;
  rotacao = 0;
  definirModo("navegar");
  atualizarMapa();
}

centralizar.addEventListener("click", centralizarMapa);

mostrarGrid.addEventListener("click", function () {
  const visivel = grid.style.display === "block";
  grid.style.display = visivel ? "none" : "block";
  mostrarGrid.textContent = visivel ? "⊞ Grade" : "⊟ Grade";
});

mostrarMapas.addEventListener("click", () =>
  painelMapas.classList.toggle("escondido"),
);
musicas.addEventListener("click", () =>
  painelMusicas.classList.toggle("escondido"),
);

/* ========================================
   MÚSICAS E TELA CHEIA
======================================== */
telaCheia.addEventListener("click", function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    areaMapa.requestFullscreen();
  }
});

arquivoMusica.addEventListener("change", function () {
  const arquivos = Array.from(this.files);
  if (arquivos.length === 0 || !mapaAtual) return;

  const transacao = bancoDados.transaction(["musicas"], "readwrite");
  const tabela = transacao.objectStore("musicas");

  arquivos.forEach((arquivo) => {
    tabela.add({
      nome: arquivo.name,
      audio: arquivo,
      mapaId: mapaAtual.id,
      data: new Date(),
    });
  });

  transacao.oncomplete = carregarMusicasDoMapa;
  arquivoMusica.value = "";
});

function carregarMusicasDoMapa() {
  urlsMusicas.forEach((url) => URL.revokeObjectURL(url));
  urlsMusicas = [];
  listaMusicas.innerHTML = "";

  if (!mapaAtual) return;

  const transacao = bancoDados.transaction(["musicas"], "readonly");
  const requisicao = transacao.objectStore("musicas").getAll();

  requisicao.onsuccess = function () {
    const musicasDoMapa = requisicao.result.filter(
      (m) => m.mapaId === mapaAtual.id,
    );
    if (musicasDoMapa.length === 0) {
      listaMusicas.innerHTML = `<p class="semMusicas">Nenhuma música adicionada.</p>`;
      return;
    }
    musicasDoMapa.forEach(criarItemMusica);
  };
}

function criarItemMusica(item) {
  const elemento = document.createElement("div");
  elemento.className = "itemMusica";

  const icone = document.createElement("span");
  icone.textContent = "🎵";

  const nome = document.createElement("span");
  nome.className = "nomeMusica";
  nome.textContent = item.nome;

  const botaoExcluir = document.createElement("button");
  botaoExcluir.className = "excluirMusica";
  botaoExcluir.textContent = "🗑";

  elemento.appendChild(icone);
  elemento.appendChild(nome);
  elemento.appendChild(botaoExcluir);

  elemento.addEventListener("click", () => tocarMusica(item));
  botaoExcluir.addEventListener("click", (e) => {
    e.stopPropagation();
    excluirMusica(item.id);
  });

  listaMusicas.appendChild(elemento);
}

function tocarMusica(item) {
  const url = URL.createObjectURL(item.audio);
  urlsMusicas.push(url);
  playerAudio.src = url;
  musicaAtual.textContent = `▶ ${item.nome}`;
  playerAudio.play().catch(() => {});
}

function pararMusica() {
  playerAudio.pause();
  playerAudio.removeAttribute("src");
  musicaAtual.textContent = "Nenhuma música selecionada";
}

function excluirMusica(id) {
  if (!confirm("Deseja realmente excluir esta música?")) return;
  const transacao = bancoDados.transaction(["musicas"], "readwrite");
  transacao.objectStore("musicas").delete(id);
  transacao.oncomplete = carregarMusicasDoMapa;
}
