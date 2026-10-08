export function validateStudyQuestions(value: unknown, count: number): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length !== count) throw new Error('Resposta incompleta da IA. Tente novamente.');
  const required = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'];
  return value.map(item => {
    if (!item || typeof item !== 'object' || required.some(key => typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 12000) || !['A', 'B', 'C', 'D'].includes(item.correctOption)) throw new Error('Questão inválida devolvida pela IA.');
    return item;
  });
}
export function validateStudySummary(value: unknown, source: string): { title: string; summary: string; keyPoints: string[]; excerpts: string[] } {
  const item = value as { title?: unknown; summary?: unknown; keyPoints?: unknown; excerpts?: unknown };
  if (!item || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 || typeof item.summary !== 'string' || !item.summary.trim() || item.summary.length > 8000 ||
    !Array.isArray(item.keyPoints) || item.keyPoints.length < 1 || item.keyPoints.length > 10 || item.keyPoints.some(point => typeof point !== 'string' || !point.trim() || point.length > 800) ||
    !Array.isArray(item.excerpts) || item.excerpts.length > 3 || item.excerpts.some(quote => typeof quote !== 'string' || quote.length < 10 || quote.length > 250 || !source.includes(quote))) throw new Error('O resumo não pôde ser validado com o texto de origem. Tente novamente.');
  return { title: item.title, summary: item.summary, keyPoints: item.keyPoints as string[], excerpts: item.excerpts as string[] };
}
