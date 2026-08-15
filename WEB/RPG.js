const arquivoMapa = document.getElementById("arquivoMapa");
const mapa = document.getElementById("mapa");
const areaMapa = document.getElementById("areaMapa");
const mensagem = document.getElementById("mensagem");

const zoomMais = document.getElementById("zoomMais");
const zoomMenos = document.getElementById("zoomMenos");
const centralizar = document.getElementById("centralizar");
const telaCheia = document.getElementById("telaCheia");

let zoom = 1;

let posicaoX = 0;
let posicaoY = 0;

let arrastando = false;

let inicioX = 0;
let inicioY = 0;


/*
    CARREGAR MAPA
*/

arquivoMapa.addEventListener("change", function () {

    const arquivo = this.files[0];

    if (!arquivo) {
        return;
    }

    const imagem = URL.createObjectURL(arquivo);

    mapa.src = imagem;

    mapa.style.display = "block";

    mensagem.style.display = "none";

    centralizarMapa();
});


/*
    ATUALIZAR MAPA
*/

function atualizarMapa() {

    mapa.style.transform =
        `translate(${posicaoX}px, ${posicaoY}px) scale(${zoom})`;
}


/*
    ZOOM +
*/

zoomMais.addEventListener("click", function () {

    zoom += 0.1;

    atualizarMapa();
});


/*
    ZOOM -
*/

zoomMenos.addEventListener("click", function () {

    zoom -= 0.1;

    if (zoom < 0.1) {
        zoom = 0.1;
    }

    atualizarMapa();
});


/*
    CENTRALIZAR
*/

function centralizarMapa() {

    zoom = 1;

    posicaoX = 0;
    posicaoY = 0;

    atualizarMapa();
}

centralizar.addEventListener("click", centralizarMapa);


/*
    ARRASTAR MAPA
*/

areaMapa.addEventListener("mousedown", function (evento) {

    if (mapa.style.display === "none") {
        return;
    }

    arrastando = true;

    inicioX = evento.clientX - posicaoX;
    inicioY = evento.clientY - posicaoY;

    mapa.classList.add("arrastando");
});


document.addEventListener("mousemove", function (evento) {

    if (!arrastando) {
        return;
    }

    posicaoX = evento.clientX - inicioX;
    posicaoY = evento.clientY - inicioY;

    atualizarMapa();
});


document.addEventListener("mouseup", function () {

    arrastando = false;

    mapa.classList.remove("arrastando");
});


/*
    ZOOM COM A RODA DO MOUSE
*/

areaMapa.addEventListener("wheel", function (evento) {

    evento.preventDefault();

    if (evento.deltaY < 0) {

        zoom += 0.1;

    } else {

        zoom -= 0.1;

        if (zoom < 0.1) {
            zoom = 0.1;
        }
    }

    atualizarMapa();
});


/*
    TELA CHEIA
*/

telaCheia.addEventListener("click", function () {

    if (!document.fullscreenElement) {

        document.documentElement.requestFullscreen();

    } else {

        document.exitFullscreen();

    }
});