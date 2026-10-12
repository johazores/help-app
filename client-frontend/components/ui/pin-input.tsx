import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

type PinInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode" | "maxLength"
> & {
  value: string;
  onValueChange: (digits: string) => void;
  /** "current-password" to sign in, "new-password" when choosing a PIN, "one-time-code" for emailed codes. */
  autoComplete: "current-password" | "new-password" | "one-time-code";
};

/**
 * Six-digit PIN or code field. PINs are masked so they can't be read over a
 * shoulder on a shared family phone; one-time codes stay visible.
 */
export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  { value, onValueChange, autoComplete, className = "", ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      type={autoComplete === "one-time-code" ? "text" : "password"}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={`tracking-[0.5em] ${className}`}
      {...rest}
    />
  );
});
