export const rgbToHex = (r, g, b) => '#' + [r, g, b]
    .map(x => x.toString(16).padStart(2, '0')).join('')

export const hexToRgb = hex =>
  hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
             ,(m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16))

export const interpolateHex = (parameter, hex1, hex2) => {
  return rgbToHex(...interpolateRgb(parameter, hexToRgb(hex1), hexToRgb(hex2)))
}

export const interpolateRgb = (parameter, rgb1, rgb2) => {
  const p = parameter < 0 ? 0 : parameter > 1 ? 1 : parameter
  return rgb1.map((c, i) => Math.round(c*(1-p) + rgb2[i]*p))
}