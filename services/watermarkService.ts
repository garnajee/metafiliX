import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { WatermarkSettings } from '../types';

const MAX_CANVAS_DIMENSION = 4096;
const ZERO_DATE = new Date(0);

const SAFE_FONTS = [
  'Arial', 'Verdana', 'Times New Roman', 'Courier New', 
  'Trebuchet MS', 'Georgia', 'Impact', 'Tahoma', 'Arial Black'
];

// --- UTILITIES ---

const getJitter = (magnitude: number) => (Math.random() - 0.5) * magnitude;

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Version 6.0 "Visible & Secure"
 * Retour au remplissage lisible + Texture Hachurée en superposition
 */
const drawSecureWatermarkOnCanvas = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  settings: WatermarkSettings
) => {
    const { text, color, opacity, size, security } = settings;
    
    // Taille de base légèrement augmentée pour lisibilité
    const baseFontSize = Math.max(width, height) * 0.04 * size;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Mode d'incrustation
    ctx.globalCompositeOperation = 'multiply';

    ctx.font = `bold ${baseFontSize}px Arial`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = baseFontSize;
    
    const horizontalSpacing = textWidth * 2;
    const verticalSpacing = textHeight * 4;

    // Géométrie massive (Correction "Trou")
    const diagonal = Math.sqrt(width * width + height * height);
    const limit = diagonal * 1.5;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-45 * Math.PI / 180);

    const xCount = Math.ceil(limit / horizontalSpacing);
    const yCount = Math.ceil(limit / verticalSpacing);

    for (let j = -yCount; j <= yCount; j++) {
        for (let i = -xCount; i <= xCount; i++) {
            
            const baseX = i * horizontalSpacing;
            const baseY = j * verticalSpacing;
            const rowOffset = (Math.abs(j) % 2 === 1) ? horizontalSpacing / 2 : 0;
            
            ctx.save();

            const jX = security.scramble ? getJitter(textWidth * 0.3) : 0;
            const jY = security.scramble ? getJitter(textHeight * 0.3) : 0;
            const jRot = security.scramble ? getJitter(0.15) : 0; 
            const scaleVar = security.scramble ? 1 + getJitter(0.15) : 1;

            ctx.translate(baseX + rowOffset + jX, baseY + jY);
            ctx.rotate(jRot);
            ctx.scale(scaleVar, scaleVar);

            const randomFont = security.scramble 
                ? SAFE_FONTS[Math.floor(Math.random() * SAFE_FONTS.length)] 
                : 'Arial';
            ctx.font = `bold ${baseFontSize}px ${randomFont}, sans-serif`;

            // Variance d'opacité
            let localOpacity = opacity;
            if (security.scramble) {
                localOpacity = Math.max(0.1, Math.min(1, opacity + getJitter(0.2)));
            }

            // 1. DESSIN DU TEXTE PRINCIPAL (LISIBLE)
            // On utilise un remplissage solide (légèrement dégradé) pour garantir la lecture
            const gradient = ctx.createLinearGradient(0, -textHeight/2, 0, textHeight/2);
            gradient.addColorStop(0, hexToRgba(color, localOpacity));
            gradient.addColorStop(0.5, hexToRgba(color, Math.max(0, localOpacity - 0.1)));
            gradient.addColorStop(1, hexToRgba(color, localOpacity));
            
            ctx.fillStyle = gradient;
            ctx.fillText(text, 0, 0);

            // 2. TEXTURE HACHURÉE EN SURIMPRESSION (ANTI-IA)
            // On dessine des hachures fines *par-dessus* le texte existant
            // Cela crée du "bruit" structurel sans effacer la lettre
            if (security.addNoise) {
                ctx.globalCompositeOperation = 'source-over'; // Dessin normal par dessus
                
                // On utilise le texte comme masque (clip) pour ne dessiner les rayures QUE dans les lettres
                ctx.beginPath();
                // Note: fillText ne crée pas de chemin, on utilise une astuce de clipping simple ou on dessine par dessus
                // Ici on dessine simplement des lignes diagonales fines qui traversent la zone du texte
                
                ctx.lineWidth = 1;
                ctx.strokeStyle = color;
                ctx.globalAlpha = localOpacity * 0.3; // Rayures discrètes

                const hatchSpacing = 6; // Espacement des rayures (pixels)
                // On couvre la zone du mot
                for (let k = -textWidth/2; k < textWidth/2; k += hatchSpacing) {
                    ctx.beginPath();
                    // Lignes diagonales
                    ctx.moveTo(k, -textHeight/2);
                    ctx.lineTo(k - 10, textHeight/2);
                    ctx.stroke();
                }
                
                ctx.globalCompositeOperation = 'multiply'; // Retour fusion
            }

            // 3. CONTOUR FIN (GHOST STROKE)
            // Aide à la lisibilité si le fond est complexe et piège l'IA
            if (security.addNoise) {
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = hexToRgba(color, localOpacity * 0.8);
                ctx.strokeText(text, 0, 0);
            }

            // 4. MICRO-COUPURES (Moins nombreuses, plus stratégiques)
            if (security.addNoise) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.lineWidth = 1;
                ctx.strokeStyle = color; // Couleur du texte pour "couper"
                ctx.globalAlpha = localOpacity * 0.8;

                // Une seule grande courbe traversante (style "Signature")
                ctx.beginPath();
                const startY = getJitter(textHeight/3);
                const endY = getJitter(textHeight/3);
                ctx.moveTo(-textWidth/1.5, startY);
                ctx.bezierCurveTo(
                    -textWidth/3, startY - textHeight, 
                    textWidth/3, endY + textHeight,    
                    textWidth/1.5, endY
                );
                ctx.stroke();

                ctx.globalCompositeOperation = 'multiply';
            }

            ctx.restore();
        }
    }
    
    ctx.restore();

    // Bruit Global
    if (security.addNoise) {
        ctx.globalCompositeOperation = 'source-over';
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const noiseIntensity = 10;

        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() > 0.6) {
                const noise = (Math.random() - 0.5) * noiseIntensity;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
};

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
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Rasterization failed"));
        }, 'image/jpeg', 0.95);
    });
};

export const watermarkImage = async (file: File, settings: WatermarkSettings): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
    const pdfDoc = await PDFDocument.create();
    
    if (removeMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setProducer('MetafiliX Secure Engine'); 
        pdfDoc.setCreator('');
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

export const watermarkPdf = async (file: File, settings: WatermarkSettings): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
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
