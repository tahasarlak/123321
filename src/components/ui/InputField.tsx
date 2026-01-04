// src/components/common/InputField.tsx  (یا هر مسیری که داشتی)

"use client";

import { memo, forwardRef, useState, ForwardedRef } from "react";
import { Controller, Control } from "react-hook-form";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
}

interface InputFieldProps {
  id: string;
  label: string;
  iconLeft?: React.ComponentType<{ className?: string }>;
  iconRight?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "password" | "email" | "number" | "checkbox" | "select" | "textarea";
  options?: SelectOption[];
  rows?: number;
  extraInfo?: string;
  showPasswordToggle?: boolean;
  control: Control<any>;
  error?: any;
  disabled?: boolean;
  className?: string;
  min?: string | number;
  max?: string | number;
}

export const InputField = memo(
  forwardRef<HTMLTextAreaElement | HTMLInputElement, InputFieldProps>(function InputField(
    {
      id,
      label,
      iconLeft: IconLeft,
      iconRight: IconRight,
      required = false,
      placeholder,
      type = "text",
      options = [],
      rows = 4,
      extraInfo,
      showPasswordToggle = false,
      control,
      error,
      disabled = false,
      className,
      min,
      max,
    },
    ref
  ) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const togglePasswordVisibility = () => setIsPasswordVisible((prev) => !prev);

    const hasError = !!error?.message;
    const hasLeftIcon = !!IconLeft;
    const hasRightIconOrToggle = !!IconRight || (showPasswordToggle && type === "password");

    const describedBy = [
      hasError ? `${id}-error` : undefined,
      extraInfo ? `${id}-info` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className={cn("space-y-2", className)}>
        <label htmlFor={id} className="text-sm font-medium flex items-center gap-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        <div className={type === "checkbox" ? "flex items-center gap-3" : "relative"}>
          <Controller
            name={id}
            control={control}
            render={({ field }) => {
              const commonAriaProps = {
                "aria-invalid": hasError,
                "aria-describedby": describedBy,
              };

              // Checkbox
              if (type === "checkbox") {
                return (
                  <input
                    {...field}
                    id={id}
                    type="checkbox"
                    checked={!!field.value}
                    disabled={disabled}
                    className="w-5 h-5 rounded accent-primary focus:ring-primary"
                    {...commonAriaProps}
                  />
                );
              }

              // Select
              if (type === "select") {
                return (
                  <div className="relative">
                    <select
                      {...field}
                      id={id}
                      disabled={disabled}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className={cn(
                        "flex h-12 w-full rounded-xl border border-border bg-background px-5 py-3 pr-10 text-base appearance-none focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                        hasError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                      )}
                      {...commonAriaProps}
                    >
                      {options.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={option.disabled ?? option.value === ""}
                          hidden={option.hidden ?? option.value === ""}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 end-3 flex items-center">
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                );
              }

              // Textarea
              if (type === "textarea") {
                return (
                  <>
                    <textarea
                      {...field}
                      id={id}
                      disabled={disabled}
                      ref={ref as ForwardedRef<HTMLTextAreaElement>}
                      rows={rows}
                      placeholder={placeholder}
                      value={field.value ?? ""}
                      className={cn(
                        "flex w-full rounded-xl border border-border bg-background px-5 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none",
                        hasLeftIcon && "ps-12",
                        hasRightIconOrToggle && "pe-12",
                        hasError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                      )}
                      {...commonAriaProps}
                    />
                    {IconLeft && (
                      <IconLeft className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-muted-foreground" />
                    )}
                    {IconRight && (
                      <div className="pointer-events-none absolute inset-y-0 end-3 my-auto">
                        <IconRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </>
                );
              }

              // Input types (text, password, email, number, etc.)
              const inputType =
                type === "password" && showPasswordToggle
                  ? isPasswordVisible
                    ? "text"
                    : "password"
                  : type;

              return (
                <>
                  <Input
                    {...field}
                    id={id}
                    type={inputType}
                    placeholder={placeholder}
                    disabled={disabled}
                    ref={ref as ForwardedRef<HTMLInputElement>}
                    min={type === "number" ? min : undefined}
                    max={type === "number" ? max : undefined}
                    className={cn(
                      hasLeftIcon && "ps-12",
                      hasRightIconOrToggle && "pe-12",
                      hasError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                    )}
                    {...commonAriaProps}
                  />

                  {/* Left Icon */}
                  {IconLeft && (
                    <IconLeft className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-muted-foreground" />
                  )}

                  {/* Password Toggle */}
                  {showPasswordToggle && type === "password" && !disabled && (
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={isPasswordVisible ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                      aria-controls={id}
                    >
                      {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  )}

                  {/* Right Icon (if toggle not active) */}
                  {IconRight && (!showPasswordToggle || type !== "password") && (
                    <div className="pointer-events-none absolute inset-y-0 end-3 my-auto">
                      <IconRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </>
              );
            }}
          />
        </div>

        {/* Error Message */}
        {hasError && (
          <p id={`${id}-error`} className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error.message}
          </p>
        )}

        {/* Extra Info */}
        {extraInfo && (
          <p id={`${id}-info`} className="text-xs text-muted-foreground">
            {extraInfo}
          </p>
        )}
      </div>
    );
  })
);

InputField.displayName = "InputField";