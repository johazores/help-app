"use client";

import { useId } from "react";

/** Props a field's control needs so assistive tech reads its hint and error. */
export interface FieldControlProps {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: (id: string, control: FieldControlProps) => React.ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const showHint = Boolean(hint) && !error;
  const control: FieldControlProps = {
    "aria-describedby": error ? errorId : showHint ? hintId : undefined,
    "aria-invalid": error ? true : undefined,
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children(id, control)}
      {showHint ? (
        <p id={hintId} className="mt-2 hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-[15px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
