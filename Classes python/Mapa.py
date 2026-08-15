class Mapa:
    def __init__(self, nome, caminho):
        self.nome = nome
        self.caminho = caminho
        self.zoom = 1.0
        self.posicao_x = 0
        self.posicao_y = 0

    def carregar(self):
        pass

    def exibir(self):
        pass

    def zoom_in(self):
        self.zoom += 0.1

    def zoom_out(self):
        self.zoom -= 0.1
        
