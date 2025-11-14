# SBOM Comparator

A modern web application for comparing SBOM (Software Bill of Materials) tool outputs across multiple container images.

## Features

- 🔄 Multi-tool SBOM comparison (Syft, Trivy, Docker Scout)
- 📊 Interactive visualizations and charts
- 🔍 Package-level analysis with pURL parsing
- 🌓 Dark mode support
- 📤 Export results as JSON or PDF
- 🎨 Modern UI with Framer Motion animations

## Prerequisites

- Node.js >= 20.10.0 (managed via nvm)
- npm >= 10.0.0

## Setup

### 1. Install Node.js version

```bash
nvm install
nvm use
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook
- `npm run format` - Format code with Prettier

## Project Structure

```
sbom-comparator/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable UI components
│   ├── lib/             # Utility functions
│   ├── models/          # TypeScript interfaces
│   ├── hooks/           # Custom React hooks
│   └── __tests__/       # Test files
├── public/              # Static assets
├── stories/             # Storybook stories
└── ...config files
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Testing**: Jest + React Testing Library
- **Documentation**: Storybook

## Adding New Features

### Add a new component

1. Create component in `src/components/`
2. Add TypeScript interfaces
3. Write tests in `src/__tests__/`
4. Create Storybook story in `stories/`

### Add new SBOM format support

1. Update interfaces in `src/models/ISbom.ts`
2. Add parser in `src/lib/parseSbom.ts`
3. Write tests for the parser
4. Update mock data in `src/lib/mockData.ts`

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Deployment

### Build for production

```bash
npm run build
```

### Deploy to Vercel

```bash
vercel deploy
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
