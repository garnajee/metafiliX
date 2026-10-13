export const MAX_WATERMARK_TEXT_LENGTH = 120;

export interface TextMeasurement {
  width: number;
}

export interface WatermarkTextLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
}

export interface LayoutOptions {
  text: string;
  baseFontSize: number;
  minFontSize: number;
  maxWidth: number;
  maxHeight: number;
  measure: (text: string, fontSize: number) => TextMeasurement;
}

const getGraphemes = (value: string): string[] => {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), segment => segment.segment);
  }

  return Array.from(value);
};

const splitLongWord = (
  word: string,
  fontSize: number,
  maxWidth: number,
  measure: LayoutOptions['measure']
): string[] => {
  const chunks: string[] = [];
  let current = '';

  getGraphemes(word).forEach(grapheme => {
    const candidate = `${current}${grapheme}`;
    if (current && measure(candidate, fontSize).width > maxWidth) {
      chunks.push(current);
      current = grapheme;
    } else {
      current = candidate;
    }
  });

  if (current) chunks.push(current);
  return chunks;
};

export const wrapWatermarkText = (
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: LayoutOptions['measure']
): string[] => {
  const normalized = text
    .slice(0, MAX_WATERMARK_TEXT_LENGTH)
    .replace(/[\t\f\v ]+/g, ' ')
    .trim();

  if (!normalized) return [];

  const lines: string[] = [];
  const paragraphs = normalized.split(/\r?\n/);

  paragraphs.forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    let current = '';
    words.forEach(word => {
      const chunks = measure(word, fontSize).width > maxWidth
        ? splitLongWord(word, fontSize, maxWidth, measure)
        : [word];

      chunks.forEach((chunk, chunkIndex) => {
        const separator = current && chunkIndex === 0 ? ' ' : '';
        const candidate = `${current}${separator}${chunk}`;
        if (current && measure(candidate, fontSize).width > maxWidth) {
          lines.push(current);
          current = chunk;
        } else {
          current = candidate;
        }
      });
    });

    if (current) lines.push(current);
  });

  return lines;
};

export const computeWatermarkTextLayout = (options: LayoutOptions): WatermarkTextLayout => {
  const {
    text,
    baseFontSize,
    minFontSize,
    maxWidth,
    maxHeight,
    measure,
  } = options;

  let fontSize = Math.max(minFontSize, baseFontSize);
  let lines: string[] = [];
  let lineHeight = fontSize * 1.18;
  let height = 0;

  while (fontSize >= minFontSize) {
    lines = wrapWatermarkText(text, fontSize, maxWidth, measure);
    lineHeight = fontSize * 1.18;
    height = Math.max(fontSize, lines.length * lineHeight);
    if (height <= maxHeight) break;
    fontSize = Math.max(minFontSize, fontSize - Math.max(0.5, baseFontSize * 0.035));
    if (fontSize === minFontSize) {
      lines = wrapWatermarkText(text, fontSize, maxWidth, measure);
      lineHeight = fontSize * 1.18;
      height = Math.max(fontSize, lines.length * lineHeight);
      break;
    }
  }

  const width = lines.reduce(
    (widest, line) => Math.max(widest, measure(line, fontSize).width),
    0
  );

  return { lines, fontSize, lineHeight, width, height };
};

export const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededVariation = (
  random: () => number,
  magnitude: number
): number => (random() - 0.5) * magnitude;
