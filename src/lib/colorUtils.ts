export function getNewShades(color: string | [number, number, number], magnitude: number) {
  let inputIsString = false,
    inputHasHash = false;
  if (typeof color === 'string') {
    inputIsString = true;
    if (color.startsWith('#')) {
      inputHasHash = true;
      color = color.slice(1);
    }
    if (color.length === 3) {
      color = color
        .split('')
        .map(c => c + c)
        .join('');
    }
    if (color.length !== 6 || !/^[0-9a-fA-F]+$/.test(color)) {
      throw new Error('Invalid color value');
    }
    color = color.match(/.{2}/g)!.map(c => parseInt(c, 16)) as [number, number, number];
  }

  const [r, g, b] = color as [number, number, number];
  const rNew = Math.max(0, Math.min(255, r + magnitude));
  const gNew = Math.max(0, Math.min(255, g + magnitude));
  const bNew = Math.max(0, Math.min(255, b + magnitude));
  const newColor = [rNew, gNew, bNew] as [number, number, number];

  return inputIsString ? (inputHasHash ? '#' : '') + newColor.map(c => c.toString(16).padStart(2, '0')).join('') : newColor;
}

export function isBright(color: string) {
  const [r, g, b] = color.match(/\w\w/g)!.map(c => parseInt(c, 16));
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}

export function getFocusedColor(color: string) {
  return isBright(color) ? getNewShades(color, 30) : getNewShades(color, -30);
}
