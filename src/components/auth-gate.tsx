import type { ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "@/components/shell";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
