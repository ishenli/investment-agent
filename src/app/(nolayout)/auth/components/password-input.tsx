'use client';

import * as React from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { cn } from '@renderer/lib/utils';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';

export interface PasswordInputProps extends React.ComponentProps<'input'> { }

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const togglePassword = () => {
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
          onClick={togglePassword}
          tabIndex={-1}
        >
          {showPassword ? (
            <IconEyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <IconEye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };