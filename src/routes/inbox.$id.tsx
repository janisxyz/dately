import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getApplication, sendMessage, setApplicationStatus } from "@/lib/dately/api";
import type { ApplicationDetail, ApplicationStatus } from "@/lib/dately/types";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox/$id")({
  component: () => (
    <AuthGate>
      <Detail />
    </AuthGate>
  ),
});

function tone(status: ApplicationStatus) {
  if (status === "candidate") return "ok" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "maybe") return "warn" as const;
  return "muted" as const;
}

function Detail() {
  const { id } = Route.useParams();
  const numericId = Number(id);
  const [pack, setPack] = useState<ApplicationDetail | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getApplication({ data: { id: numericId } })
      .then(setPack)
      .catch(() => setPack(null));
  }, [numericId]);

  if (pack === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 py-8">
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }
  if (!pack) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-muted">This application is gone.</p>
        <Link to="/inbox" className="mt-3 inline-block text-sm text-rose">
          Back
        </Link>
      </div>
    );
  }

  async function setStatus(status: ApplicationStatus) {
    if (!pack) return;
    try {
      await setApplicationStatus({ data: { id: pack.id, status } });
      setPack({ ...pack, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!pack || !draft.trim()) return;
    setBusy(true);
    try {
      const msg = await sendMessage({ data: { applicationId: pack.id, body: draft.trim() } });
      setPack({ ...pack, messages: [...pack.messages, msg] });
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  const person = pack.applicant;
  const cover = person.cover ?? "/images/glow.jpg";

  return (
    <article className="mx-auto min-h-dvh max-w-lg bg-bg pb-24">
      <div className="relative h-80">
        <img src={cover} alt="" className="h-full w-full object-cover" />
        <Link
          to="/inbox"
          className="absolute left-4 top-4 rounded-full bg-bg/70 px-3 py-1.5 text-xs backdrop-blur"
        >
          Back
        </Link>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/65 to-transparent p-5 pt-20">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl">
                {person.displayName}
                {person.age ? <span className="ml-2 font-sans text-xl text-muted">{person.age}</span> : null}
              </p>
              <p className="text-sm text-muted">{person.location}</p>
            </div>
            <Badge tone={tone(pack.status)}>{pack.status}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 pt-5">
        {person.photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {person.photos.map((p) => (
              <img key={p.id} src={p.data} alt="" className="h-32 w-24 shrink-0 rounded-md object-cover" />
            ))}
          </div>
        )}
        {person.bio && <p className="text-pretty text-muted">{person.bio}</p>}
        {person.fields.length > 0 && (
          <dl className="grid grid-cols-2 gap-2">
            {person.fields.map((f) => (
              <div key={f.label} className="rounded-md bg-surface px-3 py-2">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-subtle">{f.label}</dt>
                <dd className="text-sm">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {person.videos.map((v) => (
          <video key={v.id} src={v.data} controls className="w-full rounded-lg bg-black" />
        ))}

        {pack.failReasons.length > 0 && (
          <div className="rounded-lg border border-danger/30 bg-danger/8 p-3 text-sm text-danger">
            {pack.failReasons.map((r) => (
              <p key={r}>{r}</p>
            ))}
          </div>
        )}

        {pack.isOwner && (
          <div className="grid grid-cols-3 gap-2">
            {(["candidate", "maybe", "rejected"] as const).map((s) => (
              <Button
                key={s}
                type="button"
                variant={pack.status === s ? "primary" : "secondary"}
                size="sm"
                onClick={() => void setStatus(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        <section>
          <h2 className="font-display text-2xl">Answers</h2>
          <ol className="mt-4 space-y-5">
            {pack.questions.map((q, i) => {
              const raw = pack.answers[String(q.id)] ?? pack.answers[q.clientId];
              const display = Array.isArray(raw) ? raw.join(", ") : raw == null ? "—" : String(raw);
              return (
                <li key={q.clientId}>
                  <p className="text-xs uppercase tracking-[0.16em] text-subtle">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-1 font-medium">{q.prompt}</p>
                  <p className="mt-1 text-muted">{display}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl">Messages</h2>
          <ul className="mt-4 space-y-2">
            {pack.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.mine ? "ml-auto bg-rose/20 text-fg" : "bg-surface text-muted",
                )}
              >
                {m.body}
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => void onSend(e)}>
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write back" />
            <Button type="submit" disabled={busy}>
              Send
            </Button>
          </form>
        </section>
      </div>
    </article>
  );
}
