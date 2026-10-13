import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ShieldCheck, Moon, Sun, Lock } from 'lucide-react';
import { ProcessedFile, WatermarkSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { watermarkImage, watermarkPdf, convertImageToPdf } from './services/watermarkService';
import {
  buildDownloadArchive,
  getArchiveFileName,
  getOutputFileName,
  triggerBlobDownload,
} from './services/downloadService';
import { createProcessingQueue, isCurrentProcessingJob } from './services/processingQueue';
import SettingsPanel from './components/SettingsPanel';
import Dropzone from './components/Dropzone';
import FileList from './components/FileList';
import Footer from './components/Footer';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

const generateId = () => globalThis.crypto?.randomUUID?.()
  ?? Math.random().toString(36).substring(2);

const generateWatermarkSeed = () => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(8, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

function App() {
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const filesRef = useRef<ProcessedFile[]>([]);
  const settingsRevisionRef = useRef(0);
  const processingQueueRef = useRef(createProcessingQueue(2));

  const updateFiles = useCallback((updater: (current: ProcessedFile[]) => ProcessedFile[]) => {
    setFiles(current => {
      const next = updater(current);
      filesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => () => {
    filesRef.current.forEach(file => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    });
  }, []);

  const processEntry = useCallback((
    fileEntry: ProcessedFile,
    currentSettings: WatermarkSettings,
    revision: number
  ) => {
    void processingQueueRef.current.enqueue(async () => {
      const beforeProcessing = filesRef.current.find(file => file.id === fileEntry.id);
      if (!isCurrentProcessingJob(beforeProcessing, revision)) return;

      try {
        let blob: Blob;
        if (fileEntry.type === 'image') {
          blob = await watermarkImage(
            fileEntry.originalFile,
            currentSettings,
            fileEntry.watermarkSeed
          );
          if (currentSettings.outputFormat === 'pdf') {
            blob = await convertImageToPdf(blob, currentSettings.removeMetadata);
          }
        } else {
          blob = await watermarkPdf(
            fileEntry.originalFile,
            currentSettings,
            fileEntry.watermarkSeed
          );
        }

        updateFiles(current => current.map(file =>
          file.id === fileEntry.id && isCurrentProcessingJob(file, revision)
            ? {
                ...file,
                status: 'done',
                processedBlob: blob,
                errorMessage: undefined,
              }
            : file
        ));
      } catch (error) {
        console.error('Processing error', error);
        updateFiles(current => current.map(file =>
          file.id === fileEntry.id && isCurrentProcessingJob(file, revision)
            ? {
                ...file,
                status: 'error',
                processedBlob: null,
                errorMessage: 'Erreur de traitement',
              }
            : file
        ));
      }
    });
  }, [updateFiles]);

  const processEntries = useCallback((
    entries: ProcessedFile[],
    currentSettings: WatermarkSettings,
    revision: number
  ) => {
    entries.forEach(entry => processEntry(entry, currentSettings, revision));
  }, [processEntry]);

  const handleFilesAdded = (newFiles: File[]) => {
    const revision = settingsRevisionRef.current;
    const newEntries: ProcessedFile[] = newFiles.map(file => ({
      id: generateId(),
      originalFile: file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      processedBlob: null,
      status: 'processing',
      processingRevision: revision,
      watermarkSeed: generateWatermarkSeed(),
      type: file.type === 'application/pdf' ? 'pdf' : 'image',
    }));

    const nextFiles = [...newEntries, ...filesRef.current];
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    processEntries(newEntries, settings, revision);
  };

  const handleSettingsChange = (nextSettings: WatermarkSettings) => {
    const revision = settingsRevisionRef.current + 1;
    settingsRevisionRef.current = revision;
    setSettings(nextSettings);
    updateFiles(current => current.map(file => ({
      ...file,
      processedBlob: null,
      status: 'pending',
      processingRevision: revision,
      errorMessage: undefined,
    })));
  };

  useEffect(() => {
    const revision = settingsRevisionRef.current;
    const timer = window.setTimeout(() => {
      const textIsValid = settings.text.trim().length > 0;
      if (!textIsValid || filesRef.current.length === 0) return;

      const entries = filesRef.current.map(file => ({
        ...file,
        status: 'processing' as const,
        processedBlob: null,
        processingRevision: revision,
        errorMessage: undefined,
      }));
      filesRef.current = entries;
      setFiles(entries);
      processEntries(entries, settings, revision);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [settings, processEntries]);

  const handleRemoveFile = (id: string) => {
    const fileToRemove = filesRef.current.find(file => file.id === id);
    if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
    updateFiles(current => current.filter(file => file.id !== id));
  };

  const handleDownloadFile = (id: string) => {
    const file = filesRef.current.find(candidate => candidate.id === id);
    if (!file?.processedBlob || file.status !== 'done') return;
    triggerBlobDownload(
      file.processedBlob,
      getOutputFileName(file.originalFile.name, file.processedBlob)
    );
  };

  const handleDownloadAll = async () => {
    const completedFiles = filesRef.current.filter(
      file => file.status === 'done' && file.processedBlob
    );
    if (completedFiles.length === 0 || isCreatingZip) return;

    setIsCreatingZip(true);
    try {
      const archive = await buildDownloadArchive(completedFiles);
      triggerBlobDownload(archive, getArchiveFileName());
    } catch (error) {
      console.error('ZIP creation error', error);
      window.alert('Impossible de créer l’archive. Vous pouvez télécharger les fichiers séparément.');
    } finally {
      setIsCreatingZip(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">MetafiliX</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Forensic Security</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Traitement local</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode(current => !current)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={isDarkMode ? 'Activer le thème clair' : 'Activer le thème sombre'}
            >
              {isDarkMode
                ? <Sun className="w-5 h-5 text-slate-400" />
                : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Protection renforcée de vos documents
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Fusionnez un filigrane lisible avec vos fichiers pour rendre son retrait plus difficile, sans jamais envoyer vos documents.
          </p>
        </div>

        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          disabled={false}
        />

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-sm">2</span>
            Zone de traitement
          </h2>
          <Dropzone onFilesAdded={handleFilesAdded} disabled={false} />
          <FileList
            files={files}
            onRemove={handleRemoveFile}
            onDownload={handleDownloadFile}
            onDownloadAll={handleDownloadAll}
            isCreatingZip={isCreatingZip}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
