import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('Opuz client-first ArtiSys brand', () => {
  it('shows the official ArtiSys A symbol instead of the full vendor wordmark', () => {
    expect(app).toContain('className="brand-icon" src="./artisys-icon.svg"');
    expect(app).not.toContain('src="./artisys-logo.svg"');
    expect(app).not.toContain('<strong>arti<span>sys</span>');
  });
  it('gives the customer the navigation and hero priority', () => {
    expect(app).toContain('OPUZ ENGENHARIA · VISÃO OPERACIONAL');
    expect(app).toContain('Opuz Engenharia');
    expect(app).not.toContain('Conhecer ArtiSys <ArrowUpRight');
  });
  it('loads the dark ArtiSys violet and blue palette instead of mint', () => {
    expect(css).toContain('--brand-violet:#af58ff');
    expect(css).toContain('--brand-blue:#2864ed');
    expect(css).not.toMatch(/#(?:6adfc4|76e5c9|79e4ca|58d7bb|69d9bf)\b/i);
    expect(app).not.toContain('#6adfc4');
    expect(html).toContain('#0a0716');
  });
});
