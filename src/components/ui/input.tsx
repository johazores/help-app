import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`h-14 w-full rounded-xl border border-line bg-white px-4 text-[17px] text-ink placeholder:text-subtle/70 focus:border-ink ${className}`}
        {...rest}
      />
    );
  },
);
