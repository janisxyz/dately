import { Link } from "@tanstack/react-router";
import type { DiscoverCard } from "@/lib/dately/types";

export function DiscoverGrid({ cards }: { cards: DiscoverCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="mt-10 overflow-hidden rounded-xl border border-border">
        <img src="/images/empty-cafe.jpg" alt="" className="h-48 w-full object-cover" />
        <div className="space-y-2 p-5">
          <h2 className="font-display text-2xl">The room is still empty.</h2>
          <p className="text-sm text-muted">
            Publish your questionnaire and share the link. The first people who apply will land here
            for everyone else.
          </p>
          <Link to="/me/questionnaire" className="inline-block pt-2 text-sm text-rose">
            Write yours →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-8 space-y-5">
      {cards.map((card) => (
        <li key={card.slug}>
          <Link
            to="/q/$slug"
            params={{ slug: card.slug }}
            className="block overflow-hidden rounded-xl border border-border bg-bg-elevated transition-[border-color] duration-150 hover:border-border-strong"
          >
            <div className="relative h-64 bg-surface">
              {card.owner.cover ? (
                <img
                  src={card.owner.cover}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src="/images/glow.jpg" alt="" className="h-full w-full object-cover opacity-70" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/50 to-transparent p-4 pt-16">
                <p className="font-display text-3xl leading-none text-fg">
                  {card.owner.displayName}
                  {card.owner.age ? (
                    <span className="ml-2 font-sans text-lg text-muted">{card.owner.age}</span>
                  ) : null}
                </p>
                {card.owner.location && (
                  <p className="mt-1 text-sm text-muted">{card.owner.location}</p>
                )}
              </div>
            </div>
            <div className="space-y-1 p-4">
              <p className="text-sm font-medium text-fg">{card.title}</p>
              <p className="line-clamp-2 text-sm text-muted">{card.intro || "No intro — just the questions."}</p>
              <p className="pt-1 text-xs uppercase tracking-[0.16em] text-subtle">
                {card.questionCount} {card.questionCount === 1 ? "question" : "questions"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
