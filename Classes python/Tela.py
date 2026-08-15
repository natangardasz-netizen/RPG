class Tela:
    def __init__(self, largura, altura):
        self.largura = largura
        self.altura = altura
        self.tela_cheia = False

    def entrar_tela_cheia(self):
        self.tela_cheia = True

    def sair_tela_cheia(self):
        self.tela_cheia = False

    def atualizar(self):
        pass