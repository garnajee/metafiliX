import React, { useEffect, useRef } from 'react';
import { WatermarkSettings } from '../types';
import { Eye, Settings2, ShieldAlert, Shuffle } from 'lucide-react';
import { drawSecureWatermarkOnCanvas } from '../services/watermarkService';
import { MAX_WATERMARK_TEXT_LENGTH } from '../services/watermarkLayout';

interface SettingsPanelProps {
  settings: WatermarkSettings;
  onChange: (settings: WatermarkSettings) => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleChange = <Key extends keyof WatermarkSettings>(
    key: Key,
    value: WatermarkSettings[Key]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const handleSecurityChange = (
    key: keyof WatermarkSettings['security'],
    value: boolean
  ) => {
    onChange({
      ...settings,
      security: { ...settings.security, [key]: value },
    });
  };

  const handleColorTextChange = (value: string) => {
    const cleanHex = value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    if (cleanHex.length === 6) handleChange('color', `#${cleanHex}`);
  };

  const handleOpacityNumberChange = (value: number) => {
    if (Number.isNaN(value)) return;
    handleChange('opacity', Math.max(5, Math.min(100, value)) / 100);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f1f5f9';
    context.fillRect(0, 0, canvas.width / 2, canvas.height);
    context.fillStyle = '#334155';
    context.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

    drawSecureWatermarkOnCanvas(
      context,
      canvas.width,
      canvas.height,
      settings,
      `preview:${settings.text}:${settings.color}`
    );
  }, [settings]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors duration-200">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Configuration du filigrane
      </h2>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <label htmlFor="watermarkText" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Texte du filigrane
              </label>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {settings.text.length}/{MAX_WATERMARK_TEXT_LENGTH}
              </span>
            </div>
            <textarea
              id="watermarkText"
              value={settings.text}
              maxLength={MAX_WATERMARK_TEXT_LENGTH}
              rows={3}
              onChange={event => handleChange('text', event.target.value)}
              disabled={disabled}
              className="w-full resize-y px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
              placeholder="Ex. Document exclusivement destiné à la location"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Les retours à la ligne sont calculés automatiquement pour garder chaque mot visible.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Couleur</label>
              <div className="flex items-center gap-2">
                <div className="relative overflow-hidden w-12 h-10 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm shrink-0">
                  <input
                    type="color"
                    value={settings.color}
                    onChange={event => handleChange('color', event.target.value)}
                    className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0"
                    disabled={disabled}
                    aria-label="Couleur du filigrane"
                  />
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-mono">#</span>
                  </div>
                  <input
                    key={settings.color}
                    type="text"
                    defaultValue={settings.color.replace('#', '').toUpperCase()}
                    onBlur={event => handleColorTextChange(event.target.value)}
                    maxLength={6}
                    disabled={disabled}
                    className="block w-full pl-7 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    placeholder="000000"
                    aria-label="Couleur hexadécimale"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Opacité</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.01"
                  value={settings.opacity}
                  onChange={event => handleChange('opacity', Number(event.target.value))}
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  disabled={disabled}
                />
                <div className="relative w-20 shrink-0">
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={Math.round(settings.opacity * 100)}
                    onChange={event => handleOpacityNumberChange(Number(event.target.value))}
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

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              Protection avancée
            </h3>

            <div className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 p-3">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">PDF toujours fusionné</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Chaque page PDF est transformée en image avec son filigrane. Le filigrane ne reste jamais un objet sélectionnable séparément.
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.security.addNoise}
                onChange={event => handleSecurityChange('addNoise', event.target.checked)}
                disabled={disabled}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Texture structurée</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ajoute des hachures uniquement dans les lettres, sans dégrader tout le document.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.security.scramble}
                onChange={event => handleSecurityChange('scramble', event.target.checked)}
                disabled={disabled}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5" /> Variations adaptatives
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Varie légèrement la position, l’échelle et l’opacité tout en gardant toutes les lignes strictement parallèles.
                </p>
              </div>
            </label>

            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
              Aucun filigrane n’est inviolable. Ces options augmentent la dissuasion et la difficulté du retrait sans promettre une protection absolue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Format de sortie</label>
              <select
                value={settings.outputFormat}
                onChange={event => handleChange('outputFormat', event.target.value as WatermarkSettings['outputFormat'])}
                disabled={disabled}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
              >
                <option value="original">Format original</option>
                <option value="pdf">Tout en PDF</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.removeMetadata}
                  onChange={event => handleChange('removeMetadata', event.target.checked)}
                  disabled={disabled}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">Nettoyer les métadonnées principales</span>
              </label>
            </div>
          </div>
        </div>

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
            Le fond clair et sombre permet de vérifier le contraste adaptatif.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
