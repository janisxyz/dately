import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedOut } from "@/lib/auth/gates";
import { listDiscover } from "@/lib/dately/api";
import type { DiscoverCard } from "@/lib/dately/types";
import { AuthGate } from "@/components/auth-gate";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverGrid } from "@/components/discover-grid";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { sessionUser } = useRouteContext({ from: "__root__" });
  const { user, isPending } = useCurrentUserState();
  const signedIn = isPending ? Boolean(sessionUser) : Boolean(user);
  if (isPending && signedIn) {
    return (
      <Shell>
        <p className="text-xs uppercase tracking-[0.22em] text-subtle">Tonight’s questions</p>
        <h1 className="mt-2 font-display text-4xl text-fg">Who is asking well.</h1>
        <div className="mt-8 space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </Shell>
    );
  }
  if (isPending || !user) return <Landing />;
  return (
    <AuthGate>
      <DiscoverHome />
    </AuthGate>
  );
}

function DiscoverHome() {
  const [cards, setCards] = useState<DiscoverCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDiscover()
      .then(setCards)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
  }, []);

  return (
    <Shell>
      <p className="text-xs uppercase tracking-[0.22em] text-subtle">Tonight’s questions</p>
      <h1 className="mt-2 font-display text-4xl text-fg">Who is asking well.</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Open a questionnaire, answer honestly, and let their filters decide if you are a candidate.
      </p>
      {error && <p className="mt-6 text-sm text-danger">{error}</p>}
      {cards == null ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <DiscoverGrid cards={cards} />
      )}
    </Shell>
  );
}

function Landing() {
  return (
    <main className="bg-bg text-fg">
      <section className="relative isolate min-h-[100dvh] overflow-hidden">
        <img
          src="/images/hero-date.jpg"
          alt="A candlelit table set for two"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/20" />
        <div className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-end px-6 pb-12 pt-10">
          <p className="text-[11px] uppercase tracking-[0.28em] text-fg/80">Dately</p>
          <h1 className="mt-3 font-display text-5xl italic leading-[0.95] text-fg sm:text-6xl">
            Ask better questions.
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-muted">
            Write the questionnaire you wish a first date started with. People apply. Your filters
            decide who is actually a candidate.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/login">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <a href="#how">How it works</a>
            </Button>
          </div>
          <SignedOut>
            <p className="mt-4 text-xs text-subtle">Google, X, or email — takes a minute.</p>
          </SignedOut>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-lg px-6 py-16">
        <p className="text-xs uppercase tracking-[0.22em] text-subtle">The idea</p>
        <h2 className="mt-2 font-display text-4xl">Dating, with a brief.</h2>
        <ul className="mt-8 space-y-5">
          {[
            {
              title: "You write the questions",
              body: "Text, sliders, multiple choice, yes/no, scales, or answers you define yourself.",
            },
            {
              title: "You set the filters",
              body: "Age, gender, or a required answer. Fail a hard filter and they never hit your inbox as a candidate.",
            },
            {
              title: "They apply with a profile",
              body: "Photos, a short clip, name, age, and any fields they want to add — height, job, whatever they are.",
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-rose/20 text-rose">
                <Check className="size-3.5" />
              </span>
              <div>
                <p className="font-medium text-fg">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto max-w-lg overflow-hidden px-6 pb-20">
        <div className="overflow-hidden rounded-xl">
          <img
            src="/images/empty-cafe.jpg"
            alt="A quiet table by a window"
            className="h-56 w-full object-cover"
          />
        </div>
        <blockquote className="mt-8 font-display text-3xl italic text-fg">
          “Send me your answers, not a pickup line.”
        </blockquote>
        <Button asChild className="mt-8" size="lg">
          <Link to="/login">Create your questionnaire</Link>
        </Button>
      </section>
    </main>
  );
}
