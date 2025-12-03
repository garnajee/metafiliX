import React from 'react';
import { Github, ShieldCheck, WifiOff } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 text-center">
        
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-6 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium">Fonctionne hors-ligne</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-500" />
            <span className="text-sm font-medium">100% Local (Client-side)</span>
          </div>
        </div>

        <p className="text-slate-500 dark:text-slate-500 text-sm mb-4 max-w-2xl mx-auto">
          Vos documents ne quittent jamais votre appareil. Le traitement est effectué directement dans votre navigateur.
          Aucun serveur n'a accès à vos fichiers.
        </p>

        <div className="flex justify-center items-center gap-4">
          <a 
            href="https://github.com/garnajee/metafiliX" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
          >
            <Github className="w-5 h-5" />
            <span className="text-sm font-semibold">Code Source sur GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
