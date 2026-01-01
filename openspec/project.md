# Project Context

## Purpose
This project is an advanced investment analysis platform built with Next.js that leverages AI agents to provide comprehensive stock market analysis, asset management, and investment recommendations. It combines technical analysis, news sentiment, fundamental data, and market trends to deliver comprehensive investment insights.

## Tech Stack
- Next.js 16 (React framework)
- TypeScript
- React 19
- Tailwind CSS
- Zustand (State management)
- Ant Design (UI components)
- LangChain.js (AI/ML framework)
- SQLite (Database)
- Drizzle ORM (Database ORM)
- Finnhub API (Financial data)
- Recharts (Data visualization)

## Project Conventions

### Code Style
- TypeScript for type safety
- ESLint and Prettier for code formatting
- File naming convention: kebab-case for files, PascalCase for components
- Function components with hooks preferred over class components
- Zod for validation

### Architecture Patterns
- Multi-agent AI architecture with specialized agents for different aspects of investment analysis
- Next.js App Router for routing
- Component-based architecture with clear separation of concerns
- Service layer for API interactions
- Store pattern for global state management
- API routes for server-side functionality
- Drizzle ORM for database interactions

### Testing Strategy
- Unit testing with Jest
- Component testing with React Testing Library
- End-to-end testing with Cypress
- Integration testing for API endpoints

### Git Workflow
- Git flow branching strategy
- Feature branches for new development
- Semantic versioning for releases
- Conventional commits for clear commit messages

## Domain Context
- Investment Analysis: A system for analyzing stocks using multiple AI agents
- Multi-agent System: Market Analyst, News Analyst, Bullish Researcher, Bearish Researcher, Research Manager, Risk Manager, and Trader
- Asset Management: Tracking and analyzing investment portfolios
- Market Information Fetching: Automated retrieval and analysis of market information
- Technical Analysis: Comprehensive technical indicators and charting capabilities

## Important Constraints
- TypeScript strict mode enabled
- Must follow AI/ML best practices for investment analysis
- Performance optimization for real-time data processing
- Integration with financial data providers
- Data persistence with SQLite and Drizzle ORM

## External Dependencies
- Finnhub API for financial market data:
  - Stock price data
  - Technical indicators
  - News feeds
- LangChain.js for AI agent orchestration
- OpenAI API for AI models
- Drizzle ORM for database operations
- Recharts for data visualization
- Winston for logging
