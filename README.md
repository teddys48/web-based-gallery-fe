# Web Gallery Frontend (Svelte 5 + Vite + TypeScript + Bun)

Frontend Web Gallery modern, responsive, dan berkinerja tinggi yang dibangun dengan **Svelte 5**, **Vite**, **TypeScript**, **Bun**, **Tailwind CSS**, **TanStack Query**, dan **TanStack Virtual**.

Diintegrasikan secara langsung dengan backend [gallery-be](../gallery-be) (Go Fiber + SQLite).

---

## 🌟 Fitur Utama

- **Svelte 5 Modern**: Memanfaat fitur Svelte 5 (`$state`, `$derived`, `$effect`, `$props`, stores).
- **Timeline View**:
  - Paginasi cursor & infinite scroll.
  - Quick-jump scrubber per Bulan/Tahun.
  - Grid virtualized dengan performa tinggi.
- **Folder View**:
  - Hierarchy directory tree sidebar dengan statistik item.
  - Breadcrumb navigation (`Root / Vacation2025 / Bali`).
  - Sub-folder cards & photo grid.
- **Photo Lightbox / Viewer**:
  - Mode Fullscreen overlay.
  - Prev / Next navigation & preloading.
  - Keyboard shortcuts (`ArrowLeft`, `ArrowRight`, `Esc`, `M`, `+`, `-`, `0`).
  - Interactive Zoom (In, Out, Reset, Drag-to-Pan).
  - Mobile Touch Swipe gestures (Swipe left/right untuk navigasi, swipe down untuk close).
  - EXIF Metadata panel (Aperture, Shutter, ISO, Focal Length, Camera Model, GPS location, File Size, Resolution).
  - Direct download original file.
- **Media Scanner**:
  - Live indicator status scanning media di background.
  - Manual trigger button untuk scanning ulang folder media.
- **Responsive & Dark Mode**:
  - Mobile drawer navigation.
  - Dark mode toggle dengan persitensi theme.
  - Glassmorphic UI design system.

---

## 🛠️ Tech Stack & Dependencies

| Category | Library / Tool |
| :--- | :--- |
| **Framework** | Svelte 5 + Vite |
| **Runtime & PM** | Bun 1.3+ |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v3 + Custom HSL design tokens |
| **Server State** | `@tanstack/svelte-query` |
| **Virtualization**| `@tanstack/svelte-virtual` |
| **Icons** | `lucide-svelte` |
| **Date Format** | `date-fns` |

---

## 📁 Struktur Project (Clean Architecture)

```
gallery-fe/
├── src/
│   ├── app.css                 # CSS Design tokens & glassmorphism
│   ├── App.svelte              # Root layout & providers
│   ├── main.ts                 # Application entrypoint
│   ├── features/
│   │   ├── folder/             # Folder view & breadcrumbs
│   │   ├── grid/               # PhotoCard & VirtualizedGrid
│   │   ├── lightbox/           # LightboxModal & MetadataPanel
│   │   └── timeline/           # TimelineView & Scrubber
│   └── lib/
│       ├── api/                # API Client, endpoints & mock fallback
│       ├── components/common/  # Header, Sidebar, ScannerBar, EmptyState, ErrorBanner
│       ├── stores/             # Theme, Lightbox, Folder & View UI stores
│       └── types/              # TypeScript interfaces (Photo, Folder, Timeline)
├── .env.example
├── Dockerfile
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.ts
```

---

## 💻 Cara Menjalankan Project (Local Development dengan Bun)

### Prasyarat
- [Bun](https://bun.sh) v1.1+ atau v1.3+

### Langkah-langkah
```bash
# 1. Install dependensi
bun install

# 2. Salin environment configuration
cp .env.example .env

# 3. Jalankan development server
bun run dev
```

Aplikasi dapat diakses di: `http://localhost:3000`

---

## 🐳 Running dengan Docker

```bash
# Build Docker image
docker build -t gallery-fe:latest .

# Run Docker container
docker run -d -p 3000:80 --name gallery_fe_app gallery-fe:latest
```

Atau gabungkan dengan `gallery-be` melalui Docker Compose.

---

## 🧪 Production Build & Type Checking

```bash
# Svelte type check
bun run check

# Build bundle produksi
bun run build

# Preview build produksi
bun run preview
```
