import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts');
mkdirSync('public/pdf-fonts', { recursive: true });
cpSync(source, 'public/pdf-fonts', { recursive: true });
