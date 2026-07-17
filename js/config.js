
// Configurações do site. Só isso aqui deveria precisar mudar quando
// implantar em outra escola ou em outro ano.
const CONFIG = {
  // Cole aqui a URL do "App da Web" que o Apps Script te deu (terminando em /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbz-kDhPh57MWEEi6_97ZxGbw-fT3-UMGkGgaEsYakCVUH6AV3x3mRhN6vvQVHQpkTwT/exec',

  // Ano letivo padrão mostrado ao abrir o site. Ajuste em janeiro de cada ano.
  ANO_LETIVO_ATUAL: 2026,

  BIMESTRES: [1, 2, 3, 4],

  STATUS_HABILIDADE: ['Superou', 'Alcançou', 'Alcançou parcialmente', 'Não alcançou'],
  CONCEITOS_GLOBAIS: ['I', 'R', 'B', 'MB']
};
