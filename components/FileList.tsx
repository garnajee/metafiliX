import React from 'react';
import { ProcessedFile } from '../types';
import { FileText, Download, Trash2, Loader2, AlertCircle, Archive } from 'lucide-react';

interface FileListProps {
  files: ProcessedFile[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onDownloadAll: () => void;
  isCreatingZip: boolean;
}

const FileList: React.FC<FileListProps> = ({
  files,
  onRemove,
  onDownload,
  onDownloadAll,
  isCreatingZip,
}) => {
  if (files.length === 0) return null;

  const completedCount = files.filter(file => file.status === 'done' && file.processedBlob).length;
  const errorCount = files.filter(file => file.status === 'error').length;
  const allSettled = files.every(file => file.status === 'done' || file.status === 'error');
  const canDownloadAll = allSettled && completedCount > 0 && !isCreatingZip;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Fichiers ({files.length})
          </h3>
          {allSettled && errorCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {errorCount} fichier{errorCount > 1 ? 's' : ''} en erreur — l’archive contiendra les {completedCount} résultat{completedCount > 1 ? 's' : ''} disponible{completedCount > 1 ? 's' : ''}.
            </p>
          )}
        </div>

        {files.length > 1 && (
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={!canDownloadAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingZip
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Archive className="w-4 h-4" />}
            {isCreatingZip ? 'Création du ZIP…' : `Tout télécharger (${completedCount})`}
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {files.map(file => (
          <div
            key={file.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="w-12 h-12 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
              {file.type === 'image' && file.previewUrl ? (
                <img src={file.previewUrl} alt="Aperçu" className="w-full h-full object-cover opacity-80" />
              ) : (
                <FileText className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate" title={file.originalFile.name}>
                {file.originalFile.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {(file.originalFile.size / 1024 / 1024).toFixed(2)} Mo
              </p>

              {file.status === 'pending' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  En attente de réglages valides…
                </p>
              )}
              {file.status === 'error' && (
                <p className="text-xs text-red-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                  <AlertCircle className="w-3 h-3" /> {file.errorMessage || 'Erreur'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {file.status === 'processing' && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Traitement…</span>
                </div>
              )}

              {file.status === 'done' && file.processedBlob && (
                <button
                  type="button"
                  onClick={() => onDownload(file.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Télécharger</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Supprimer"
                aria-label={`Supprimer ${file.originalFile.name}`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;
