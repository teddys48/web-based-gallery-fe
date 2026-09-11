# Web Gallery Frontend (Svelte 5 + Vite + TypeScript + Bun)

A modern, responsive, and high-performance Web Gallery frontend built with **Svelte 5**, **Vite**, **TypeScript**, **Bun**, **Tailwind CSS**, **TanStack Query**, and **TanStack Virtual**.

Seamlessly integrated with the [gallery-be](../gallery-be) backend (Go Fiber + SQLite).

---

## 🌟 Key Features

### 1. 📅 Timeline View & Get Media by Date

- **Pagination & Infinite Scroll**: Seamlessly loads media (photos/videos) as you scroll down without scroll resetting or infinite refetch loops.
- **Timeline Buckets**: Instant filtering by Year & Month (`GET /api/v1/photos/by-date`).
- **Memory Caching**: Active timeline bucket selections are cached via TanStack Query (5-minute `staleTime`), preventing repetitive API network requests.
- **Collapsible Date Groups**: Date-grouped media sections with smooth slide collapsible headers, accompanied by global _"Expand All"_ / _"Collapse All"_ controls.

### 2. 📁 Folder View & Streaming ZIP Download

- **Folder Tree Hierarchy**: Sidebar directory tree navigation featuring item count statistics per folder.
- **Breadcrumb Navigation**: Responsive path breadcrumbs (`Root / Vacation2025 / Bali`).
- **Sub-Folder Cards**: Interactive subfolder cards featuring auto-generated cover thumbnails.
- **Sorting & Timeline Filtering**: Interactive sort controls supporting **Newest**, **Oldest**, **Name (A-Z)**, and **Name (Z-A)** sorting, alongside dynamic **Timeline Bucket filtering (Year/Month)** for folder media, seamlessly updating grid layouts and Lightbox navigation order.
- **📦 Download Folder ZIP**: A dedicated _"Download ZIP"_ button to stream-download the current directory and all its subfolders (`GET /api/v1/folders/download?path=...`) directly as a `.zip` archive via HTTP streaming. Includes a _"Preparing ZIP..."_ loading state, double-click protection, and responsive error handling (400, 403, 404).

### 3. 🎬 Video Media & Thumbnail Service

- **Photo & Video Support**: Automatic format detection for video media (MP4, MKV, MOV, WEBM, AVI, 3GP, TS, WMV).
- **Video Duration & Play Badges**: Precise video duration pill badges and play icon overlays on media cards.
- **On-Demand Thumbnail Streaming**: Streams thumbnails by Photo ID (`GET /api/v1/photos/:id/thumbnail`) or media path (`GET /api/v1/thumbnails?path=...`) with on-demand generation and `thumbnail_path` fallback.

### 4. 🔍 Photo Lightbox / Fullscreen Viewer

- **Fullscreen Preview**: High-resolution image and video overlay.
- **Interactive Navigation**: Next/Prev navigation via keyboard (`ArrowLeft`, `ArrowRight`), UI buttons, or mobile touch gestures (swipe left/right to navigate, swipe down to close).
- **Interactive Zoom & Pan**: Zoom-in, zoom-out, reset, and drag-to-pan for detailed image inspection.
- **EXIF Metadata Panel**: Comprehensive camera information (Aperture, Shutter Speed, ISO, Focal Length, Camera Model, GPS location, File Size, Resolution).
- **Direct Raw Download**: Download original high-res media files directly (`GET /api/v1/photos/:id/raw`).

### 5. ⚡ Skeleton Loaders & Design System

- **Shimmer Skeleton Loading**: Animated glass shimmer loaders (`Skeleton.svelte`) during initial loads for Timeline, Folder View, Media Cards, and Sidebar Navigation.
- **Image Load Transition**: Smooth fade-in transitions when thumbnails complete downloading.
- **Sidebar Total Media Summary**: Pinned summary card displaying total media collection metrics at the bottom of the sidebar.
- **Media Scanner Status Bar**: Real-time status bar for background media directory scanning.
- **Dark Mode & Responsive UI**: Light/Dark theme switcher with local persistence and a mobile navigation drawer.

---

## 🛠️ Tech Stack & Dependencies

| Category           | Library / Tool                                                     |
| :----------------- | :----------------------------------------------------------------- |
| **Framework**      | Svelte 5 (Runes: `$state`, `$derived`, `$effect`, `$props`) + Vite |
| **Runtime & PM**   | Bun 1.1+ / 1.3+                                                    |
| **Language**       | TypeScript                                                         |
| **Styling**        | Tailwind CSS v3 + Custom HSL design tokens + Glassmorphism         |
| **Server State**   | `@tanstack/svelte-query` v5                                        |
| **Virtualization** | `@tanstack/svelte-virtual` v3                                      |
| **Icons**          | `lucide-svelte`                                                    |
| **Date Utils**     | `date-fns`                                                         |

---

## 🔌 Backend API Integration Summary

| Endpoint                          | Method | Description                                                              |
| :-------------------------------- | :----- | :----------------------------------------------------------------------- |
| `/api/v1/photos/timeline`         | `GET`  | Fetches paginated photos/videos for the main timeline                    |
| `/api/v1/photos/timeline/buckets` | `GET`  | Fetches timeline date buckets grouped by year & month                    |
| `/api/v1/photos/by-date`          | `GET`  | Fetches paginated media filtered by specific date, range, year, or month |
| `/api/v1/folders/tree`            | `GET`  | Fetches the complete folder directory tree                               |
| `/api/v1/folders/contents`        | `GET`  | Fetches folder contents (subfolders, date_groups, photos)                |
| `/api/v1/folders/download`        | `GET`  | Streams folder archive download as `.zip` (`?path=...`)                  |
| `/api/v1/photos/:id/thumbnail`    | `GET`  | Streams media thumbnail by ID (On-demand generation)                     |
| `/api/v1/thumbnails`              | `GET`  | Streams media thumbnail by query `path`                                  |
| `/api/v1/photos/:id/raw`          | `GET`  | Streams original high-resolution media file                              |
| `/api/v1/scan/status`             | `GET`  | Fetches background media scanner status                                  |
| `/api/v1/scan/start`              | `POST` | Triggers a new media scanning job                                        |

---

## 📁 Project Structure (Clean Architecture)

```
gallery-fe/
├── src/
│   ├── app.css                 # CSS Design tokens, glassmorphism & shimmer keyframes
│   ├── App.svelte              # Root layout & providers
│   ├── main.ts                 # Application entrypoint
│   ├── features/
│   │   ├── folder/             # FolderView & breadcrumbs navigation
│   │   ├── grid/               # PhotoCard & grid layout
│   │   ├── lightbox/           # LightboxModal & EXIF MetadataPanel
│   │   └── timeline/           # TimelineView & Date Grouping
│   └── lib/
│       ├── api/                # API Client, helpers & mock fallback
│       ├── components/common/  # Header, Sidebar, ScannerBar, Skeleton, EmptyState, ErrorBanner
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

## 💻 Getting Started (Local Development with Bun)

### Prerequisites

- [Bun](https://bun.sh) v1.1+ or v1.3+

### Steps

```bash
# 1. Install dependencies
bun install

# 2. Copy environment configuration
cp .env.example .env

# 3. Start development server
bun run dev
```

The application will be accessible at: `http://localhost:3000`

---

## 🐳 Running with Docker

```bash
# Build Docker image
docker build -t gallery-fe:latest .

# Run Docker container
docker run -d -p 3000:80 --name gallery_fe_app gallery-fe:latest
```

---

## 🧪 Production Build & Type Checking

```bash
# Svelte type check
bun run check

# Build production bundle
bun run build

# Preview production build
bun run preview
```
