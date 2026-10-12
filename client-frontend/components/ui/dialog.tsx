"use client";

import { useEffect, useId, useRef } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Modal built on the native <dialog> element: the browser handles the focus
 * trap, Escape to close, inert background, and returning focus afterwards.
 */
export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="w-[calc(100%-2.5rem)] max-w-md rounded-2xl bg-card p-0 text-body shadow-lift backdrop:bg-ink/50"
    >
      {open ? (
        <div className="p-6">
          <h2 id={titleId} className="text-[22px] font-bold">
            {title}
          </h2>
          {description ? <div className="mt-2 text-[16px] text-body">{description}</div> : null}
          <div className="mt-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
