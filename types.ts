export interface ProcessedFile {
  id: string;
  originalFile: File;
  previewUrl: string | null; // For images, the original. For PDF, maybe a thumbnail or icon.
  processedBlob: Blob | null;
  processedUrl: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  type: 'image' | 'pdf';
}

export type OutputFormat = 'original' | 'pdf';

export interface SecuritySettings {
  rasterize: boolean; // "Secure Mode": Converts PDF to Image to prevent vector editing
  addNoise: boolean;  // Adds random interference to confuse AI removers
  scramble: boolean;  // Jitter/Random positioning
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