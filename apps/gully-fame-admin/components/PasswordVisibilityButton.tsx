'use client';

import { Eye, EyeOff } from 'lucide-react';

interface PasswordVisibilityButtonProps {
  /** True while the password is shown as plain text. */
  visible: boolean;
  onToggle: () => void;
}

/**
 * Eye button placed inside a password field (its wrapper must be `relative`;
 * give the input `pr-10` so text doesn't run under the icon).
 */
export default function PasswordVisibilityButton({ visible, onToggle }: PasswordVisibilityButtonProps) {
  const label = visible ? 'Hide password' : 'Show password';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={visible}
      title={label}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}
