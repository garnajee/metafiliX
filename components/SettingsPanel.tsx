import React, { useEffect, useRef } from 'react';
import { WatermarkSettings } from '../types';
import { Eye, Settings2, ShieldAlert, Hash } from 'lucide-react';

interface SettingsPanelProps {
  settings: WatermarkSettings;
  onChange: (settings: WatermarkSettings) => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleChange = (key: keyof WatermarkSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const handleSecurityChange = (key: keyof WatermarkSettings['security'], value: boolean) => {
    onChange({
      ...settings,
      security: {
        ...settings.security,
        [key]: value
      }
    });
  };

  // Gestion spécifique pour l'input texte de la couleur
  const handleColorTextChange = (val: string) => {
    // On enlève le # s'il est tapé par l'utilisateur pour normaliser
    let cleanHex = val.replace(/[^0-9A-Fa-f]/g, '');
    if (cleanHex.length > 6) cleanHex = cleanHex.substring(0, 6);
    handleChange('color', `#${cleanHex}`);
  };

  // Gestion spécifique pour l'input numérique de l'opacité
  const handleOpacityNumberChange = (val: number) => {
    let newOpacity = Math.max(0, Math.min(100, val)) / 100;
    handleChange('opacity', newOpacity);
  };

  // Real-time preview rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#f1f5f9'; // slate-100
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Config
    const fontSize = 16 * settings.size;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    
    // Preview uses simplified rendering (no multiply mode to be visible on grey bg)
    ctx.fillStyle = settings.color;
    ctx.globalAlpha = settings.opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-45 * Math.PI / 180);
    ctx.translate(-width / 2, -height / 2);

    const spacingX = ctx.measureText(settings.text).width + 40;
    const spacingY = 60;

    for(let y = -height; y < height * 2; y += spacingY) {
        for(let x = -width; x < width * 2; x += spacingX) {
             const xOffset = (y / spacingY) % 2 === 0 ? 0 : spacingX / 2;
             
             // Simulate Jitter in preview
             const jX = settings.security.scramble ? (Math.random() - 0.5) * 5 : 0;
             const jY = settings.security.scramble ? (Math.random() - 0.5) * 5 : 0;
             
             ctx.fillText(settings.text, x + xOffset + width/2 + jX, y + height/2 + jY);
        }
    }
    ctx.restore();

    // Simulate Noise visual effect
    if (settings.security.addNoise) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#000';
        for(let i=0; i<50; i++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            ctx.fillRect(rx, ry, 1, 1);
        }
    }

  }, [settings]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors duration-200">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Configuration du filigrane
      </h2>
      
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Controls */}
        <div className="flex-1 space-y-6">
            <div>
              <label htmlFor="watermarkText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Texte du filigrane
              </label>
              <input
                id="watermarkText"
                type="text"
                value={settings.text}
                onChange={(e) => handleChange('text', e.target.value)}
                disabled={disabled}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                placeholder="Ex: CONFIDENTIEL"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* --- SELECTION COULEUR --- */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Couleur</label>
                    <div className="flex items-center gap-2">
                        {/* Picker visuel */}
                        <div className="relative overflow-hidden w-12 h-10 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm shrink-0">
                            <input 
                                type="color" 
                                value={settings.color}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0"
                                disabled={disabled}
                            />
                        </div>
                        
                        {/* Input Hexadécimal */}
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-mono">#</span>
                            </div>
                            <input 
                                type="text"
                                value={settings.color.replace('#', '').toUpperCase()}
                                onChange={(e) => handleColorTextChange(e.target.value)}
                                maxLength={6}
                                disabled={disabled}
                                className="block w-full pl-7 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                placeholder="000000"
                            />
                        </div>
                    </div>
                </div>
                
                {/* --- SELECTION OPACITÉ --- */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Opacité</label>
                    <div className="flex items-center gap-4">
                        {/* Slider */}
                        <input 
                            type="range" 
                            min="0.05" 
                            max="1" 
                            step="0.01" 
                            value={settings.opacity}
                            onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            disabled={disabled}
                        />
                        
                        {/* Input % */}
                        <div className="relative w-20 shrink-0">
                            <input 
                                type="number" 
                                min="5"
                                max="100"
                                value={Math.round(settings.opacity * 100)}
                                onChange={(e) => handleOpacityNumberChange(parseInt(e.target.value))}
                                disabled={disabled}
                                className="block w-full px-2 py-1.5 text-right border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <div className="absolute inset-y-0 left-1 flex items-center pointer-events-none pl-1">
                                <span className="text-slate-400 text-xs">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Security Section */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-500" />
                    Sécurité Avancée
                </h3>
                
                {/* Rasterization Toggle */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input 
                        type="checkbox" 
                        checked={settings.security.rasterize}
                        onChange={(e) => handleSecurityChange('rasterize', e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-orange-600 checked:border-orange-600 focus:ring-2 focus:ring-orange-500"
                    />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                  <div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Mode "Blindé" (Rasterisation)</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Aplatit le PDF en image. Le filigrane devient impossible à retirer sans détruire le document. 
                          <span className="text-orange-600 dark:text-orange-400 ml-1">(Recommandé)</span>
                      </p>
                  </div>
                </label>

                {/* Noise Toggle */}
                <label className="flex items-start gap-3 cursor-pointer group">
                   <div className="relative flex items-center mt-0.5">
                    <input 
                        type="checkbox" 
                        checked={settings.security.addNoise}
                        onChange={(e) => handleSecurityChange('addNoise', e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                  <div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Protection Anti-IA (Bruit & Lignes)</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Ajoute du grain et des interférences pour empêcher les IA de gommer le texte.
                      </p>
                  </div>
                </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Format de sortie</label>
                    <select 
                        value={settings.outputFormat}
                        onChange={(e) => handleChange('outputFormat', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                    >
                        <option value="original">Format Original</option>
                        <option value="pdf">Tout en PDF</option>
                    </select>
                 </div>
                 
                 <div className="flex flex-col gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={settings.removeMetadata}
                            onChange={(e) => handleChange('removeMetadata', e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Nettoyage Métadonnées (Expert)</span>
                    </label>
                 </div>
            </div>

        </div>

        {/* Preview */}
        <div className="flex flex-col items-center justify-start gap-2">
             <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Eye className="w-4 h-4" /> Prévisualisation
             </label>
             <div className="p-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 shadow-inner">
                <canvas 
                    ref={canvasRef} 
                    width={240} 
                    height={340} 
                    className="rounded border border-slate-100 dark:border-slate-800 bg-white"
                />
             </div>
             <p className="text-xs text-center text-slate-400 max-w-[240px]">
                 Le rendu final peut varier selon la résolution du document.
             </p>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
