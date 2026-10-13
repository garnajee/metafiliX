import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { WatermarkSettings } from '../types';
import {
  computeWatermarkTextLayout,
  createSeededRandom,
  seededVariation,
  WatermarkTextLayout,
} from './watermarkLayout';

const MAX_CANVAS_DIMENSION = 4096;
const LUMINANCE_MAP_SIZE = 96;
const ZERO_DATE = new Date(0);
const WATERMARK_FONT = 'Arial, Helvetica, sans-serif';

export interface LuminanceMap {
  width: number;
  height: number;
  values: Float32Array;
}

interface WatermarkLayer {
  angle: number;
  fontScale: number;
  opacityScale: number;
  spacingScale: number;
  offsetScale: number;
}

const WATERMARK_LAYERS: WatermarkLayer[] = [
  { angle: -Math.PI / 4, fontScale: 1, opacityScale: 1, spacingScale: 1, offsetScale: 0 },
  { angle: -Math.PI / 7, fontScale: 0.72, opacityScale: 0.52, spacingScale: 1.3, offsetScale: 0.55 },
];

const applyMetadataPolicy = (pdfDoc: PDFDocument, removeMetadata: boolean) => {
  if (!removeMetadata) return;
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('MetafiliX');
  pdfDoc.setCreator('');
  pdfDoc.setCreationDate(ZERO_DATE);
  pdfDoc.setModificationDate(ZERO_DATE);
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Échec de l’export du canvas'));
  }, type, quality);
});

const pdfBytesToBlob = (bytes: Uint8Array): Blob => {
  const copy = Uint8Array.from(bytes);
  return new Blob([copy.buffer], { type: 'application/pdf' });
};

const createLuminanceMap = (
  canvas: HTMLCanvasElement,
  width = LUMINANCE_MAP_SIZE
): LuminanceMap | null => {
  const ratio = canvas.height / Math.max(1, canvas.width);
  const height = Math.max(1, Math.round(width * ratio));
  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = width;
  analysisCanvas.height = height;
  const analysisContext = analysisCanvas.getContext('2d', { willReadFrequently: true });
  if (!analysisContext) return null;

  analysisContext.drawImage(canvas, 0, 0, width, height);
  const pixels = analysisContext.getImageData(0, 0, width, height).data;
  const values = new Float32Array(width * height);

  for (let index = 0; index < values.length; index += 1) {
    const pixelIndex = index * 4;
    const alpha = pixels[pixelIndex + 3] / 255;
    const luminance = (
      0.2126 * pixels[pixelIndex]
      + 0.7152 * pixels[pixelIndex + 1]
      + 0.0722 * pixels[pixelIndex + 2]
    ) / 255;
    values[index] = alpha < 0.05 ? 1 : luminance;
  }

  return { width, height, values };
};

const sampleLuminance = (
  map: LuminanceMap | null,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): number => {
  if (!map) return 0.85;
  const mapX = Math.max(0, Math.min(map.width - 1, Math.round((x / canvasWidth) * (map.width - 1))));
  const mapY = Math.max(0, Math.min(map.height - 1, Math.round((y / canvasHeight) * (map.height - 1))));
  return map.values[mapY * map.width + mapX] ?? 0.85;
};

const createTextTile = (
  layout: WatermarkTextLayout,
  settings: WatermarkSettings,
  outlineColor: string
): HTMLCanvasElement => {
  const padding = Math.max(4, layout.fontSize * 0.32);
  const tile = document.createElement('canvas');
  tile.width = Math.max(1, Math.ceil(layout.width + padding * 2));
  tile.height = Math.max(1, Math.ceil(layout.height + padding * 2));
  const context = tile.getContext('2d');
  if (!context) throw new Error('Contexte canvas indisponible');

  context.font = `700 ${layout.fontSize}px ${WATERMARK_FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1, layout.fontSize * 0.08);
  context.strokeStyle = outlineColor;
  context.fillStyle = settings.color;

  layout.lines.forEach((line, index) => {
    const y = padding + layout.lineHeight * (index + 0.5);
    context.strokeText(line, tile.width / 2, y);
    context.fillText(line, tile.width / 2, y);
  });

  if (settings.security.addNoise) {
    context.save();
    context.globalCompositeOperation = 'source-atop';
    context.strokeStyle = outlineColor;
    context.globalAlpha = 0.28;
    context.lineWidth = Math.max(0.75, layout.fontSize * 0.035);
    const spacing = Math.max(5, layout.fontSize * 0.28);
    for (let x = -tile.height; x < tile.width + tile.height; x += spacing) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x - tile.height, tile.height);
      context.stroke();
    }
    context.restore();
  }

  return tile;
};

const getCanvasPoint = (
  x: number,
  y: number,
  angle: number,
  width: number,
  height: number
) => ({
  x: width / 2 + Math.cos(angle) * x - Math.sin(angle) * y,
  y: height / 2 + Math.sin(angle) * x + Math.cos(angle) * y,
});

export const drawSecureWatermarkOnCanvas = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: WatermarkSettings,
  seed: string,
  suppliedLuminanceMap?: LuminanceMap | null
) => {
  if (!settings.text.trim() || width <= 0 || height <= 0) return;

  const luminanceMap = suppliedLuminanceMap === undefined
    ? createLuminanceMap(context.canvas)
    : suppliedLuminanceMap;
  const shorterSide = Math.min(width, height);
  const longerSide = Math.max(width, height);
  const diagonal = Math.hypot(width, height);

  WATERMARK_LAYERS.forEach((layer, layerIndex) => {
    const baseFontSize = longerSide * 0.035 * settings.size * layer.fontScale;
    const minFontSize = Math.max(8, shorterSide * 0.018 * layer.fontScale);
    const measure = (value: string, fontSize: number) => {
      context.font = `700 ${fontSize}px ${WATERMARK_FONT}`;
      return context.measureText(value);
    };
    const layout = computeWatermarkTextLayout({
      text: settings.text,
      baseFontSize,
      minFontSize,
      maxWidth: shorterSide * 0.62,
      maxHeight: shorterSide * 0.3,
      measure,
    });

    if (layout.lines.length === 0) return;

    const lightTile = createTextTile(layout, settings, '#ffffff');
    const darkTile = createTextTile(layout, settings, '#0f172a');
    const horizontalSpacing = Math.max(
      lightTile.width * 1.35,
      shorterSide * 0.34
    ) * layer.spacingScale;
    const verticalSpacing = Math.max(
      lightTile.height * 1.85,
      layout.fontSize * 4.2
    ) * layer.spacingScale;
    const limit = diagonal * 0.85;
    const xCount = Math.ceil(limit / horizontalSpacing) + 1;
    const yCount = Math.ceil(limit / verticalSpacing) + 1;
    const random = createSeededRandom(`${seed}:layer:${layerIndex}`);

    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(layer.angle);
    context.globalCompositeOperation = 'source-over';

    for (let row = -yCount; row <= yCount; row += 1) {
      for (let column = -xCount; column <= xCount; column += 1) {
        const rowOffset = Math.abs(row) % 2 === 1 ? horizontalSpacing / 2 : 0;
        const baseX = column * horizontalSpacing + rowOffset + horizontalSpacing * layer.offsetScale;
        const baseY = row * verticalSpacing;
        const jitterX = settings.security.scramble
          ? seededVariation(random, horizontalSpacing * 0.22)
          : 0;
        const jitterY = settings.security.scramble
          ? seededVariation(random, verticalSpacing * 0.2)
          : 0;
        const rotation = settings.security.scramble ? seededVariation(random, 0.16) : 0;
        const scale = settings.security.scramble ? 1 + seededVariation(random, 0.16) : 1;
        const opacityVariation = settings.security.scramble
          ? seededVariation(random, 0.08)
          : 0;
        const opacity = Math.max(
          0.08,
          Math.min(1, settings.opacity * layer.opacityScale + opacityVariation)
        );
        const canvasPoint = getCanvasPoint(
          baseX + jitterX,
          baseY + jitterY,
          layer.angle,
          width,
          height
        );
        const luminance = sampleLuminance(
          luminanceMap,
          canvasPoint.x,
          canvasPoint.y,
          width,
          height
        );
        const tile = luminance < 0.5 ? lightTile : darkTile;

        context.save();
        context.translate(baseX + jitterX, baseY + jitterY);
        context.rotate(rotation);
        context.scale(scale, scale);
        context.globalAlpha = opacity;
        context.drawImage(tile, -tile.width / 2, -tile.height / 2);
        context.restore();
      }
    }

    context.restore();
  });
};

const decodeImageBlob = async (blob: Blob): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image illisible'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const watermarkImage = async (
  file: File,
  settings: WatermarkSettings,
  seed: string
): Promise<Blob> => {
  const image = await decodeImageBlob(file);
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
    const ratio = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
    width = Math.max(1, Math.floor(width * ratio));
    height = Math.max(1, Math.floor(height * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Contexte canvas indisponible');

  context.drawImage(image, 0, 0, width, height);
  drawSecureWatermarkOnCanvas(context, width, height, settings, seed);

  const outputType = file.type === 'image/png'
    ? 'image/png'
    : file.type === 'image/webp'
      ? 'image/webp'
      : 'image/jpeg';
  return canvasToBlob(canvas, outputType, 0.95);
};

const ensurePdfCompatibleImage = async (blob: Blob): Promise<Blob> => {
  if (blob.type === 'image/png' || blob.type === 'image/jpeg') return blob;

  const image = await decodeImageBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Contexte canvas indisponible');
  context.drawImage(image, 0, 0);
  return canvasToBlob(canvas, 'image/jpeg', 0.95);
};

export const convertImageToPdf = async (
  imageBlob: Blob,
  removeMetadata: boolean
): Promise<Blob> => {
  const compatibleBlob = await ensurePdfCompatibleImage(imageBlob);
  const pdfDoc = await PDFDocument.create();
  applyMetadataPolicy(pdfDoc, removeMetadata);

  const imageBytes = await compatibleBlob.arrayBuffer();
  const image = compatibleBlob.type === 'image/png'
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

  const pdfBytes = await pdfDoc.save();
  return pdfBytesToBlob(pdfBytes);
};

const renderPdfPage = async (
  pdfPage: any,
  scale: number
): Promise<HTMLCanvasElement> => {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Contexte canvas indisponible');
  await pdfPage.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

const renderPdfLuminanceMap = async (pdfPage: any): Promise<LuminanceMap | null> => {
  const viewport = pdfPage.getViewport({ scale: 1 });
  const scale = LUMINANCE_MAP_SIZE / Math.max(viewport.width, viewport.height);
  const canvas = await renderPdfPage(pdfPage, scale);
  return createLuminanceMap(canvas, Math.max(1, canvas.width));
};

const watermarkPdfStandard = async (
  file: File,
  settings: WatermarkSettings,
  seed: string
): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  applyMetadataPolicy(sourcePdf, settings.removeMetadata);
  const pdfJs = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const pages = sourcePdf.getPages();

  try {
    for (let index = 0; index < pages.length; index += 1) {
      const pdfPage = await pdfJs.getPage(index + 1);
      const page = pages[index];
      const { width, height } = page.getSize();
      const overlayScale = Math.min(2, MAX_CANVAS_DIMENSION / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(width * overlayScale));
      canvas.height = Math.max(1, Math.floor(height * overlayScale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Contexte canvas indisponible');
      const luminanceMap = await renderPdfLuminanceMap(pdfPage);

      drawSecureWatermarkOnCanvas(
        context,
        canvas.width,
        canvas.height,
        settings,
        `${seed}:page:${index + 1}`,
        luminanceMap
      );

      const overlay = await canvasToBlob(canvas, 'image/png');
      const embeddedOverlay = await sourcePdf.embedPng(await overlay.arrayBuffer());
      page.drawImage(embeddedOverlay, { x: 0, y: 0, width, height });
      pdfPage.cleanup();
    }
  } finally {
    await pdfJs.destroy();
  }

  const pdfBytes = await sourcePdf.save();
  return pdfBytesToBlob(pdfBytes);
};

const watermarkPdfReinforced = async (
  file: File,
  settings: WatermarkSettings,
  seed: string
): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfJs = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const newPdf = await PDFDocument.create();
  applyMetadataPolicy(newPdf, settings.removeMetadata);

  try {
    for (let pageNumber = 1; pageNumber <= pdfJs.numPages; pageNumber += 1) {
      const pdfPage = await pdfJs.getPage(pageNumber);
      const naturalViewport = pdfPage.getViewport({ scale: 1 });
      const renderScale = Math.min(
        2,
        MAX_CANVAS_DIMENSION / Math.max(naturalViewport.width, naturalViewport.height)
      );
      const canvas = await renderPdfPage(pdfPage, renderScale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Contexte canvas indisponible');

      drawSecureWatermarkOnCanvas(
        context,
        canvas.width,
        canvas.height,
        settings,
        `${seed}:page:${pageNumber}`
      );

      const pageImage = await canvasToBlob(canvas, 'image/jpeg', 0.95);
      const embeddedImage = await newPdf.embedJpg(await pageImage.arrayBuffer());
      const newPage = newPdf.addPage([naturalViewport.width, naturalViewport.height]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: naturalViewport.width,
        height: naturalViewport.height,
      });
      pdfPage.cleanup();
    }
  } finally {
    await pdfJs.destroy();
  }

  const pdfBytes = await newPdf.save();
  return pdfBytesToBlob(pdfBytes);
};

export const watermarkPdf = async (
  file: File,
  settings: WatermarkSettings,
  seed: string
): Promise<Blob> => settings.security.rasterize
  ? watermarkPdfReinforced(file, settings, seed)
  : watermarkPdfStandard(file, settings, seed);
