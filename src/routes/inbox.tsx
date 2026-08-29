import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listInbox, listMyApplications } from "@/lib/dately/api";
import type { ApplicationListItem, ApplicationStatus } from "@/lib/dately/types";
import { AuthGate } from "@/components/auth-gate";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  component: () => (
    <AuthGate>
      <Inbox />
    </AuthGate>
  ),
});

const TABS: { id: "incoming" | "sent"; label: string }[] = [
  { id: "incoming", label: "Applicants" },
  { id: "sent", label: "Sent" },
];

const FILTERS: { id: "all" | ApplicationStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "candidate", label: "Candidates" },
  { id: "pending", label: "Pending" },
  { id: "maybe", label: "Maybe" },
  { id: "rejected", label: "Rejected" },
];

function statusTone(status: ApplicationStatus) {
  if (status === "candidate") return "ok" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "maybe") return "warn" as const;
  return "muted" as const;
}

function Inbox() {
  const [tab, setTab] = useState<"incoming" | "sent">("incoming");
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [incoming, setIncoming] = useState<ApplicationListItem[] | null>(null);
  const [sent, setSent] = useState<Awaited<ReturnType<typeof listMyApplications>> | null>(null);

  useEffect(() => {
    listInbox().then(setIncoming).catch(() => setIncoming([]));
    listMyApplications().then(setSent).catch(() => setSent([]));
  }, []);

  const shown = useMemo(() => {
    const rows = incoming ?? [];
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [incoming, filter]);

  return (
    <Shell>
      <p className="text-xs uppercase tracking-[0.22em] text-subtle">Inbox</p>
      <h1 className="mt-1 font-display text-4xl">Who answered.</h1>

      <div className="mt-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 rounded-full px-4 text-sm",
              tab === t.id ? "bg-accent text-accent-fg" : "bg-surface text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "incoming" && (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3 text-xs",
                  filter === f.id ? "bg-fg/12 text-fg" : "text-subtle",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {incoming == null ? (
            <Skeleton className="mt-6 h-40 w-full rounded-xl" />
          ) : shown.length === 0 ? (
            <Empty copy="No applicants yet. Publish your questionnaire and share the link." />
          ) : (
            <ul className="mt-6 space-y-3">
              {shown.map((row) => (
                <li key={row.id}>
                  <Link
                    to="/inbox/$id"
                    params={{ id: String(row.id) }}
                    className="flex gap-3 rounded-xl border border-border bg-bg-elevated p-3"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-md bg-surface">
                      {row.applicant.cover ? (
                        <img src={row.applicant.cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <img src="/images/glow.jpg" alt="" className="h-full w-full object-cover opacity-70" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">
                          {row.applicant.displayName}
                          {row.applicant.age ? (
                            <span className="ml-1 text-muted">{row.applicant.age}</span>
                          ) : null}
                        </p>
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted">{row.applicant.location || "No location"}</p>
                      {row.failReasons[0] && (
                        <p className="mt-1 truncate text-xs text-subtle">{row.failReasons[0]}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "sent" &&
        (sent == null ? (
          <Skeleton className="mt-6 h-40 w-full rounded-xl" />
        ) : sent.length === 0 ? (
          <Empty copy="You have not applied to anyone yet." />
        ) : (
          <ul className="mt-6 space-y-3">
            {sent.map((row) => (
              <li key={row.id}>
                <Link
                  to="/inbox/$id"
                  params={{ id: String(row.id) }}
                  className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated p-4"
                >
                  <div>
                    <p className="font-medium">{row.title}</p>
                    <p className="text-sm text-muted">{row.owner_name}</p>
                  </div>
                  <Badge tone={statusTone(row.status as ApplicationStatus)}>{row.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </Shell>
  );
}

function Empty({ copy }: { copy: string }) {
  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-border">
      <img src="/images/empty-cafe.jpg" alt="" className="h-40 w-full object-cover" />
      <p className="p-5 text-sm text-muted">{copy}</p>
    </div>
  );
}
