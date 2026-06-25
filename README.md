# ERP Frontend Web

Next.js App Router frontend for the ERP project. Uses TypeScript, Tailwind CSS, and the `src/` directory layout.

## Prerequisites

- Node.js 18.18+ (20 LTS recommended)
- npm

## Getting Started

Install dependencies (if not already done):

```bash
npm install
```

Copy environment variables and adjust as needed:

```bash
# .env.local is gitignored; create it with:
# NEXT_PUBLIC_API_URL=http://localhost:8080
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Edit the home page at [`src/app/page.tsx`](src/app/page.tsx). Changes hot-reload automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

## Backend API

The NestJS backend runs on port **8080** by default. Set `NEXT_PUBLIC_API_URL` in `.env.local` to point at the API (e.g. `http://localhost:8080`).

## Project Structure

```text
src/
└── app/
    ├── layout.tsx    # Root layout
    ├── page.tsx      # Home page (/)
    └── globals.css   # Global styles (Tailwind)
```
