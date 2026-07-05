// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillAddDialog } from '../SkillAddDialog';

const refreshSkills = vi.fn();
const createCustomSkill = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/app/store/skills/store', () => ({
  useSkillsStore: () => ({
    saving: false,
    createCustomSkill,
    refreshSkills,
  }),
}));

vi.mock('@renderer/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@renderer/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-testid={`tab-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@renderer/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@renderer/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@renderer/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

describe('SkillAddDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          success: true,
          installedSlugs: ['stock-eval'],
        },
      }),
    }) as unknown as typeof fetch;
  });

  it('refreshes the skills list after a successful zip install', async () => {
    const onOpenChange = vi.fn();
    render(<SkillAddDialog open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('skills.addDialog.fields.name'), {
      target: { value: 'Stock Eval' },
    });
    fireEvent.change(screen.getByLabelText('skills.addDialog.fields.description'), {
      target: { value: 'Evaluate stocks' },
    });
    fireEvent.change(document.querySelector('#zip-upload') as HTMLInputElement, {
      target: {
        files: [new File(['zip-bytes'], 'stock-eval.zip', { type: 'application/zip' })],
      },
    });

    fireEvent.click(screen.getByText('skills.addDialog.createSkill'));

    await waitFor(() => {
      expect(refreshSkills).toHaveBeenCalledTimes(1);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
