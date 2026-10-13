import { describe, expect, it } from 'vitest';
import {
  computeWatermarkTextLayout,
  createSeededRandom,
  MAX_WATERMARK_TEXT_LENGTH,
  WATERMARK_ANGLE_RADIANS,
  wrapWatermarkText,
} from './watermarkLayout';

const measure = (text: string, fontSize: number) => ({
  width: Array.from(text).length * fontSize * 0.55,
});

describe('watermark text layout', () => {
  it('wraps a French sentence without losing words', () => {
    const text = 'Document exclusivement destiné à la location pour le dossier de candidature';
    const lines = wrapWatermarkText(text, 18, 190, measure);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(text);
    lines.forEach(line => expect(measure(line, 18).width).toBeLessThanOrEqual(190));
  });

  it('segments an exceptionally long token instead of clipping it', () => {
    const text = 'anticonstitutionnellement'.repeat(3);
    const lines = wrapWatermarkText(text, 16, 120, measure);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(text);
    lines.forEach(line => expect(measure(line, 16).width).toBeLessThanOrEqual(120));
  });

  it('keeps a 120-character phrase inside the requested block', () => {
    const text = 'Une phrase de filigrane suffisamment longue pour vérifier le retour automatique et la lisibilité sur chaque document.'.slice(
      0,
      MAX_WATERMARK_TEXT_LENGTH
    );
    const layout = computeWatermarkTextLayout({
      text,
      baseFontSize: 28,
      minFontSize: 10,
      maxWidth: 260,
      maxHeight: 180,
      measure,
    });

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.width).toBeLessThanOrEqual(260);
    expect(layout.height).toBeLessThanOrEqual(180);
  });

  it('produces deterministic variations for the same seed', () => {
    const first = createSeededRandom('same-file');
    const second = createSeededRandom('same-file');
    const third = createSeededRandom('another-file');

    const firstValues = [first(), first(), first()];
    expect([second(), second(), second()]).toEqual(firstValues);
    expect([third(), third(), third()]).not.toEqual(firstValues);
  });

  it('keeps every watermark line on the same -45 degree diagonal', () => {
    expect(WATERMARK_ANGLE_RADIANS).toBe(-Math.PI / 4);
  });
});
