import React, { useState, useEffect, useCallback } from 'react';
import { ProcessedFile, WatermarkSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { watermarkImage, watermarkPdf, convertImageToPdf } from './services/watermarkService';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';
//pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

import SettingsPanel from './components/SettingsPanel';
import Dropzone from './components/Dropzone';
import FileList from './components/FileList';
import Footer from './components/Footer';
import { ShieldCheck, Moon, Sun, Lock } from 'lucide-react';

const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

function App() {
  // Force secure defaults for MetafiliX
  const [settings, setSettings] = useState<WatermarkSettings>({ 
    ...DEFAULT_SETTINGS,
    text: "Document exclusivement destiné à la location",
    security: {
        rasterize: true,
        addNoise: true,
        scramble: true
    }
  });
  
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.processedUrl) URL.revokeObjectURL(file.processedUrl);
        if (file.previewUrl && file.type === 'image') URL.revokeObjectURL(file.previewUrl);
      });
    };
  }, [files]);

  const processFile = useCallback(async (fileEntry: ProcessedFile, currentSettings: WatermarkSettings) => {
    try {
      let blob: Blob;
      
      if (fileEntry.type === 'image') {
        blob = await watermarkImage(fileEntry.originalFile, currentSettings);
        if (currentSettings.outputFormat === 'pdf') {
          blob = await convertImageToPdf(blob, currentSettings.removeMetadata);
        }
      } else {
        // PDF processing
        blob = await watermarkPdf(fileEntry.originalFile, currentSettings);
      }

      const url = URL.createObjectURL(blob);

      setFiles(prev => prev.map(f => 
        f.id === fileEntry.id 
          ? { ...f, status: 'done', processedBlob: blob, processedUrl: url } 
          : f
      ));

    } catch (error) {
      console.error("Processing error", error);
      setFiles(prev => prev.map(f => 
        f.id === fileEntry.id 
          ? { ...f, status: 'error', errorMessage: "Erreur de traitement" } 
          : f
      ));
    }
  }, []);

  const handleFilesAdded = async (newFiles: File[]) => {
    const newEntries: ProcessedFile[] = newFiles.map(file => ({
      id: generateId(),
      originalFile: file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      processedBlob: null,
      processedUrl: null,
      status: 'pending',
      type: file.type === 'application/pdf' ? 'pdf' : 'image'
    }));

    setFiles(prev => [...newEntries, ...prev]);

    newEntries.forEach(entry => {
       setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'processing' } : f));
       processFile(entry, settings);
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove?.processedUrl) URL.revokeObjectURL(fileToRemove.processedUrl);
        if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
        return prev.filter(f => f.id !== id);
    });
  };
  
  // Debounce processing
  useEffect(() => {
    const timer = setTimeout(() => {
        if (files.length > 0) {
            if (!settings.text.trim()) return;
            setFiles(prev => prev.map(f => ({...f, status: 'processing'})));
            files.forEach(file => processFile(file, settings));
        }
    }, 800); 

    return () => clearTimeout(timer);
  }, [settings]);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950">
      
      {/* Header */}
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
                    <span>Client-Side Only</span>
                </div>
                
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-slate-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        
        <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                Protection de Documents Blindée
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Ajoutez un filigrane rasterisé impossible à supprimer. Nettoyage total des métadonnées. Résistant aux IA.
            </p>
        </div>

        <SettingsPanel 
            settings={settings} 
            onChange={setSettings} 
            disabled={isProcessingGlobal} 
        />

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-sm">2</span>
                Zone de Traitement
            </h2>
            <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessingGlobal} />
            <FileList files={files} onRemove={handleRemoveFile} />
        </div>

      </main>

      <Footer />
    </div>
  );
}

export default App;
