'use client';

import {
  Wrench,
  TrendingUp,
  Coins,
  NotebookPen,
  Search,
  CreditCard,
  BarChart3,
  FileText,
  ListTodo,
} from 'lucide-react';
import type { ToolCategory } from '@/types/tool/metadata';

export const CATEGORY_ICON_MAP: Record<ToolCategory, React.ReactNode> = {
  system: <Wrench className="h-4 w-4" />,
  stock: <TrendingUp className="h-4 w-4" />,
  asset: <Coins className="h-4 w-4" />,
  note: <NotebookPen className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  transaction: <CreditCard className="h-4 w-4" />,
  market: <BarChart3 className="h-4 w-4" />,
  report: <FileText className="h-4 w-4" />,
  task: <ListTodo className="h-4 w-4" />,
};
