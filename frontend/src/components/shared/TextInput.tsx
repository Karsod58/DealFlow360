import { InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, className = '', ...props }: TextInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-text mb-2">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`input ${error ? 'border-danger focus:ring-danger' : ''} ${className}`}
      />
      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
