class ControleMapa:
    def __init__(self, mapa):
        self.mapa = mapa

    def mover_mapa(self, x, y):
        self.mapa.posicao_x += x
        self.mapa.posicao_y += y

    def aumentar_zoom(self):
        self.mapa.zoom_in()

    def diminuir_zoom(self):
        self.mapa.zoom_out()