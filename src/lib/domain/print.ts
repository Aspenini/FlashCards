import type { FlashCardSet } from '../types';
import { sanitizeImageHtml } from './sanitize';
import { stripHtmlForPdf } from './utils';

function resolveImageToDataUri(imageStr: string): Promise<string | null> {
  if (!imageStr?.trim()) return Promise.resolve(null);
  const s = imageStr.trim();

  if (s.startsWith('data:image/')) {
    if (s.startsWith('data:image/svg')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          c.getContext('2d')!.drawImage(img, 0, 0);
          try {
            resolve(c.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = s;
      });
    }
    return Promise.resolve(s);
  }

  if (s.startsWith('<svg')) {
    const sanitized = sanitizeImageHtml(s);
    if (!sanitized) return Promise.resolve(null);
    return new Promise((resolve) => {
      const blob = new Blob([sanitized], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext('2d')!.drawImage(img, 0, 0);
        try {
          resolve(c.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  return Promise.resolve(null);
}

function getImageDimensions(uri: string | null): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    if (!uri) return resolve({ w: 0, h: 0 });
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = uri;
  });
}

export async function generatePrintPdf(set: FlashCardSet, roundId = ''): Promise<void> {
  let cards = [...set.cards];
  if (roundId) {
    cards = cards.filter((c) => c.roundId === roundId);
    if (cards.length === 0) throw new Error('No cards in the selected round');
  }

  const { jsPDF } = await import('jspdf');
  const resolvedImages = await Promise.all(cards.map((c) => resolveImageToDataUri(c.image || '')));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - margin * 2;
  const lineH = 7;
  const titleSz = 12;
  const bodySz = 9;
  const labelSz = 8;
  const cardGap = 10;
  const maxImgH = 40;
  const logoMaxH = 25;

  doc.setFont('helvetica', 'normal');

  let brandingH = margin;
  const logoEl = document.getElementById('pdfLogo') as HTMLImageElement | null;
  let logoImg: HTMLImageElement | null =
    logoEl && logoEl.complete && logoEl.naturalWidth ? logoEl : null;
  if (!logoImg) {
    logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = new URL('img/logo.png', window.location.href).href;
    });
  }
  if (logoImg?.naturalWidth && logoImg.naturalHeight) {
    try {
      const sc = Math.min(maxW / logoImg.naturalWidth, logoMaxH / logoImg.naturalHeight);
      const w = logoImg.naturalWidth * sc;
      const h = logoImg.naturalHeight * sc;
      doc.addImage(logoImg, 'PNG', margin, margin, w, h);
      brandingH = margin + h + 8;
    } catch {
      /* ignore */
    }
  }

  function wrap(text: string, sz: number) {
    doc.setFontSize(sz);
    return doc.splitTextToSize(stripHtmlForPdf(text), maxW);
  }

  const imageDims = await Promise.all(resolvedImages.map((u) => getImageDimensions(u)));

  let y = brandingH;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const questions = (
      Array.isArray(card.questions) && card.questions.length ? card.questions : [{ text: '', order: 1 }]
    ).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    let estH = (labelSz / 10) * lineH + 2 + (titleSz / 10) * lineH;
    questions.forEach((q) => {
      const t = typeof q === 'string' ? q : q.text || '';
      if (t) estH += wrap(t, bodySz).length * ((bodySz / 10) * lineH) + 4;
    });
    estH += 6 + (titleSz / 10) * lineH;
    const ansLines = wrap(card.answer || '', bodySz);
    estH += ansLines.length * ((bodySz / 10) * lineH);
    if (resolvedImages[i]) estH += 4 + maxImgH;

    if (y + estH > pageH - margin) {
      doc.addPage();
      y = margin;
    }

    const x = margin;
    doc.setFontSize(labelSz);
    doc.setTextColor(100, 100, 100);
    doc.text(`Card ${i + 1} of ${cards.length}`, x, y);
    y += (labelSz / 10) * lineH + 2;
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(titleSz);
    doc.text('Question', x, y);
    y += (titleSz / 10) * lineH;
    doc.setFontSize(bodySz);
    questions.forEach((q) => {
      const t = typeof q === 'string' ? q : q.text || '';
      if (t) {
        const l = wrap(t, bodySz);
        doc.text(l, x, y);
        y += l.length * ((bodySz / 10) * lineH) + 4;
      }
    });
    y += 6;

    doc.setFontSize(titleSz);
    doc.text('Answer', x, y);
    y += (titleSz / 10) * lineH;
    doc.setFontSize(bodySz);
    doc.text(ansLines, x, y);
    y += ansLines.length * ((bodySz / 10) * lineH);

    if (card.doNotAccept?.trim()) {
      y += 6;
      doc.setFontSize(labelSz);
      doc.setTextColor(120, 120, 120);
      doc.text('Do not accept: ' + stripHtmlForPdf(card.doNotAccept), x, y);
      doc.setTextColor(0, 0, 0);
      y += (labelSz / 10) * lineH + 2;
    }

    const imgUri = resolvedImages[i];
    if (imgUri) {
      y += 4;
      try {
        const dim = imageDims[i];
        let iw = maxW,
          ih = maxImgH;
        if (dim.w && dim.h) {
          const sc = Math.min(maxW / dim.w, maxImgH / dim.h);
          iw = dim.w * sc;
          ih = dim.h * sc;
        }
        doc.addImage(imgUri, 'PNG', x, y, iw, ih);
        y += ih;
      } catch {
        y += 10;
      }
    }
    y += cardGap;
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
