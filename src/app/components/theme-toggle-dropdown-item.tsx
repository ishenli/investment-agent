'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggleDropdownItem() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4" />
        <span>主题</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="flex items-center text-xs font-medium text-muted-foreground px-2 py-1">
        主题设置
      </div>
      <button
        className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground w-full text-left ${theme === 'light' ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => setTheme('light')}
      >
        <Sun className="h-4 w-4" />
        <span className="flex-1">浅色</span>
        {theme === 'light' && <span className="text-muted-foreground">✓</span>}
      </button>
      <button
        className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground w-full text-left ${theme === 'dark' ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-4 w-4" />
        <span className="flex-1">深色</span>
        {theme === 'dark' && <span className="text-muted-foreground">✓</span>}
      </button>
      <button
        className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground w-full text-left ${theme === 'system' ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => setTheme('system')}
      >
        <Monitor className="h-4 w-4" />
        <span className="flex-1">跟随系统</span>
        {theme === 'system' && <span className="text-muted-foreground">✓</span>}
      </button>
    </div>
  );
}