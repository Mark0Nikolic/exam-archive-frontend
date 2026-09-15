const digraphs: Record<string, string> = {
  DŽ: 'Џ',
  Dž: 'Џ',
  dž: 'џ',
  LJ: 'Љ',
  Lj: 'Љ',
  lj: 'љ',
  NJ: 'Њ',
  Nj: 'Њ',
  nj: 'њ',
}

const letters: Record<string, string> = {
  A: 'А',
  a: 'а',
  B: 'Б',
  b: 'б',
  C: 'Ц',
  c: 'ц',
  Č: 'Ч',
  č: 'ч',
  Ć: 'Ћ',
  ć: 'ћ',
  D: 'Д',
  d: 'д',
  Đ: 'Ђ',
  đ: 'ђ',
  E: 'Е',
  e: 'е',
  F: 'Ф',
  f: 'ф',
  G: 'Г',
  g: 'г',
  H: 'Х',
  h: 'х',
  I: 'И',
  i: 'и',
  J: 'Ј',
  j: 'ј',
  K: 'К',
  k: 'к',
  L: 'Л',
  l: 'л',
  M: 'М',
  m: 'м',
  N: 'Н',
  n: 'н',
  O: 'О',
  o: 'о',
  P: 'П',
  p: 'п',
  R: 'Р',
  r: 'р',
  S: 'С',
  s: 'с',
  Š: 'Ш',
  š: 'ш',
  T: 'Т',
  t: 'т',
  U: 'У',
  u: 'у',
  V: 'В',
  v: 'в',
  Z: 'З',
  z: 'з',
  Ž: 'Ж',
  ž: 'ж',
}

const cyrillicLetters: Record<string, string> = Object.fromEntries(
  Object.entries(letters).map(([latin, cyrillic]) => [cyrillic, latin]),
)

const cyrillicDigraphs: Record<string, string> = {
  Џ: 'Dž',
  џ: 'dž',
  Љ: 'Lj',
  љ: 'lj',
  Њ: 'Nj',
  њ: 'nj',
}

function transliterateLatinChunk(value: string) {
  let result = ''

  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2)
    if (digraphs[pair]) {
      result += digraphs[pair]
      index += 1
    } else {
      result += letters[value[index]] ?? value[index]
    }
  }

  return result
}

export function latinToCyrillic(value: string) {
  return value
    .split(/(\{\{[^}]+\}\})/)
    .map((part) => (part.startsWith('{{') ? part : transliterateLatinChunk(part)))
    .join('')
}

export function cyrillicToLatin(value: string) {
  return [...value].map((character) => cyrillicDigraphs[character] ?? cyrillicLetters[character] ?? character).join('')
}

export function hasCyrillic(value: string) {
  return /[\u0400-\u04FF]/.test(value)
}

export function toSerbianScript(value: string, script: 'sr-Latn' | 'sr-Cyrl') {
  if (script === 'sr-Cyrl') return hasCyrillic(value) ? value : latinToCyrillic(value)
  return hasCyrillic(value) ? cyrillicToLatin(value) : value
}

export function transliterateResource<T>(value: T): T {
  if (typeof value === 'string') return latinToCyrillic(value) as T
  if (Array.isArray(value)) return value.map(transliterateResource) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, transliterateResource(entry)]),
    ) as T
  }
  return value
}
