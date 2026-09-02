const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const MAX_SIZE_KB = 50;

function dataUriSizeKB(uri: string): number {
  const base64Len = uri.length - uri.indexOf(',') - 1;
  return (base64Len * 3) / 4 / 1024;
}

function compress(
  canvas: HTMLCanvasElement,
  targetKB: number,
  useAlpha: boolean,
): { dataURI: string; sizeKB: number; quality: number; canvas: HTMLCanvasElement; mimeType: string } {
  let mime = useAlpha ? 'image/png' : 'image/jpeg';
  if (!useAlpha) {
    try {
      const t = canvas.toDataURL('image/webp', 0.8);
      if (t.substring(5, 15) === 'image/webp') mime = 'image/webp';
    } catch {
      /* no webp */
    }
  }

  function search(c: HTMLCanvasElement, m: string, target: number) {
    let lo = 0.1,
      hi = 0.9,
      bestURI = '',
      bestKB = Infinity,
      bestQ = 0.5;
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2;
      const uri = c.toDataURL(m, q);
      const kb = dataUriSizeKB(uri);
      if (kb <= target) {
        bestURI = uri;
        bestKB = kb;
        bestQ = q;
        lo = q;
      } else hi = q;
    }
    return { dataURI: bestURI || c.toDataURL(m, bestQ), sizeKB: bestKB, quality: Math.round(bestQ * 100) };
  }

  let result = search(canvas, mime, targetKB);
  let cur = canvas;

  if (result.sizeKB > targetKB) {
    const minDim = useAlpha ? 256 : 320;
    for (let a = 0; a < 3 && result.sizeKB > targetKB; a++) {
      const scale = Math.sqrt(targetKB / result.sizeKB) * 0.85;
      const nw = Math.max(minDim, Math.round(cur.width * scale));
      const nh = Math.max(Math.round(minDim * 0.75), Math.round(cur.height * scale));
      if (nw >= cur.width && nh >= cur.height) break;
      const tmp = document.createElement('canvas');
      tmp.width = nw;
      tmp.height = nh;
      const ctx = tmp.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cur, 0, 0, nw, nh);
      result = search(tmp, mime, targetKB);
      cur = tmp;
    }
  }

  return { ...result, canvas: cur, mimeType: mime };
}

function hasAlpha(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = Math.min(img.width, 100);
    c.height = Math.min(img.height, 100);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  } catch {
    /* fallback */
  }
  return false;
}

export interface ProcessImageResult {
  dataURI: string;
  message?: string;
}

export function processImageFile(file: File): Promise<ProcessImageResult> {
  return new Promise((resolve, reject) => {
    const isSVG = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isImage =
      (file.type.startsWith('image/') && /^image\/(svg\+xml|jpeg|png|webp)$/.test(file.type)) || isSVG;
    if (!isImage) {
      reject(new Error('Please select an image file (SVG, JPG, PNG, or WebP).'));
      return;
    }

    const reader = new FileReader();

    if (isSVG) {
      reader.onload = (ev) => resolve({ dataURI: ev.target!.result as string });
      reader.onerror = () => reject(new Error('Error loading image.'));
      reader.readAsText(file);
      return;
    }

    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const alpha = hasAlpha(img);
        let canvas = document.createElement('canvas');
        let needsResize = false;
        const ow = img.width,
          oh = img.height;

        if (ow > MAX_WIDTH || oh > MAX_HEIGHT) {
          needsResize = true;
          let nw = ow,
            nh = oh;
          if (nw > MAX_WIDTH) {
            nh = (nh * MAX_WIDTH) / nw;
            nw = MAX_WIDTH;
          }
          if (nh > MAX_HEIGHT) {
            nw = (nw * MAX_HEIGHT) / nh;
            nh = MAX_HEIGHT;
          }
          canvas.width = Math.round(nw);
          canvas.height = Math.round(nh);
          const ctx = canvas.getContext('2d')!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } else {
          canvas.width = ow;
          canvas.height = oh;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
        }

        let bestMime = alpha ? 'image/png' : 'image/jpeg';
        let testURI: string | null = null;
        if (!alpha) {
          try {
            const t = canvas.toDataURL('image/webp', 0.8);
            if (t.substring(5, 15) === 'image/webp') {
              bestMime = 'image/webp';
              testURI = t;
            }
          } catch {
            /* no webp */
          }
        }
        if (!testURI) testURI = canvas.toDataURL(bestMime, 0.8);

        const initKB = dataUriSizeKB(testURI);
        const msgs: string[] = [];
        let dataURI: string, sizeKB: number;
        const origCanvas = canvas;

        if (initKB > MAX_SIZE_KB) {
          const c = compress(canvas, MAX_SIZE_KB, alpha);
          dataURI = c.dataURI;
          sizeKB = c.sizeKB;
          canvas = c.canvas;
          if (needsResize || c.canvas.width !== origCanvas.width) {
            msgs.push(
              `Image resized to ${c.canvas.width}×${c.canvas.height} and compressed to ${sizeKB.toFixed(1)} KB (${c.mimeType}, quality ${c.quality}%)`,
            );
          } else {
            msgs.push(`Image compressed to ${sizeKB.toFixed(1)} KB (${c.mimeType}, quality ${c.quality}%)`);
          }
        } else {
          dataURI = testURI;
          sizeKB = initKB;
          if (needsResize) msgs.push(`Image resized from ${ow}×${oh} to ${canvas.width}×${canvas.height}`);
        }

        if (sizeKB > MAX_SIZE_KB) {
          reject(new Error(`Image too large (${sizeKB.toFixed(1)} KB) even after compression. Use a smaller image.`));
          return;
        }

        resolve({ dataURI, message: msgs.length ? msgs.join(' ') : undefined });
      };
      img.onerror = () => reject(new Error('Error loading image.'));
      img.src = ev.target!.result as string;
    };
    reader.onerror = () => reject(new Error('Error loading image.'));
    reader.readAsDataURL(file);
  });
}
