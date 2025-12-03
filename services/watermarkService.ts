import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { WatermarkSettings } from '../types';

const MAX_CANVAS_DIMENSION = 4096;
const ZERO_DATE = new Date(0); // Epoch 0 pour l'anonymat temporel

// Liste de polices standards pour le polymorphisme (Anti-IA)
const SAFE_FONTS = [
  'Arial', 
  'Verdana', 
  'Times New Roman', 
  'Courier New', 
  'Trebuchet MS', 
  'Georgia', 
  'Impact', 
  'Tahoma'
];

// --- UTILITIES ---

const getJitter = (magnitude: number) => (Math.random() - 0.5) * magnitude;

/**
 * Dessine le filigrane avec des techniques anti-IA et anti-suppression.
 * Version 2.0 : Correction de couverture géométrique + Interférences Organiques
 */
const drawSecureWatermarkOnCanvas = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  settings: WatermarkSettings
) => {
    const { text, color, opacity, size, security } = settings;
    
    // 1. Définition de la taille de base
    const baseFontSize = Math.max(width, height) * 0.04 * size;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 2. Mode de Fusion "Multiply"
    // Incruste l'encre dans le papier. Rend la suppression par soustraction de couleur difficile.
    ctx.globalCompositeOperation = 'multiply';

    // Mesures pour la grille
    ctx.font = `bold ${baseFontSize}px Arial`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = baseFontSize;
    
    // Espacement dynamique
    const horizontalSpacing = textWidth * 2;
    const verticalSpacing = textHeight * 4;

    // 3. CORRECTION DE COUVERTURE (GEOMETRIE)
    // Problème précédent : La diagonale simple laissait des coins vides après rotation.
    // Solution : On définit une zone de rendu massive (1.5x la plus grande dimension)
    // et on dessine par rapport au CENTRE de l'image.
    const maxDim = Math.max(width, height) * 1.5;

    ctx.save();
    
    // On déplace l'origine au centre de l'image
    ctx.translate(width / 2, height / 2);
    // On effectue la rotation globale
    ctx.rotate(-45 * Math.PI / 180);

    // On boucle de -Limite à +Limite par rapport au centre (0,0)
    for (let y = -maxDim; y < maxDim; y += verticalSpacing) {
        for (let x = -maxDim; x < maxDim; x += horizontalSpacing) {
            
            ctx.save();

            // --- JITTERS (Chaos Géométrique) ---
            // Décalages aléatoires pour casser la grille parfaite
            const jX = security.scramble ? getJitter(textWidth * 0.3) : 0;
            const jY = security.scramble ? getJitter(textHeight * 0.3) : 0;
            const jRot = security.scramble ? getJitter(0.15) : 0; // +/- quelques degrés
            const scaleVar = security.scramble ? 1 + getJitter(0.2) : 1; // Variation taille +/- 10%

            // Application des transformations locales
            ctx.translate(x + jX, y + jY);
            ctx.rotate(jRot);
            ctx.scale(scaleVar, scaleVar);

            // --- ANTI-IA 1: POLYMORPHISME DE POLICE ---
            // On change de police à chaque mot pour empêcher l'IA d'apprendre la forme des lettres
            const randomFont = security.scramble 
                ? SAFE_FONTS[Math.floor(Math.random() * SAFE_FONTS.length)] 
                : 'Arial';
            ctx.font = `bold ${baseFontSize}px ${randomFont}, sans-serif`;

            // --- ANTI-IA 2: VARIANCE D'OPACITÉ LOCALE ---
            // L'opacité varie de +/- 15% autour de la valeur choisie.
            // Empêche les algo de soustraction uniforme.
            let localOpacity = opacity;
            if (security.scramble) {
                localOpacity = Math.max(0.05, Math.min(1, opacity + getJitter(0.3)));
            }

            ctx.fillStyle = color;
            ctx.globalAlpha = localOpacity;
            
            // Dessin du texte
            ctx.fillText(text, 0, 0);

            // --- ANTI-IA 3: INTERFÉRENCES ORGANIQUES ---
            if (security.addNoise && opacity > 0.05) {
                // On repasse en mode normal pour dessiner par dessus le texte (effet rayure)
                ctx.globalCompositeOperation = 'source-over'; 
                
                ctx.lineWidth = 0.5 + Math.random();
                ctx.strokeStyle = color;
                ctx.globalAlpha = localOpacity * 0.6;
                
                ctx.beginPath();
                // Courbe de Bézier aléatoire qui traverse le texte (imite une fibre ou un cheveu)
                // Au lieu d'une ligne droite mathématique facile à détecter.
                const startY = getJitter(textHeight/2);
                const endY = getJitter(textHeight/2);
                
                ctx.moveTo(-textWidth/1.5, startY);
                ctx.bezierCurveTo(
                    -textWidth/3, startY - textHeight, // Point de contrôle haut
                    textWidth/3, endY + textHeight,    // Point de contrôle bas
                    textWidth/1.5, endY
                );
                ctx.stroke();

                // "Ink Splatter" (Taches d'encre)
                // Ajoute des micro-points aléatoires pour simuler du bruit d'impression
                if (Math.random() > 0.7) {
                    const dotX = (Math.random() - 0.5) * textWidth;
                    const dotY = (Math.random() - 0.5) * textHeight;
                    const dotRadius = Math.random() * 1.5; // 0 à 1.5px
                    
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                }

                // Retour au mode multiply pour le prochain texte
                ctx.globalCompositeOperation = 'multiply';
            }

            ctx.restore();
        }
    }
    
    // Restauration du contexte après la rotation globale
    ctx.restore();

    // 4. BRUIT NUMÉRIQUE GLOBAL (GRAIN)
    // Ajoute une couche de neige statique invisible à l'œil nu mais destructrice pour les IA
    if (security.addNoise) {
        ctx.globalCompositeOperation = 'source-over';
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const noiseIntensity = 10; 

        for (let i = 0; i < data.length; i += 4) {
            // Bruit léger sur 50% des pixels
            if (Math.random() > 0.5) {
                const noise = (Math.random() - 0.5) * noiseIntensity;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
};

/**
 * Rendu d'une page PDF vers Blob Image (Rasterisation)
 */
const rasterizePdfPageToBlob = async (pdfPage: any, scale: number, settings: WatermarkSettings): Promise<Blob> => {
    const viewport = pdfPage.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
    };
    await pdfPage.render(renderContext).promise;

    drawSecureWatermarkOnCanvas(ctx, canvas.width, canvas.height, settings);

    return new Promise((resolve, reject) => {
        // JPEG haute qualité
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Rasterization failed"));
        }, 'image/jpeg', 0.95);
    });
};

// --- CORE FUNCTIONS ---

export const watermarkImage = async (file: File, settings: WatermarkSettings): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Limite de sécurité mémoire
        if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
             const ratio = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
             width = Math.floor(width * ratio);
             height = Math.floor(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Canvas Context Failed"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        drawSecureWatermarkOnCanvas(ctx, width, height, settings);

        const outFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image Export Failed"));
        }, outFormat, 0.95);
      };
      
      img.onerror = () => reject(new Error("Image Load Error"));
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const convertImageToPdf = async (imageBlob: Blob, removeMetadata: boolean): Promise<Blob> => {
    // CLEAN SLATE PROTOCOL
    const pdfDoc = await PDFDocument.create();
    
    if (removeMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setProducer('MetafiliX Secure Engine'); 
        pdfDoc.setCreator('');
        pdfDoc.setKeywords([]);
        pdfDoc.setCreationDate(ZERO_DATE);
        pdfDoc.setModificationDate(ZERO_DATE);
    }

    const imageBytes = await imageBlob.arrayBuffer();
    let image;
    
    if (imageBlob.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
    } else {
        image = await pdfDoc.embedJpg(imageBytes);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Fonction principale pour PDF.
 * Force la rasterisation pour une sécurité maximale.
 */
export const watermarkPdf = async (file: File, settings: WatermarkSettings): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // CLEAN SLATE : Nouveau PDF vierge
    const newPdf = await PDFDocument.create();

    if (settings.removeMetadata) {
        newPdf.setTitle('');
        newPdf.setAuthor('');
        newPdf.setProducer('MetafiliX');
        newPdf.setCreator('');
        newPdf.setCreationDate(ZERO_DATE);
        newPdf.setModificationDate(ZERO_DATE);
    }

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        // Scale 2.0 = ~144 DPI (Compromis Qualité/Vitesse)
        const scale = 2.0; 
        
        const pageImageBlob = await rasterizePdfPageToBlob(page, scale, settings);
        const pageImageBytes = await pageImageBlob.arrayBuffer();
        
        const embeddedImage = await newPdf.embedJpg(pageImageBytes);
        
        const newPage = newPdf.addPage([embeddedImage.width, embeddedImage.height]);
        newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: embeddedImage.width,
            height: embeddedImage.height
        });
        
        page.cleanup();
    }
    
    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};
