"use client";

import { useId } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => React.ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children(id)}
      {hint && !error ? <p className="mt-2 hint">{hint}</p> : null}
      {error ? (
        <p className="mt-2 text-[15px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
