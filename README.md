<div align="center">

# MetafiliX
### Local, reinforced watermarking for PDF and images

[![License: MIT](https://img.shields.io/github/license/garnajee/formacheck)](https://opensource.org/licenses/MIT)
[![Privacy: Local](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](https://github.com/yourusername/metafilix)
[![Security: Forensic](https://img.shields.io/badge/Security-Forensic%20Grade-red.svg)]()
[![Stack: React](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20TS-blue.svg)]()

<p align="center">
  <b>MetafiliX</b> is a web app designed to add watermarks on PDF and images (for now). Anti-AI secuirty features.<br/>
  MetafiliX can preserve selectable PDF text in Standard mode or fuse the watermark into page pixels in Reinforced mode. These techniques increase deterrence and make automated removal more difficult without claiming that any watermark is impossible to remove.
</p>

</div>

## ✨ Key Features

*   **🔒 100% Client-Side (Private)**: No data ever leaves your browser. Your confidential documents never touch a server.
*   **📄 Multi-Format Support**: Handles PDF, JPG, PNG, and WEBP.
*   **⚡ Flexible Conversion Pipelines**: 
    *   Image ➔ PDF (Secured)
    *   PDF ➔ PDF (Flattened & Secured)
    *   Image ➔ Image
*   **🎨 Full Customization**: Precise control over text, size, color (Hex input), and opacity (%).
*   **👁️ Real-Time Preview**: Visualize the impact of your security settings before processing.
*   **🌙 Dark/Light Mode**: Modern, responsive UI.

## 🛡️ Security Architecture (The Core)

This is where MetafiliX stands out. I employ a **"Defense in Depth"** strategy to protect your documents.

### 1. Optional Rasterization (Reinforced Mode)
Standard vector watermarks (added by Adobe Acrobat or basic libraries) are distinct layers. A single click is enough to delete them.
*   **Standard mode:** Keeps the original PDF content and selectable text, then adds a graphical watermark layer.
*   **Reinforced mode:** Converts every page into a high-resolution image and burns the watermark into the resulting pixels.

### 2. Anti-AI & Anti-Inpainting Strategies
AI tools attempt to reconstruct the image underneath the watermark by analyzing patterns and uniform colors. I try to destroy this capability:

*   **Multi-scale pattern:** Two interleaved watermark grids make one-pass masking less effective.
*   **Per-file variation:** Position, angle, scale and opacity use a unique seed for every uploaded file and page.
*   **Adaptive contrast:** Light or dark outlines are selected from local document luminance.
*   **Glyph texture:** Cross-hatching is clipped to the letters instead of degrading the entire source image.
*   **Readable layout:** Long phrases are wrapped and resized automatically without clipping words.

### 3. Total Geometric Coverage
I utilize a "Brute Force" geometric calculation to ensure that no corner of the document (especially on square or panoramic images) remains unwatermarked after the 45° rotation.

## 🧹 Forensic Metadata Sanitization

MetafiliX doesn't just clear tags. It applies the **"Clean Slate Protocol"**:

1.  **Isolation:** The original document is read, rendered into raw pixels, and then flushed from memory.
2.  **Reconstruction:** A completely blank PDF container (`PDFDocument.create()`) is instantiated.
3.  **Injection:** Only the processed pixels are injected into this new container.
4.  **Temporal Anonymization:**
    *   Creation and Modification dates forced to **Epoch 0** (`1970-01-01T00:00:00.000Z`).
    *   Stripping of XMP (XML Metadata Platform) tags.
    *   Stripping of EXIF and IPTC data (for images).
    *   Removal of editing history and embedded thumbnails.
    *   Removal of Producer/Creator software signatures.

## 🚀 Installation & Getting Started

This project uses **Vite** for a lightning-fast development environment.

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### Commands

```bash
# 1. Clone the repository
git clone https://github.com/garnajee/metafilix.git

# 2. Navigate to the folder
cd metafilix

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.


## 🛠️ Tech Stack

*   **Core:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) (Icons)
*   **PDF Manipulation:** 
    *   [`pdf-lib`](https://pdf-lib.js.org/) (Creation and Assembly)
    *   [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) (Rendering Engine for Rasterization)

## ⚠️ Legal Disclaimer

No visible watermark is invulnerable to a determined editor or modern inpainting system. MetafiliX provides local processing, visible deterrence and a reinforced raster mode; it does not guarantee that removal is impossible.

## License

This project is under [GNU GPLv3](LICENSE) License

---

<div align="center">
  Made with ❤️ and a lot of ☕ for privacy protection.
</div>
