# Investment Agent

This is a localized investment analysis tool built with AI Coding, utilizing AI to provide comprehensive stock market analysis, asset management, and investment recommendations.

English Version | [中文版本](./doc//zh/README.md)

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/ishenli/investment-agent)](https://github.com/ishenli/investment-agent/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ishenli/investment-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/ishenli/investment-agent/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/ishenli/investment-agent/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/ishenli/investment-agent/actions/workflows/dependabot/dependabot-updates)


## Table of Contents

- [Overview](#overview)
- [Installation and Usage](#installation-and-usage)
  - [Global Installation](#global-installation)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
- [Features](#features)
- [Architecture Design](#architecture-design)
- [Available Scripts](#available-scripts)
- [Database Operations](#database-operations)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
  - [Frontend Frameworks and Tools](#frontend-frameworks-and-tools)
  - [AI and LLM](#ai-and-llm)
  - [Database and Storage](#database-and-storage)
  - [Data Visualization and Charts](#data-visualization-and-charts)
  - [UI Component Libraries](#ui-component-libraries)
  - [Development Tools and Testing](#development-tools-and-testing)
- [CI/CD Automation](#cicd-automation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

Investment Agent is an advanced investment analysis platform that uses a multi-agent AI system to analyze stocks and provide investment recommendations. It combines technical analysis, news sentiment, fundamental data, and market trends to provide comprehensive investment insights. The platform also supports portfolio management and market information retrieval functions.

### Features

<center>light mode</center>

![](./doc/asset//intro-light.png)

<center>dark mode</center>

![](./doc/asset//intro-dark.png)

### Complete Feature List

- **Multi-Agent AI Analysis**: Utilize specialized AI agents for different aspects of stock analysis
  - Market Analyst: Technical indicator analysis
  - News Analyst: Market sentiment analysis
  - Bull/Bear Researchers: Multi-perspective viewpoints
  - Risk Manager: Investment risk assessment
  - Trader: Final decision making

- **Real-time Data Retrieval**: Integration with financial data providers for latest market information

- **Comprehensive Technical Analysis**:
  - Moving Averages (MA)
  - Relative Strength Index (RSI)
  - Moving Average Convergence Divergence (MACD)
  - Other professional indicators

- **Intelligent News Sentiment Analysis**: Evaluate market sentiment from news sources and potential impact on stock prices

- **Multi-layer Risk Assessment System**:
  - Technical risk assessment
  - Market risk assessment
  - Portfolio risk analysis

- **Interactive Dashboard**: User-friendly interface with real-time data visualization

- **Portfolio Management**: Track and analyze portfolio returns and risks

- **Automatic Market Information Retrieval**: Automatically fetch, analyze, and store market information

- **Persistent Data Storage**: Reliable data persistence using SQLite and Drizzle ORM

- **Theme**: Support light and dark mode

- **Internationalization**: Support Simplified Chinese and English

## Installation and Usage

### Global Installation

This project can be installed globally as a CLI tool using the following commands:

```bash
# Global installation with npm
npm install -g investment-agent

# Available commands
# investment-agent: main command
# ig: shorthand command
```

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/ishenli/investment-agent.git
   cd investment-agent
   ```

2. Install dependencies:

   ```bash
   pnpm install
   # or
   npm install
   ```

3. Create environment variable configuration:

   Create a `.env.local` file in the root directory (refer to the Environment Variables section below)

4. Run the development server:

   ```bash
   pnpm dev
   # Visit http://localhost:3000
   ```

### Local Project Environment Variables

Configure the following environment variables in the `.env.local` file:

```env
# =================== LLM Configuration ===================
# OpenAI compatible API URL
MODEL_PROVIDER_URL=your_openai_compatible_api_url

# API Key
MODEL_PROVIDER_API_KEY=your_api_key

# =================== Data Providers ===================
# Finnhub API Key (stock market data)
FINNHUB_API_KEY=your_finnhub_api_key

# =================== LangSmith (Optional) ===================
# For LangChain tracking and debugging
LANGSMITH_API_KEY=your_langsmith_api_key

# =================== Other APIs (Optional) ===================
# Financial datasets key
FINANCIAL_DATASETS_KEY=your_financial_datasets_key
```

## Global Environment Variables

When using Electron, environment variables need to be configured in global environment variables rather than the `.env.local` file.

## Architecture Design

The system is built on a multi-agent architecture, with each agent specializing in a specific aspect of investment analysis:

### Core Agent Architecture

1. **Market Analyst**
   - Uses technical indicators (moving averages, RSI, MACD, etc.)
   - Generates technical analysis reports

2. **News Analyst**
   - Analyzes news sentiment
   - Evaluates potential impact of news on stock prices

3. **Bull Researcher**
   - Seeks evidence supporting bullish positions
   - Generates long-position viewpoint reports

4. **Bear Researcher**
   - Seeks evidence supporting bearish positions
   - Generates short-position viewpoint reports

5. **Research Manager**
   - Mediates debates between bullish and bearish analysts
   - Synthesizes multiple perspectives

6. **Risk Manager**
   - Assesses investment risks based on all analyses
   - Ensures appropriate risk management

7. **Trader**
   - Makes final investment decisions based on all analyses
   - Generates actionable investment recommendations

### Technical Architecture

- **Frontend Layer**: Next.js 16 + React 19 + TypeScript
- **AI Layer**: LangChain + LangGraph (multi-agent orchestration) + Claude Agent SDK
- **Data Layer**: SQLite + Drizzle ORM
- **Service Layer**: RESTful API + WebSocket (real-time data)
- **State Management**: Zustand + TanStack Query
- **Skills System**: Claude Code-compatible skill packages (`{slug}/SKILL.md`) with filesystem discovery, DB preference management, and auto-deployment to the Claude workspace

## Available Scripts

### Development and Build

```bash
# Development server (Next.js)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Build Electron application
pnpm electron:build
```

### LangGraph Development

> Only needed for debugging langgraph, not required

```bash
# LangGraph development server (port 54367)
pnpm langgraph:dev

# Start LangGraph service
pnpm langgraph:start
```

### Code Quality

```bash
# TypeScript type checking
pnpm types:check

# ESLint checking
pnpm lint

# ESLint auto-fix
pnpm lint:fix

# Prettier formatting
pnpm format

# Check formatting
pnpm format:check
```

### Database Operations

```bash
# Generate database migration files
pnpm db:generate

# Execute database migrations
pnpm db:migrate

# Open Drizzle Studio (database visual management)
pnpm db:studio
```

### Testing

```bash
# Test asset service
pnpm test
```

## Database Operations

This project integrates SQLite database and Drizzle ORM for data persistence.

### Drizzle ORM Key Features

- Type-safe database operations
- Automated migration management
- Visual database management tool (Drizzle Studio)

### Database Operation Workflow

1. **Modify Database Schema**: Edit `drizzle/config.ts` or related schema files
2. **Generate Migration Files**: `pnpm db:generate`
3. **Execute Migrations**: `pnpm db:migrate`
4. **Visual Management**: `pnpm db:studio` (optional)

## Usage

### Web Application

1. Start the development server:

   ```bash
   pnpm dev
   ```

2. Open your browser and visit [http://localhost:3000](http://localhost:3000)

### Electron Application

1. Build the application:

   ```bash
   pnpm electron:build
   ```

2. After building, you can find the installation package for the corresponding platform in the `release` directory.

### CLI Tool

If installed globally, you can use:

```bash
# Using full command
investment-agent [command] [options]

# Or using shorthand
ig [command] [options]
```

## Project Structure

```
investment-agent/
├── bin/                          # Executable files (CLI)
│   ├── investment-agent.js       # Main command entry
│   └── ig.js                     # Shorthand command entry
├── src/                          # Source code directory
│   ├── app/                      # Next.js application directory
│   │   ├── (pages)/              # Page components (route groups)
│   │   │   ├── asset-management/           # Asset management pages
│   │   │   ├── asset-market-info-fetcher/  # Market information retrieval pages
│   │   │   ├── stock/                    # Stock analysis pages
│   │   │   └── ...                       # Other pages
│   │   ├── api/                # API routes
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── lib/                # Utility function library
│   │   ├── store/              # State management (Zustand stores)
│   │   └── types/              # TypeScript type definitions
│   ├── locales/                # locales i18n
│   ├── server/                 # Server-side code
│   │   ├── core/               # Core services
│   │   ├── service/            # Business logic layer
│   │   └── tradingagents/      # AI Agent implementations
│   └── shared/                 # Client and server shared code
├── tests/                      # Test files
├── drizzle/                    # Drizzle ORM configuration
│   ├── config.ts               # Database configuration
│   └── schema/                 # Database schema definitions
├── public/                     # Static resources
├── .next/                      # Next.js build output (generated)
├── .env.local                  # Environment variables (local)
├── package.json                # Project configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── README.md                   # Project documentation
```

## Technology Stack

### Core Framework & Infrastructure

- **Next.js** - React-based full-stack framework with App Router
- **React** - Modern UI library with Concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Electron** - Cross-platform desktop application framework
- **Electron Builder** - Professional Electron app packaging and distribution

### AI & LLM Integration

- **LangChain** - Advanced LLM application development framework
- **LangGraph** - Graph-based orchestration for multi-agent systems
- **@langchain/core** - Core LangChain modules and utilities
- **@langchain/openai** - OpenAI API integration
- **Vercel AI SDK** - Streaming AI responses and edge functions
- **DeepAgents** - Advanced AI agent orchestration platform
- **Tavily** - AI-powered web search and information retrieval
- **Claude Agent SDK** - Claude Agent SDK

### Database & Data Management

- **Drizzle ORM** - Type-safe SQL ORM with excellent TypeScript support
- **Drizzle Kit** - Database schema management and migrations
- **@libsql/client** - LibSQL client for edge-compatible database operations

### UI Components & Design System

- **Ant Design** - Enterprise-grade React component library
- **@ant-design/x** - Extended Ant Design components
- **LobeHub UI** - Modern AI-focused UI components
- **Radix UI** - Unstyled accessible UI primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Production-ready motion library
- **Lucide React** - Beautiful SVG icon library

### State Management & Data Fetching

- **Zustand** - Lightweight, scalable state management
- **Zustand Utils** - Enhanced Zustand utilities
- **TanStack Query** - Server state management and caching
- **SWR** - React Hooks for data fetching
- **Ahooks** - Comprehensive React Hooks library

### Data Visualization & Charts

- **Recharts** - Declarative charting library for React
- **@xyflow/react** - Interactive node-based diagrams and flowcharts
- **React Syntax Highlighter** - Code syntax highlighting component

### Financial Data & Processing

- **Finnhub** - Real-time financial market data API
- **Decimal.js** - High-precision decimal arithmetic
- **Numeral** - Number formatting and manipulation

### Internationalization & Localization

- **i18next** - Internationalization framework
- **react-i18next** - React integration for i18next

### Development & Build Tools

- **ESLint** - Code quality and linting
- **Prettier** - Code formatting
- **Husky** - Git hooks management
- **Vitest** - Vite-native testing framework
- **TypeScript ESLint** - TypeScript-specific linting rules

### Utility Libraries & Helpers

- **Lodash** - JavaScript utility functions
- **Date-fns** - Modern date utility library
- **Dayjs** - Lightweight date and time library
- **Axios** - Promise-based HTTP client
- **Zod** - TypeScript-first schema validation
- **UUID** - UUID generation
- **Nanoid** - Compact unique ID generator
- **Fast Deep Equal** - High-performance deep comparison

### Text Processing & Markdown

- **Cheerio** - Server-side jQuery implementation
- **Remark-parse** - Markdown parsing engine
- **Shiki** - Beautiful syntax highlighting
- **Unified** - Text processing ecosystem

### Logging & Monitoring

- **Winston** - Multi-transport logging solution
- **Winston Daily Rotate File** - Log rotation management
- **Debug** - Selective debugging utility

### Modern Web Features

- **Next Themes** - Theme switching for Next.js applications
- **React Virtuoso** - Virtualized list rendering
- **Embla Carousel** - Lightweight carousel component
- **Dnd Kit** - Drag and drop primitives
- **Nuqs** - URL query parameter management
- **Sonner** - Toast notification library

## CI/CD Automation

This project is configured with a complete CI/CD pipeline to ensure code quality and stability.

### Workflow Overview

#### 1. **CI Workflow** (`ci.yml`)

**Trigger Conditions**:
- Push to `main` or `develop` branches
- Pull Request merge to `main`

**Execution Flow**:
```
✓ Environment setup (Node.js 18.x, 20.x)
✓ Dependency installation
✓ Type checking (typescript)
✓ Code quality checking (eslint)
✓ Formatting checking (prettier)
✓ Run all tests (vitest)
✓ Project build (next build)
✓ Security audit
```

### Git Hooks

Using Husky to manage Git Hooks, automatically running code checks before commits:

```bash
# Automatically executed before commit
✓ lint-staged (check staged files)
  ├─ ESLint check JS/TS/TSX files
  └─ Prettier check JSON/MD/CSS files
```

## Deployment

Direct local deployment is sufficient.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Project**
   
   ```bash
   # Click the Fork button on GitHub
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/investment-agent.git
   cd investment-agent
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b bugfix/fix-bug
   ```

4. **Make Changes**
   - Follow existing code style
   - Add necessary tests
   - Update documentation (if needed)

5. **Commit Changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   # Use conventional commit format
   ```

6. **Push to Branch**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Create Pull Request**
   - Create PR on GitHub
   - Fill out PR template
   - Wait for code review

### Code Standards

- Use **Conventional Commits** specification
- Follow **ESLint** and **Prettier** configurations
- Write **TypeScript** type definitions
- Add necessary **unit tests**

### Debugging Details

- Electron Mac address: /Users/[UserName]/Library/Application Support/investment-agent

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```text
MIT License

Copyright (c) 2026 ishenli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Acknowledgments

### Core Inspiration Sources

This project is based on research and code from the following excellent projects:

| Author | Repository/Project | Contribution |
|------|----------|------|
| [Tauric Research Team](https://github.com/TauricResearch) | **[TradingAgents](https://github.com/TauricResearch/TradingAgents)** | Provided core architecture ideas for multi-agent trading systems, paper reference: [arxiv.org/pdf/2412.20138](https://arxiv.org/pdf/2412.20138) |
| [@delenzhang](https://github.com/delenzhang) | **[TradingAgents](https://github.com/delenzhang/TradingAgents)** | Chinese optimization and adaptation work |
| [@canisminor1990](https://github.com/canisminor1990) | [lobehub-ui](https://ui.lobehub.com/) | Advanced UI components and design system |
｜LobsterAI｜ https://github.com/netease-youdao/LobsterAI｜ Skill System|

### Technical Support

Thanks to the open-source community for the following projects and tools:

- **Next.js** - React framework
- **LangChain** - AI application development
- **Ant Design** - UI component library
- **Radix UI** - Unstyled components
- And all maintainers of open-source dependencies

---

**Made with ❤️ by ishenli**

If you have questions or suggestions, feel free to submit an [Issue](https://github.com/ishenli/investment-agent/issues) or contact the author.