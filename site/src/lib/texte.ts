/**
 * Une chaîne ramenée à ce qu'on tape : minuscules, sans accents, apostrophes
 * droites. « Lévis » se trouve en tapant « levis ».
 */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
