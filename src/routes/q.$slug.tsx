import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getPublicQuestionnaire, submitApplication } from "@/lib/dately/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { QuestionAnswer } from "@/components/question-fields";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { AnswerValue, QuestionDraft } from "@/lib/dately/types";

export const Route = createFileRoute("/q/$slug")({ component: ApplyPage });

function ApplyPage() {
  const { slug } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [pack, setPack] = useState<Awaited<ReturnType<typeof getPublicQuestionnaire>> | undefined>(
    undefined,
  );
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ status: string; reasons: string[] } | null>(null);

  useEffect(() => {
    getPublicQuestionnaire({ data: { slug } })
      .then(setPack)
      .catch(() => setPack(null));
  }, [slug]);

  const defaults = useMemo(() => {
    const next: Record<string, AnswerValue> = {};
    for (const q of pack?.questions ?? []) {
      if (q.type === "slider" || q.type === "scale") {
        const min = q.config.min ?? 1;
        const max = q.config.max ?? 10;
        next[q.clientId] = Math.round((min + max) / 2);
      }
    }
    return next;
  }, [pack]);

  useEffect(() => {
    setAnswers((prev) => ({ ...defaults, ...prev }));
  }, [defaults]);

  if (pack === undefined || isPending) {
    return (
      <div className="mx-auto max-w-lg px-5 py-8">
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display text-3xl">This questionnaire is closed.</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-rose">
          Back to Dately
        </Link>
      </div>
    );
  }

  const owner = pack.owner;
  const cover = owner.cover ?? "/images/glow.jpg";

  async function onSubmit() {
    if (!user) {
      window.location.href = `/login`;
      return;
    }
    setBusy(true);
    try {
      const result = await submitApplication({ data: { slug, answers } });
      setDone({ status: result.autoStatus, reasons: result.reasons });
      toast.success("Sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mx-auto min-h-dvh max-w-lg bg-bg pb-16">
      <div className="relative h-[420px]">
        <img src={cover} alt="" className="h-full w-full object-cover" />
        <Link
          to="/"
          className="absolute left-4 top-4 rounded-full bg-bg/70 px-3 py-1.5 text-xs text-fg backdrop-blur"
        >
          Back
        </Link>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent p-5 pt-24">
          <p className="font-display text-4xl text-fg">
            {owner.displayName}
            {owner.age ? <span className="ml-2 font-sans text-xl text-muted">{owner.age}</span> : null}
          </p>
          <p className="mt-1 text-sm text-muted">
            {[owner.location, owner.gender, owner.lookingFor && `looking for ${owner.lookingFor}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="space-y-6 px-5 pt-6">
        {owner.photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {owner.photos.map((p) => (
              <img key={p.id} src={p.data} alt="" className="h-28 w-24 shrink-0 rounded-md object-cover" />
            ))}
          </div>
        )}

        {owner.bio && <p className="text-pretty text-muted">{owner.bio}</p>}

        {owner.fields.length > 0 && (
          <dl className="grid grid-cols-2 gap-3">
            {owner.fields.map((f) => (
              <div key={f.label} className="rounded-md bg-surface px-3 py-2">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-subtle">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-fg">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {owner.videos.map((v) => (
          <video key={v.id} src={v.data} controls className="w-full rounded-lg bg-black" />
        ))}

        <div>
          <h2 className="font-display text-3xl">{pack.title}</h2>
          {pack.intro && <p className="mt-2 text-sm text-muted">{pack.intro}</p>}
        </div>

        {done ? (
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <Badge tone={done.status === "candidate" ? "ok" : done.status === "rejected" ? "danger" : "muted"}>
              {done.status}
            </Badge>
            <p className="mt-3 text-sm text-muted">
              {done.status === "candidate"
                ? "You passed their automatic filters. They can read your answers now."
                : done.status === "rejected"
                  ? "Their filters did not pass this time. You can still message if they open the thread."
                  : "Sent. They will review you by hand."}
            </p>
            {done.reasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
                {done.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <Button asChild variant="secondary" className="mt-4">
              <Link to="/">Keep browsing</Link>
            </Button>
          </div>
        ) : (
          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            {pack.questions.map((question: QuestionDraft, i) => (
              <section key={question.clientId} className="space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-subtle">
                  {String(i + 1).padStart(2, "0")}
                  {question.required ? " · required" : ""}
                </p>
                <h3 className="text-lg font-medium leading-snug">{question.prompt}</h3>
                <QuestionAnswer
                  question={question}
                  value={answers[question.clientId]}
                  onChange={(next) => setAnswers((prev) => ({ ...prev, [question.clientId]: next }))}
                />
              </section>
            ))}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {user ? (busy ? "Sending…" : "Send answers") : "Sign in to apply"}
            </Button>
          </form>
        )}
      </div>
    </article>
  );
}
