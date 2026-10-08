import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Question } from '../../types';
import { auth } from '../../services/firebase';
import { assertCloudAccount } from '../../services/cloudAccountGuard';
import { StorageService } from '../../services/storageService';
import { openStudyPdf, readStudyPages } from '../../services/pdfReader';
import { selectPdfPages, splitStudyPages, type StudyChunk } from '../../services/pdfStudyText';

interface Summary { title: string; summary: string; keyPoints: string[]; excerpts: string[] }
interface SummaryResult { source: string; pages: number[]; content: Summary }
interface Props { onBulkAddQuestions: (questions: Partial<Question>[]) => number }
const field = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm';
const button = 'rounded-xl bg-teal-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50';

export default function PdfStudyView({ onBulkAddQuestions }: Props) {
  const doc = useRef<PDFDocumentProxy | null>(null);
  const controller = useRef<AbortController | null>(null);
  const operation = useRef(0);
  const saving = useRef(false);
  const [filename, setFilename] = useState('');
  const [total, setTotal] = useState(0);
  const [selection, setSelection] = useState('1');
  const [chunks, setChunks] = useState<StudyChunk[]>([]);
  const [blankPages, setBlankPages] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [count, setCount] = useState(3);
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [checked, setChecked] = useState<number[]>([]);
  const [summaries, setSummaries] = useState<SummaryResult[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveStarted, setSaveStarted] = useState(false);
  useEffect(() => () => { operation.current++; controller.current?.abort(); void doc.current?.loadingTask.destroy(); }, []);
  const cancel = () => { if (saving.current) return; operation.current++; controller.current?.abort(); setBusy(false); setProgress('Operação cancelada. Os resultados já concluídos permanecem disponíveis.'); };
  const clearResults = () => { setQuestions([]); setChecked([]); setSummaries([]); setSaved(false); setSaveStarted(false); };

  const load = async (file?: File) => {
    if (!file) return;
    controller.current?.abort();
    const id = ++operation.current;
    const previous = doc.current; doc.current = null;
    await previous?.loadingTask.destroy();
    if (id !== operation.current) return;
    setBusy(true); setError(''); setTotal(0); setChunks([]); setBlankPages([]); clearResults(); setFilename(''); setProgress('Abrindo PDF no dispositivo…');
    try {
      const opened = await openStudyPdf(file);
      if (id !== operation.current) { await opened.loadingTask.destroy(); return; }
      doc.current = opened;
      setFilename(file.name); setTotal(opened.numPages); setSelection(opened.numPages >= 3 ? '1-3' : `1-${opened.numPages}`);
      setProgress('PDF aberto. Escolha as páginas e clique em Ler páginas.');
    } catch (error) { if (id === operation.current) setError(error instanceof Error ? error.message : 'Não foi possível abrir o PDF.'); }
    finally { if (id === operation.current) setBusy(false); }
  };
  const read = async () => {
    if (!doc.current) return;
    const id = ++operation.current;
    const control = new AbortController(); controller.current = control;
    setBusy(true); setError(''); setChunks([]); setBlankPages([]); clearResults();
    try {
      const numbers = selectPdfPages(selection, total);
      const pages = await readStudyPages(doc.current, numbers, control.signal, done => { if (id === operation.current) setProgress(`Lendo página ${done} de ${numbers.length}…`); });
      if (id !== operation.current) return;
      setBlankPages(pages.filter(page => !page.text.trim()).map(page => page.page));
      setChunks(splitStudyPages(pages));
      setProgress('Texto extraído. Confira a prévia antes de enviar à IA.');
    } catch (error) { if (id === operation.current) setError(error instanceof Error ? error.message : 'Falha na leitura.'); }
    finally { if (id === operation.current) setBusy(false); }
  };
  const generate = async (kind: 'questions' | 'summary') => {
    const id = ++operation.current;
    const control = new AbortController(); controller.current = control;
    setBusy(true); setError('');
    if (kind === 'questions') { setQuestions([]); setChecked([]); setSaved(false); setSaveStarted(false); } else setSummaries([]);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Entre com sua conta para gerar conteúdo por IA.');
      const source = filename;
      for (let index = 0; index < chunks.length; index++) {
        control.signal.throwIfAborted();
        await assertCloudAccount(user.uid, () => auth.currentUser?.uid ?? null);
        const token = await user.getIdToken();
        if (auth.currentUser?.uid !== user.uid) throw new Error('A conta mudou. Entre novamente.');
        setProgress(`Gerando ${kind === 'questions' ? 'questões' : 'resumo'}: bloco ${index + 1} de ${chunks.length}…`);
        const chunk = chunks[index];
        const response = await fetch(kind === 'questions' ? '/api/ai/text-to-questions' : '/api/ai/summarize-text', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: chunk.text, count }), signal: control.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Falha ao gerar conteúdo.');
        await assertCloudAccount(user.uid, () => auth.currentUser?.uid ?? null);
        if (id !== operation.current) return;
        if (kind === 'questions') {
          const items: Partial<Question>[] = data.questions.map((question: Partial<Question>) => ({ ...question, origin: `PDF: ${source} | páginas ${chunk.pages.join(', ')} | bloco ${index + 1}`, observation: 'Gerada por IA a partir do trecho indicado. Revise o gabarito e a explicação antes de estudar.' }));
          setQuestions(previous => [...previous, ...items]);
        } else setSummaries(previous => [...previous, { source, pages: chunk.pages, content: data.summary }]);
      }
      setProgress('Geração concluída. Revise os resultados antes de salvar ou baixar.');
    } catch (error) {
      if (id === operation.current) setError((error instanceof Error ? error.message : 'Falha na geração.') + ' Resultados dos blocos concluídos foram preservados; uma nova geração começa do primeiro bloco.');
    } finally { if (id === operation.current) setBusy(false); }
  };
  const saveQuestions = async () => {
    const user = auth.currentUser;
    if (!user) { setError('Entre na conta original para salvar as questões geradas.'); return; }
    saving.current = true;
    setBusy(true); setError(''); setProgress('Confirmando gravação das questões…');
    try {
      await assertCloudAccount(user.uid, () => auth.currentUser?.uid ?? null);
      const selected = questions.filter((_question, index) => checked.includes(index));
      const added = onBulkAddQuestions(selected);
      setSaveStarted(true);
      await StorageService.flushWrites();
      setSaved(true); setProgress(`${added} questões confirmadas no armazenamento local.`);
    } catch (error) { setError((error instanceof Error ? error.message : 'Falha ao salvar.') + ' Não repita a adição: confira o banco e o armazenamento antes de tentar novamente.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const download = () => {
    const text = summaries.map(item => `# ${item.content.title}\n\nFonte: ${item.source} — páginas do arquivo ${item.pages.join(', ')}\n\n${item.content.summary}\n\n## Pontos-chave\n\n${item.content.keyPoints.map(point => '- ' + point).join('\n')}\n\n## Trechos da fonte\n\n${item.content.excerpts.map(quote => '> ' + quote).join('\n\n')}`).join('\n\n---\n\n');
    const blob = new Blob([text + '\n\nResumo gerado por IA. Confira o material original.\n'], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'memora-resumo-pdf.md'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="space-y-5 text-slate-900 dark:text-slate-100">
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
      <h2 className="font-bold text-lg">Estudar a partir de PDF</h2>
      <p className="text-sm text-slate-500">PDF com texto selecionável, até 20 MB e 500 páginas. O arquivo fica no dispositivo. Só os trechos escolhidos são enviados à IA quando você solicita uma geração.</p>
      <label className="block text-sm font-semibold">Selecionar PDF<input aria-label="Selecionar PDF" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void load(file); }} className="block w-full mt-2 text-sm" /></label>
      {total > 0 && <>
        <p className="text-sm break-all">{filename} · {total} páginas</p>
        <label className="block text-sm">Páginas do arquivo (até 10 por leitura)<input aria-label="Páginas do PDF" className={field + ' mt-1'} value={selection} disabled={busy} onChange={event => { setSelection(event.target.value); setChunks([]); setBlankPages([]); }} placeholder="1-3, 5" /></label>
        <button className={button} disabled={busy} onClick={() => void read()}>Ler páginas</button>
      </>}
      {busy && <button className="ml-3 underline text-sm" onClick={cancel}>Cancelar</button>}
      <p role="status" aria-live="polite" className="text-sm">{progress}</p>
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      {blankPages.length > 0 && <p className="text-sm text-amber-700 dark:text-amber-300">Sem texto nas páginas {blankPages.join(', ')}. Essas páginas não serão enviadas; OCR ainda não está disponível.</p>}
    </div>
    {chunks.length > 0 && <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <h3 className="font-bold">Prévia do material</h3>
      <p className="text-sm">{chunks.length} blocos · {chunks.reduce((sum, chunk) => sum + chunk.text.length, 0).toLocaleString('pt-BR')} caracteres. Cada botão faz {chunks.length} solicitações sequenciais à IA. A seleção inteira será processada, sem cortar o texto.</p>
      {chunks.map((chunk, index) => <details key={index}><summary className="cursor-pointer text-sm font-semibold">Bloco {index + 1} · páginas {chunk.pages.join(', ')}</summary><p className="whitespace-pre-wrap text-sm mt-2 max-h-64 overflow-auto">{chunk.text}</p></details>)}
      <label className="block text-sm">Questões por bloco<select aria-label="Questões por bloco" className={field + ' mt-1'} value={count} disabled={busy} onChange={event => setCount(Number(event.target.value))}>{[3, 5, 10].map(value => <option key={value} value={value}>{value} ({value * chunks.length} no total)</option>)}</select></label>
      <div className="flex gap-3 flex-wrap"><button className={button} disabled={busy} onClick={() => void generate('questions')}>Gerar questões do PDF</button><button className={button} disabled={busy} onClick={() => void generate('summary')}>Criar resumos por bloco</button></div>
      <p className="text-xs text-slate-500">Requer internet e conta vinculada. Revise a extração: colunas, tabelas e fórmulas podem perder a ordem. Resumos não substituem a leitura original.</p>
    </div>}
    {questions.length > 0 && <div className="space-y-4">
      <h3 className="font-bold">Revisar questões ({questions.length})</h3>
      <button disabled={busy || saveStarted} className="underline text-sm" onClick={() => setChecked(checked.length === questions.length ? [] : questions.map((_item, index) => index))}>Selecionar / desmarcar todas</button>
      {questions.map((question, index) => <article key={index} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm space-y-2">
        <label className="flex items-start gap-2"><input type="checkbox" aria-label={`Selecionar questão ${index + 1}`} disabled={busy || saveStarted} checked={checked.includes(index)} onChange={() => setChecked(previous => previous.includes(index) ? previous.filter(value => value !== index) : [...previous, index])} /><strong>{index + 1}. {question.question}</strong></label>
        {(['A', 'B', 'C', 'D'] as const).map(letter => <p key={letter}>{letter}) {String(question[`option${letter}`] || '')}</p>)}
        <p><strong>Gabarito: {question.correctOption}</strong> — {question.explanation}</p>
        <p className="text-xs text-slate-500 break-all">{question.origin}</p>
      </article>)}
      <button className={button} disabled={busy || saveStarted || checked.length === 0} onClick={() => void saveQuestions()}>{saved ? 'Questões salvas' : `Adicionar ${checked.length} selecionadas ao banco`}</button>
    </div>}
    {summaries.length > 0 && <div className="space-y-4"><h3 className="font-bold">Resumos para revisão</h3>
      {summaries.map((item, index) => <article key={index} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-sm"><h4 className="font-bold">{item.content.title}</h4><p className="text-xs break-all">{item.source} · páginas {item.pages.join(', ')}</p><p className="whitespace-pre-wrap">{item.content.summary}</p><ul className="list-disc pl-5 space-y-1">{item.content.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul>{item.content.excerpts.map((quote, i) => <blockquote key={i} className="border-l-2 border-teal-500 pl-3">“{quote}”</blockquote>)}</article>)}
      <button className={button} disabled={busy} onClick={download}>Baixar resumos para guardar offline</button><p className="text-xs text-slate-500">Os resumos ficam nesta tela até você sair. Baixe o arquivo para preservá-los; ainda não há biblioteca de resumos no aplicativo.</p>
    </div>}
  </section>;
}
