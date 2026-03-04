import { sets } from './state';
import { stripHtmlForPdf, el } from './utils';
import { sanitizeImageHtml } from './sanitize';
import { showToast } from './toast';
import { populateSetOptions, populateRoundOptions } from './select-helpers';

let previousFocus: HTMLElement | null = null;
let trapHandler: ((e: KeyboardEvent) => void) | null = null;

export function openPrintModal(): void {
  previousFocus = document.activeElement as HTMLElement | null;
  const modal = el('printModal');
  modal.style.display = 'flex';
  populatePrintSetSelect();
  updatePrintRoundSelect();

  const focusables = modal.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  trapHandler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  };
  modal.addEventListener('keydown', trapHandler);
  first?.focus();
}

export function closePrintModal(): void {
  const modal = el('printModal');
  if (trapHandler) { modal.removeEventListener('keydown', trapHandler); trapHandler = null; }
  modal.style.display = 'none';
  previousFocus?.focus();
  previousFocus = null;
}

export function populatePrintSetSelect(): void {
  populateSetOptions('printSetSelect');
}

export function updatePrintRoundSelect(): void {
  populateRoundOptions('printSetSelect', 'printRoundSelect', 'printRoundGroup');
}

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
          try { resolve(c.toDataURL('image/png')); } catch { resolve(null); }
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
        try { resolve(c.toDataURL('image/png')); } catch { resolve(null); }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
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

export async function generatePrintPdf(): Promise<void> {
  const setSelect = el<HTMLSelectElement>('printSetSelect');
  const roundSelect = el<HTMLSelectElement>('printRoundSelect');
  if (setSelect.value === '') { showToast('Please select a set', 'warning'); return; }

  const set = sets[parseInt(setSelect.value, 10)];
  let cards = [...set.cards];
  if (roundSelect.value) {
    cards = cards.filter((c) => c.roundId === roundSelect.value);
    if (cards.length === 0) { showToast('No cards in the selected round', 'warning'); return; }
  }

  // Dynamic import keeps jspdf out of the main bundle
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
    } catch { /* ignore */ }
  }

  function wrap(text: string, sz: number) {
    doc.setFontSize(sz);
    return doc.splitTextToSize(stripHtmlForPdf(text), maxW);
  }

  const imageDims = await Promise.all(resolvedImages.map((u) => getImageDimensions(u)));

  let y = brandingH;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const questions = (Array.isArray(card.questions) && card.questions.length
      ? card.questions : [{ text: '', order: 1 }])
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // Estimate height and page-break
    let estH = labelSz / 10 * lineH + 2 + titleSz / 10 * lineH;
    questions.forEach((q) => {
      const t = typeof q === 'string' ? q : q.text || '';
      if (t) estH += wrap(t, bodySz).length * (bodySz / 10 * lineH) + 4;
    });
    estH += 6 + titleSz / 10 * lineH;
    const ansLines = wrap(card.answer || '', bodySz);
    estH += ansLines.length * (bodySz / 10 * lineH);
    if (resolvedImages[i]) estH += 4 + maxImgH;

    if (y + estH > pageH - margin) { doc.addPage(); y = margin; }

    const x = margin;
    doc.setFontSize(labelSz);
    doc.setTextColor(100, 100, 100);
    doc.text(`Card ${i + 1} of ${cards.length}`, x, y);
    y += labelSz / 10 * lineH + 2;
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(titleSz);
    doc.text('Question', x, y);
    y += titleSz / 10 * lineH;
    doc.setFontSize(bodySz);
    questions.forEach((q) => {
      const t = typeof q === 'string' ? q : q.text || '';
      if (t) { const l = wrap(t, bodySz); doc.text(l, x, y); y += l.length * (bodySz / 10 * lineH) + 4; }
    });
    y += 6;

    doc.setFontSize(titleSz);
    doc.text('Answer', x, y);
    y += titleSz / 10 * lineH;
    doc.setFontSize(bodySz);
    doc.text(ansLines, x, y);
    y += ansLines.length * (bodySz / 10 * lineH);

    if (card.doNotAccept?.trim()) {
      y += 6;
      doc.setFontSize(labelSz);
      doc.setTextColor(120, 120, 120);
      doc.text('Do not accept: ' + stripHtmlForPdf(card.doNotAccept), x, y);
      doc.setTextColor(0, 0, 0);
      y += labelSz / 10 * lineH + 2;
    }

    const imgUri = resolvedImages[i];
    if (imgUri) {
      y += 4;
      try {
        const dim = imageDims[i];
        let iw = maxW, ih = maxImgH;
        if (dim.w && dim.h) {
          const sc = Math.min(maxW / dim.w, maxImgH / dim.h);
          iw = dim.w * sc; ih = dim.h * sc;
        }
        doc.addImage(imgUri, 'PNG', x, y, iw, ih);
        y += ih;
      } catch { y += 10; }
    }
    y += cardGap;
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  closePrintModal();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
