import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      toastOptions={{
        classNames: {
          toast: "bg-bg-elevated text-fg border border-border shadow-soft",
        },
      }}
    />
  );
}
