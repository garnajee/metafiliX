export interface ProcessedFile {
  id: string;
  originalFile: File;
  previewUrl: string | null;
  processedBlob: Blob | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  processingRevision: number;
  watermarkSeed: string;
  errorMessage?: string;
  type: 'image' | 'pdf';
}

export type OutputFormat = 'original' | 'pdf';

export interface SecuritySettings {
  rasterize: boolean; // Reinforced PDF mode: rasterizes every page.
  addNoise: boolean;  // Adds structured texture inside watermark glyphs.
  scramble: boolean;  // Enables seeded geometric variations.
}

export interface WatermarkSettings {
  text: string;
  opacity: number;
  color: string;
  size: number; // Font size scale relative to document
  outputFormat: OutputFormat;
  removeMetadata: boolean;
  security: SecuritySettings;
}
