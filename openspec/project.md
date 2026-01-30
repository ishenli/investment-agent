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
- Unit testing with Vitest
- Component testing with React Testing Library
- Integration testing for API endpoints

### Git Workflow
- Git flow branching strategy
- Feature branches for new development
- Semantic versioning for releases
- Conventional commits for clear commit messages

## Domain Context
- Investment Analysis: A system for analyzing stocks using multiple AI agents with LangGraph workflows
- Multi-agent System: AI agents for market analysis, news analysis, bullish/bearish research, risk management, and trading recommendations
- Asset Management: Tracking and analyzing investment portfolios with position management and performance analytics
- Market Information Fetching: Automated retrieval and analysis of market information from Finnhub API
- Technical Analysis: Comprehensive technical indicators and charting capabilities
- AI Insights Generation: AI-powered investment insights, diversification recommendations, and strategy advice
- Portfolio Reporting: Automated generation of weekly and monthly investment reports with AI analysis
- Financial Data Services: Real-time stock prices, company information, and market news integration
- Account Management: Trading account management with balance tracking and transaction history

## Important Constraints
- TypeScript strict mode enabled with strict type checking
- Must follow AI/ML best practices for investment analysis and risk management
- Performance optimization for real-time data processing with sub-second UI response times
- Rate limiting and API quota management for financial data providers
- Data validation using Zod schemas for all user inputs and external data
- Security considerations for financial data handling and API key management
- Data persistence with SQLite and Drizzle ORM

## External Dependencies
- Finnhub API for financial market data:
  - Stock price data
  - Technical indicators
  - News feeds
- LangChain.js and LangGraph for AI agent orchestration and workflow management
- Drizzle ORM for database operations
- Recharts for data visualization
- Winston for logging and monitoring
- Tavily Search API for market research and news analysis
- OpenAI API for advanced language model processing
- Dexie.js for client-side IndexedDB management
