import JSZip from 'jszip';
import { ProcessedFile } from '../types';

const EXTENSIONS_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const sanitizeFileName = (name: string): string => name
  .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
  .trim();

const splitFileName = (name: string): { stem: string; extension: string } => {
  const safeName = sanitizeFileName(name) || 'document';
  const lastDot = safeName.lastIndexOf('.');
  if (lastDot <= 0) return { stem: safeName, extension: '' };
  return {
    stem: safeName.slice(0, lastDot),
    extension: safeName.slice(lastDot + 1),
  };
};

export const getExtensionForBlob = (blob: Blob, originalName: string): string => {
  const mimeExtension = EXTENSIONS_BY_MIME[blob.type];
  if (mimeExtension) return mimeExtension;
  return splitFileName(originalName).extension || 'bin';
};

export const getOutputFileName = (originalName: string, blob: Blob): string => {
  const { stem } = splitFileName(originalName);
  return `filigrane_${stem}.${getExtensionForBlob(blob, originalName)}`;
};

export const dedupeFileNames = (names: string[]): string[] => {
  const used = new Set<string>();

  return names.map(name => {
    const { stem, extension } = splitFileName(name);
    let candidate = extension ? `${stem}.${extension}` : stem;
    let suffix = 2;

    while (used.has(candidate.toLocaleLowerCase('fr'))) {
      candidate = extension ? `${stem} (${suffix}).${extension}` : `${stem} (${suffix})`;
      suffix += 1;
    }

    used.add(candidate.toLocaleLowerCase('fr'));
    return candidate;
  });
};

export const triggerBlobDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export const buildDownloadArchive = async (files: ProcessedFile[]): Promise<Blob> => {
  const completed = files.filter(
    (file): file is ProcessedFile & { processedBlob: Blob } =>
      file.status === 'done' && file.processedBlob !== null
  );
  const names = dedupeFileNames(
    completed.map(file => getOutputFileName(file.originalFile.name, file.processedBlob))
  );
  const zip = new JSZip();

  completed.forEach((file, index) => {
    zip.file(names[index], file.processedBlob);
  });

  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
};

export const getArchiveFileName = (date = new Date()): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
  return `metafilix_${timestamp}.zip`;
};
