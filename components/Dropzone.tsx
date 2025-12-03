import React, { useRef, useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import { SUPPORTED_MIME_TYPES } from '../constants';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFiles(Array.from(e.target.files));
    }
    // Reset input value to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateAndPassFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
       const isValidType = Object.keys(SUPPORTED_MIME_TYPES).includes(file.type);
       return isValidType;
    });
    
    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    } else {
        alert("Format de fichier non supporté. Veuillez utiliser PDF, JPG ou PNG.")
    }
  };

  return (
    <div 
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]' 
          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept={Object.values(SUPPORTED_MIME_TYPES).flat().join(',')}
        multiple
      />
      
      <div className="flex flex-col items-center justify-center gap-4">
        <div className={`p-4 rounded-full ${isDragOver ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm'}`}>
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
            Cliquez pour ajouter des fichiers ou glissez-les ici
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            PDF, JPEG, PNG, WEBP (Max 20MB)
          </p>
        </div>
        
        <div className="flex gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-medium border border-red-100 dark:border-red-900/30">
                <FileType className="w-3 h-3 mr-1"/> PDF
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-100 dark:border-blue-900/30">
                <FileType className="w-3 h-3 mr-1"/> IMG
            </span>
        </div>
      </div>
    </div>
  );
};

export default Dropzone;