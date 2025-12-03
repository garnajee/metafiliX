<div align="center">

# MetafiliX
### The Ultimate Forensic & Anti-AI Watermarking Solution

[![License: MIT](https://img.shields.io/github/license/garnajee/formacheck)](https://opensource.org/licenses/MIT)
[![Privacy: Local](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](https://github.com/yourusername/metafilix)
[![Security: Forensic](https://img.shields.io/badge/Security-Forensic%20Grade-red.svg)]()
[![Stack: React](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20TS-blue.svg)]()

<p align="center">
  <b>MetafiliX</b> is a web app designed to add watermarks on PDF and images (for now). Anti-AI secuirty features.<br/>
  Unlike standard tools that simply overlay text, MetafiliX <b>fuses</b>, <b>rasterizes</b>, and <b>noises</b> your documents to make watermarks mathematically complex to remove, even for the most advanced <i>Generative Fill</i> (In-painting) algorithms.
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

### 1. Mandatory Rasterization ("Armored" Mode)
Standard vector watermarks (added by Adobe Acrobat or basic libraries) are distinct layers. A single click is enough to delete them.
*   **My Solution:** MetafiliX converts every page of your PDF into a high-resolution image (Rasterization). The text is "burned" into the document's pixels. It no longer exists as a text object.

### 2. Anti-AI & Anti-Inpainting Strategies
AI tools attempt to reconstruct the image underneath the watermark by analyzing patterns and uniform colors. I try to destroy this capability:

*   **🧬 Font Polymorphism:** The system randomly switches fonts (*Arial, Verdana, Times, Courier, Impact...*) for every single repetition of the word. The AI cannot "learn" a consistent letter shape to reconstruct.
*   **🧪 "Multiply" Blend Mode:** The text isn't just placed *on* the image; it is embedded *into* the image colors (subtractive mixing).
*   **🌈 Gradient Fill:** The text is not a solid color. It contains a vertical micro-gradient, breaking the mathematical consistency required for color subtraction algorithms.
*   **🕸️ Cross-Hatching Texture:** A fine diagonal line texture is drawn *over* the text. AI interprets this as complex structural detail rather than a clean area to erase.
*   **👻 Ghost Strokes:** A faint, slightly offset outline is drawn around the text to confuse edge-detection algorithms.
*   **〰️ Geometric Chaos (Jitter):** 
    *   Random Position (X/Y).
    *   Random Rotation (+/- degrees).
    *   Random Scale (Variable size).
*   **📉 Organic Interference:** Random Bezier curves (simulating hairs or fibers) and "ink splatters" traverse the text to break linearity.

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

While MetafiliX employs advanced techniques to prevent watermark removal, no system is 100% infallible against a human expert with unlimited time or future, non-existent AI models. MetafiliX offers a very high level of **deterrent and forensic protection**, making the task economically and technically unviable for the vast majority of malicious actors.

## License

This project is under [GNU GPLv3](LICENSE) License

---

<div align="center">
  Made with ❤️ and a lot of ☕ for privacy protection.
</div>
