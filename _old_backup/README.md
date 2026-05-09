# GST Return Pro

A production-ready SaaS-style web application for **GST Return Processing** based on marketplace sales data. Built with React, TypeScript, Firebase, and Tailwind CSS.

## ✨ Features

- **Google Authentication** — Secure login via Firebase Auth
- **Multi-Client Management** — Create, edit, delete clients with full CRUD
- **Flipkart Processing** — Parse sales/GST Excel reports into standardized JSON
- **Drag & Drop Upload** — Upload Excel (.xlsx/.xls), CSV, and JSON files
- **Smart Parsing** — Auto-detect column mappings from diverse report formats
- **Data Table Viewer** — TanStack Table with sorting, filtering, pagination
- **JSON Viewer** — Pretty-printed JSON with syntax highlighting
- **Comparison Engine** — Side-by-side diff highlighting missing records & amount mismatches
- **Analytics Dashboard** — Recharts-powered charts (Sales Trend, GST Collected, State-wise, GST Breakdown)
- **Auto-Save** — Toggle automatic cloud save after processing
- **Export** — Download as Excel or JSON
- **Theme System** — Light / Dark / System with persistent preference
- **History Sidebar** — Grouped by date with view/delete actions
- **Toast Notifications** — Success, error, and loading states
- **Responsive Design** — Desktop sidebar + mobile collapsible layout
- **Scalable Architecture** — Designed for Amazon, Meesho, and other platforms

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Routing | React Router v7 |
| Backend | Firebase (Auth, Firestore, Storage) |
| Excel | xlsx (SheetJS) |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Dates | Day.js |
| Icons | Lucide React |
| Uploads | React Dropzone |
| Notifications | React Hot Toast |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Auth, Firestore, and Storage enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/elsesourav/gst-return.git
cd gst-return

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your Firebase config to .env
# Then start development server
npm run dev
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Google Sign-In** under Authentication → Sign-in method
3. Create a **Firestore Database** (start in test mode)
4. Enable **Storage**
5. Copy your config values into `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx       # Main app layout with header & settings
│   ├── Modal.tsx        # Modal & ConfirmDialog components
│   └── ui.tsx           # Button, Input, Select, Card, Badge, etc.
├── features/            # Feature modules
│   ├── analytics/       # Recharts-powered analytics panel
│   ├── auth/            # Login page & route protection
│   ├── clients/         # Dashboard with client management
│   ├── comparison/      # Side-by-side data comparison engine
│   ├── files/           # Upload panel & data table viewer
│   └── flipkart/        # Flipkart parser & platform page
├── hooks/               # Custom React hooks
├── services/            # Firebase service layer
│   ├── firebase.ts      # Firebase initialization
│   ├── firestore.ts     # Firestore CRUD operations
│   └── storage.ts       # Storage upload/download/delete
├── store/               # Zustand state management
│   ├── authStore.ts     # Authentication state
│   ├── clientStore.ts   # Client CRUD state
│   ├── fileStore.ts     # Files, processed data, history
│   └── settingsStore.ts # Theme & auto-save preferences
├── types/               # TypeScript type definitions
├── utils/               # Helper utilities
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point
└── index.css            # Design system & global styles
```

## 📜 Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
```

## 🔄 Future Platforms

The architecture supports adding new marketplace parsers:

1. Create `src/features/<platform>/parser.ts`
2. Implement the same `ParseResult` interface
3. Add a route in `App.tsx`
4. Enable the platform in `Dashboard.tsx`

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.