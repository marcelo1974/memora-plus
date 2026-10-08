export interface PdfPageText { page: number; text: string }
export interface StudyChunk { pages: number[]; text: string }
export const MAX_STUDY_CHARACTERS = 18000;
export const CHUNK_CHARACTERS = 6000;

export function selectPdfPages(selection: string, total: number): number[] {
  if (!selection.trim()) throw new Error('Informe as páginas, por exemplo: 1-3, 5.');
  const selected = new Set<number>();
  for (const item of selection.split(',')) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(item);
    if (!match) throw new Error('Use páginas ou intervalos, como 1-3, 5.');
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > total || end - start > 10) throw new Error(`Escolha até 10 páginas entre 1 e ${total}.`);
    for (let page = start; page <= end; page++) selected.add(page);
    if (selected.size > 10) throw new Error('Selecione no máximo 10 páginas por leitura.');
  }
  return [...selected].sort((a, b) => a - b);
}

export function splitStudyPages(pages: PdfPageText[]): StudyChunk[] {
  const normalized = pages.map(page => ({ ...page, text: page.text.replace(/\s+/g, ' ').trim() })).filter(page => page.text);
  const size = normalized.reduce((sum, page) => sum + page.text.length, 0);
  if (size > MAX_STUDY_CHARACTERS) throw new Error('O trecho supera 18.000 caracteres. Escolha menos páginas. Nenhum conteúdo foi enviado.');
  if (size < 20) throw new Error('Não há texto suficiente. Este PDF pode ser digitalizado; OCR ainda não está disponível.');
  const chunks: StudyChunk[] = [];
  for (const page of normalized) {
    let remaining = page.text;
    while (remaining) {
      let current = chunks[chunks.length - 1];
      if (!current || current.text.length >= CHUNK_CHARACTERS - 1) {
        current = { pages: [], text: '' }; chunks.push(current);
      }
      const space = CHUNK_CHARACTERS - current.text.length - (current.text ? 1 : 0);
      let take = Math.min(space, remaining.length);
      // Prefer word boundaries; never silently drop the remaining page text.
      if (take < remaining.length && take > 100) {
        const boundary = remaining.lastIndexOf(' ', take);
        if (boundary > take / 2) take = boundary;
      }
      const part = remaining.slice(0, take);
      current.text += (current.text ? ' ' : '') + part;
      if (!current.pages.includes(page.page)) current.pages.push(page.page);
      remaining = remaining.slice(take).trimStart();
      if (remaining && current.text.length < CHUNK_CHARACTERS - 1) {
        // Finish this chunk at a word boundary rather than splitting the next word.
        chunks.push({ pages: [], text: '' });
      }
    }
  }
  const result = chunks.filter(chunk => chunk.text);
  const last = result.at(-1), previous = result.at(-2);
  if (last && previous && last.text.length < 20) {
    const cut = previous.text.length - 100;
    last.text = previous.text.slice(cut) + ' ' + last.text;
    previous.text = previous.text.slice(0, cut);
    last.pages = [...new Set([...previous.pages, ...last.pages])];
  }
  return result;
}
