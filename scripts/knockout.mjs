/**
 * Knocks a flat studio background out of a portrait: flood-fills from the
 * border, treating any pixel close in colour to its background neighbour as
 * background, and feathers the edge. Works on RGBA byte arrays so the same
 * idea runs in the browser (lib/facepack.ts) and here under sharp.
 *
 * `data` is mutated in place (alpha channel). Returns how many pixels were cleared.
 */
export function knockoutBackground(data, width, height, { tolerance = 24, feather = 14 } = {}) {
  const n = width * height
  const visited = new Uint8Array(n)
  const dist = new Float32Array(n)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const push = (i) => {
    visited[i] = 1
    queue[tail++] = i
  }
  // Seeds: the whole border. Their reference colour is themselves.
  // Reference = median colour of the border; every pixel is judged against it.
  const border = []
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x)
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1)
  const channel = (c) => {
    const values = border.map((i) => data[i * 4 + c]).sort((a, b) => a - b)
    return values[Math.floor(values.length / 2)]
  }
  const ref = [channel(0), channel(1), channel(2)]
  // A chroma-key ground (saturated green) is far from any skin or hair, so
  // plain RGB distance with a wide net does it. A grey studio ground is grainy
  // and close in RGB to dark hair, so it is judged on lightness with the extra
  // demand that a background pixel be nearly colourless — hair and skin are not.
  const chroma = Math.max(...ref) - Math.min(...ref)
  const greenKey = ref[1] > 120 && ref[1] - Math.max(ref[0], ref[2]) > 60
  if (greenKey) {
    tolerance = Math.max(tolerance, 70)
    feather = Math.max(feather, 25)
  }
  const refL = (ref[0] + ref[1] + ref[2]) / 3
  const distToRef = (i) => {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    if (greenKey || chroma > 24) {
      const dr = r - ref[0]
      const dg = g - ref[1]
      const db = b - ref[2]
      return Math.sqrt(dr * dr + dg * dg + db * db)
    }
    const pixelChroma = Math.max(r, g, b) - Math.min(r, g, b)
    if (pixelChroma > 22) return 999
    return Math.abs((r + g + b) / 3 - refL)
  }
  for (const i of border) {
    const d = distToRef(i)
    if (d <= tolerance + feather && !visited[i]) {
      dist[i] = d
      push(i)
    }
  }
  let cleared = 0
  while (head < tail) {
    const i = queue[head++]
    const x = i % width
    const y = (i - x) / width
    const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]
    for (const j of neighbours) {
      if (j < 0 || visited[j]) continue
      const d = distToRef(j)
      if (d <= tolerance + feather) {
        dist[j] = d
        push(j)
      }
    }
  }
  // Opening (erode, then dilate) on the background mask: thin tendrils that
  // crept into hair highlights or shirt folds vanish, the open ground stays.
  const RADIUS = 2
  const erode = (src) => {
    const out = new Uint8Array(n)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let keep = 1
        for (let dy = -RADIUS; dy <= RADIUS && keep; dy++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const xx = x + dx
            const yy = y + dy
            // Outside the image counts as background, so the border stays open.
            if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
            if (!src[yy * width + xx]) {
              keep = 0
              break
            }
          }
        }
        out[y * width + x] = keep
      }
    }
    return out
  }
  const dilate = (src) => {
    const out = new Uint8Array(n)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let hit = 0
        for (let dy = -RADIUS; dy <= RADIUS && !hit; dy++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
            if (src[yy * width + xx]) {
              hit = 1
              break
            }
          }
        }
        out[y * width + x] = hit
      }
    }
    return out
  }
  const opened = dilate(erode(visited))
  for (let i = 0; i < n; i++) {
    if (!opened[i]) continue
    const d = dist[i]
    const alpha = d <= tolerance ? 0 : Math.round((255 * (d - tolerance)) / feather)
    if (alpha < data[i * 4 + 3]) {
      data[i * 4 + 3] = alpha
      cleared += 1
    }
  }
  return cleared
}
