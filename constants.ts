import { WatermarkSettings } from "./types";

export const DEFAULT_SETTINGS: WatermarkSettings = {
  text: "Document exclusivement destiné à la location",
  opacity: 0.30,
  color: "#000000",
  size: 1, 
  outputFormat: 'original',
  removeMetadata: true,
  security: {
    rasterize: true, // Disabled by default for performance, user must opt-in for max security
    addNoise: true,
    scramble: true
  }
};

export const SUPPORTED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

export const MAX_FILE_SIZE_MB = 50;
