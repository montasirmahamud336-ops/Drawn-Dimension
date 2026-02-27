import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  containerClassName?: string;
  toggleClassName?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, containerClassName, toggleClassName, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const actionLabel = showPassword ? "Hide password" : "Show password";

    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          {...props}
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={actionLabel}
          title={actionLabel}
          className={cn(
            "absolute right-0 top-0 inline-flex h-full w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            toggleClassName,
          )}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
