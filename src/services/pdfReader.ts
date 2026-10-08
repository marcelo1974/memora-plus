import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfPageText } from './pdfStudyText';
GlobalWorkerOptions.workerSrc = workerUrl;

export async function openStudyPdf(file: File): Promise<PDFDocumentProxy> {
  if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Selecione um arquivo PDF.');
  if (file.size > 20 * 1024 * 1024) throw new Error('O PDF deve ter até 20 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error('O arquivo não possui uma assinatura PDF válida.');
  const task = getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, standardFontDataUrl: '/pdf-fonts/' });
  try {
    const doc = await task.promise;
    if (doc.numPages > 500) { await doc.loadingTask.destroy(); throw new Error('Use um PDF com até 500 páginas ou divida o documento.'); }
    return doc;
  } catch (error) {
    await task.destroy();
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('PDF protegido por senha. Envie uma cópia desbloqueada.');
    throw error;
  }
}

export async function readStudyPages(doc: PDFDocumentProxy, numbers: number[], signal: AbortSignal, progress: (done: number) => void): Promise<PdfPageText[]> {
  const pages: PdfPageText[] = [];
  for (const number of numbers) {
    signal.throwIfAborted();
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    signal.throwIfAborted();
    const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
    page.cleanup();
    pages.push({ page: number, text }); progress(pages.length);
  }
  return pages;
}
