import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessedFile } from '../types';
import {
  buildDownloadArchive,
  dedupeFileNames,
  getArchiveFileName,
  getOutputFileName,
  triggerBlobDownload,
} from './downloadService';

const createProcessedFile = (name: string, blob: Blob, id: string): ProcessedFile => ({
  id,
  originalFile: new File(['source'], name, { type: 'image/png' }),
  previewUrl: null,
  processedBlob: blob,
  status: 'done',
  processingRevision: 1,
  watermarkSeed: `seed-${id}`,
  type: 'image',
});

describe('download helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves a multi-dot stem and derives the extension from the MIME type', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    expect(getOutputFileName('dossier.location.v2.png', blob))
      .toBe('filigrane_dossier.location.v2.pdf');
  });

  it('deduplicates file names case-insensitively', () => {
    expect(dedupeFileNames(['Document.pdf', 'document.pdf', 'document.pdf']))
      .toEqual(['Document.pdf', 'document (2).pdf', 'document (3).pdf']);
  });

  it('creates one ZIP containing every completed file with unique names', async () => {
    const files = [
      createProcessedFile('scan.png', new Blob(['one'], { type: 'image/png' }), '1'),
      createProcessedFile('scan.jpg', new Blob(['two'], { type: 'image/png' }), '2'),
    ];
    const archiveBlob = await buildDownloadArchive(files);
    const archive = await JSZip.loadAsync(await archiveBlob.arrayBuffer());

    expect(Object.keys(archive.files)).toEqual([
      'filigrane_scan.png',
      'filigrane_scan (2).png',
    ]);
    expect(await archive.file('filigrane_scan.png')?.async('string')).toBe('one');
    expect(await archive.file('filigrane_scan (2).png')?.async('string')).toBe('two');
  });

  it('creates and revokes a fresh URL for every individual download', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('document', {
      createElement: () => ({ href: '', download: '', style: {}, click, remove }),
      body: { appendChild },
    });
    vi.stubGlobal('window', { setTimeout: (callback: () => void) => { callback(); return 1; } });

    triggerBlobDownload(new Blob(['one']), 'one.pdf');
    triggerBlobDownload(new Blob(['two']), 'two.pdf');

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:first');
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:second');
  });

  it('uses a stable local archive date', () => {
    expect(getArchiveFileName(new Date(2026, 9, 13, 18, 20)))
      .toBe('metafilix_2026-10-13.zip');
  });
});
