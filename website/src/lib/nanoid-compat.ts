// nanoid v5 compatibility layer for Astro 6.x
// Astro 6.x expects nanoid v3 API (default export), but v5 uses named exports
// This is a minimal reimplementation to avoid module import issues

const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export function customAlphabet(alphabet: string, defaultSize = 21) {
  return (size = defaultSize) => {
    let id = '';
    let i = size | 0;
    while (i--) {
      id += alphabet[(Math.random() * alphabet.length) | 0];
    }
    return id;
  };
}

export function nanoid(size = 21) {
  let id = '';
  let i = size | 0;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
}

export default nanoid;
