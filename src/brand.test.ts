import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const theme = readFileSync(new URL('./styles-opuz.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
const data = readFileSync(new URL('./data/demo.ts', import.meta.url), 'utf8');
const analytics = readFileSync(new URL('./lib/analytics.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('Opuz Engenharia | official customer-first visual language', () => {
  it('keeps only the small ArtiSys A symbol instead of a large vendor wordmark', () => {
    expect(app).toContain('className="brand-icon" src="./artisys-icon.svg"');
    expect(app).not.toContain('brand-module');
    expect(app).not.toContain('src="./artisys-logo.svg"');
    expect(app).toContain('Opuz Engenharia');
  });
  it('applies the Opuz wine-and-white palette after the legacy stylesheet', () => {
    expect(main).toMatch(/import '\.\/styles\.css';\s*import '\.\/styles-opuz\.css';/);
    expect(theme).toContain('--opuz-bordeaux: #641a14');
    expect(theme).toContain('--opuz-paper: #faf9f7');
    expect(theme).toContain('--opuz-rust: #a64b3e');
    expect(theme).toContain('.sidebar');
    expect(theme).toContain('.hero');
    expect(theme).toContain('.stat-card');
    expect(theme).toContain('.panel');
    expect(theme).toContain('.dropzone');
    expect(theme).not.toContain('#af58ff');
  });
  it('uses condensed uppercase headlines and readable body typography', () => {
    expect(theme).toContain('Oswald');
    expect(theme).toContain('Roboto');
    expect(theme).toMatch(/\.hero h2\s*\{/);
    expect(theme).toMatch(/text-transform:\s*uppercase/);
  });
  it('updates all chart accent colors to the Opuz palette', () => {
    expect(analytics).toContain("Máquinas: '#721f19'");
    expect(data).toContain("accent: '#721f19'");
    expect(app).toContain("stroke=\"#721f19\"");
    expect(app).not.toContain('#af58ff');
  });
  it('keeps the demo notices and branding discreet', () => {
    expect(app).toContain('Dados 100% simulados');
    expect(app).toContain('OPUZ ENGENHARIA · VISÃO OPERACIONAL');
    expect(html).toContain('content="#641a14"');
  });
});
