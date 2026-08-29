import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getMyQuestionnaire, saveQuestionnaire } from "@/lib/dately/api";
import { defaultConfig, TYPE_LABELS } from "@/components/question-fields";
import type { FilterDraft, QuestionDraft, QuestionType, Questionnaire } from "@/lib/dately/types";
import { QUESTION_TYPES } from "@/lib/dately/types";
import { AuthGate } from "@/components/auth-gate";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/me/questionnaire")({
  component: () => (
    <AuthGate>
      <Builder />
    </AuthGate>
  ),
});

function nid() {
  return crypto.randomUUID();
}

function Builder() {
  const [pack, setPack] = useState<Questionnaire | null>(null);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<string | null>(null);

  useEffect(() => {
    getMyQuestionnaire()
      .then(setPack)
      .catch(() => toast.error("Could not load questionnaire"));
  }, []);

  if (!pack) {
    return (
      <Shell>
        <Skeleton className="h-12 w-48" />
        <Skeleton className="mt-6 h-80 w-full rounded-xl" />
      </Shell>
    );
  }

  function addQuestion(type: QuestionType) {
    const q: QuestionDraft = {
      clientId: nid(),
      type,
      prompt: "",
      required: true,
      config: defaultConfig(type),
    };
    setPack((p) => (p ? { ...p, questions: [...p.questions, { ...q, id: 0 }] } : p));
  }

  function patchQuestion(clientId: string, patch: Partial<QuestionDraft>) {
    setPack((p) =>
      p
        ? {
            ...p,
            questions: p.questions.map((q) => (q.clientId === clientId ? { ...q, ...patch } : q)),
          }
        : p,
    );
  }

  function move(i: number, dir: -1 | 1) {
    setPack((p) => {
      if (!p) return p;
      const next = [...p.questions];
      const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, questions: next };
    });
  }

  async function onSave() {
    if (!pack) return;
    setBusy(true);
    try {
      const saved = await saveQuestionnaire({
        data: {
          title: pack.title,
          intro: pack.intro,
          isPublished: pack.isPublished,
          questions: pack.questions.map((q) => ({
            clientId: q.clientId,
            type: q.type,
            prompt: q.prompt,
            required: q.required,
            config: q.config,
          })),
          filters: pack.filters,
        },
      });
      setPack(saved);
      const url = `${window.location.origin}/q/${saved.slug}`;
      setShare(url);
      toast.success(saved.isPublished ? "Live" : "Saved as draft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="text-xs uppercase tracking-[0.22em] text-subtle">Your brief</p>
      <h1 className="mt-1 font-display text-4xl">Questionnaire</h1>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={pack.title} onChange={(e) => setPack({ ...pack, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Intro</Label>
          <Textarea
            value={pack.intro}
            onChange={(e) => setPack({ ...pack, intro: e.target.value })}
            placeholder="A sentence about what you are hoping to find."
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium">Publish</p>
            <p className="text-xs text-subtle">Appear in Discover and accept applicants.</p>
          </div>
          <Switch
            checked={pack.isPublished}
            onCheckedChange={(v) => setPack({ ...pack, isPublished: v })}
          />
        </div>
      </div>

      <h2 className="mt-10 font-display text-2xl">Questions</h2>
      <div className="mt-4 space-y-4">
        {pack.questions.map((q, i) => (
          <article key={q.clientId} className="rounded-xl border border-border bg-bg-elevated p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge tone="muted">{TYPE_LABELS[q.type]}</Badge>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} aria-label="Move up">
                  <ChevronUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} aria-label="Move down">
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setPack({ ...pack, questions: pack.questions.filter((x) => x.clientId !== q.clientId) })
                  }
                  aria-label="Remove question"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <Input
              className="mt-3"
              value={q.prompt}
              placeholder="The question"
              onChange={(e) => patchQuestion(q.clientId, { prompt: e.target.value })}
            />
            {(q.type === "multiple_choice" || q.type === "multi_select" || q.type === "predefined") && (
              <Textarea
                className="mt-2 min-h-24"
                value={(q.config.options ?? []).join("\n")}
                placeholder="One option per line"
                onChange={(e) =>
                  patchQuestion(q.clientId, {
                    config: { ...q.config, options: e.target.value.split("\n") },
                  })
                }
              />
            )}
            {(q.type === "slider" || q.type === "scale") && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Left label"
                  value={q.config.leftLabel ?? q.config.minLabel ?? ""}
                  onChange={(e) =>
                    patchQuestion(q.clientId, { config: { ...q.config, leftLabel: e.target.value, minLabel: e.target.value } })
                  }
                />
                <Input
                  placeholder="Right label"
                  value={q.config.rightLabel ?? q.config.maxLabel ?? ""}
                  onChange={(e) =>
                    patchQuestion(q.clientId, { config: { ...q.config, rightLabel: e.target.value, maxLabel: e.target.value } })
                  }
                />
              </div>
            )}
            <label className="mt-3 flex items-center justify-between text-sm text-muted">
              Required
              <Switch
                checked={q.required}
                onCheckedChange={(v) => patchQuestion(q.clientId, { required: v })}
              />
            </label>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUESTION_TYPES.map((type) => (
          <Button key={type} type="button" variant="secondary" size="sm" onClick={() => addQuestion(type)}>
            <Plus className="size-3.5" /> {TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Filters</h2>
      <p className="mt-1 text-sm text-muted">
        Hard filters auto-mark someone as a candidate or reject them. Soft ones are notes for you.
      </p>
      <div className="mt-4 space-y-3">
        {pack.filters.map((f) => (
          <FilterRow
            key={f.clientId}
            filter={f}
            questions={pack.questions}
            onChange={(next) =>
              setPack({
                ...pack,
                filters: pack.filters.map((x) => (x.clientId === f.clientId ? next : x)),
              })
            }
            onRemove={() => setPack({ ...pack, filters: pack.filters.filter((x) => x.clientId !== f.clientId) })}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setPack({
              ...pack,
              filters: [
                ...pack.filters,
                {
                  clientId: nid(),
                  kind: "profile",
                  field: "age",
                  operator: "between",
                  value: [25, 40],
                  hard: true,
                },
              ],
            })
          }
        >
          Age range
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setPack({
              ...pack,
              filters: [
                ...pack.filters,
                { clientId: nid(), kind: "profile", field: "gender", operator: "eq", value: "", hard: true },
              ],
            })
          }
        >
          Gender
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setPack({
              ...pack,
              filters: [
                ...pack.filters,
                {
                  clientId: nid(),
                  kind: "question",
                  questionClientId: pack.questions[0]?.clientId,
                  operator: "eq",
                  value: "",
                  hard: true,
                },
              ],
            })
          }
        >
          Required answer
        </Button>
      </div>

      {share && (
        <button
          type="button"
          className="mt-6 w-full truncate rounded-md border border-border bg-surface px-3 py-2 text-left text-xs text-muted"
          onClick={() => {
            void navigator.clipboard.writeText(share);
            toast.success("Link copied");
          }}
        >
          {share}
        </button>
      )}

      <Button className="mt-6 w-full" size="lg" disabled={busy} onClick={() => void onSave()}>
        {busy ? "Saving…" : "Save questionnaire"}
      </Button>
    </Shell>
  );
}

function FilterRow({
  filter,
  questions,
  onChange,
  onRemove,
}: {
  filter: FilterDraft;
  questions: QuestionDraft[];
  onChange: (next: FilterDraft) => void;
  onRemove: () => void;
}) {
  const valueText = Array.isArray(filter.value)
    ? filter.value.join(",")
    : filter.value == null
      ? ""
      : String(filter.value);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-subtle">
          {filter.kind === "profile" ? filter.field : "Answer"}
        </p>
        <button type="button" onClick={onRemove} className="text-subtle" aria-label="Remove filter">
          <Trash2 className="size-4" />
        </button>
      </div>
      {filter.kind === "question" && (
        <select
          className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
          value={filter.questionClientId ?? ""}
          onChange={(e) => onChange({ ...filter, questionClientId: e.target.value })}
        >
          <option value="">Choose a question</option>
          {questions.map((q) => (
            <option key={q.clientId} value={q.clientId}>
              {q.prompt || TYPE_LABELS[q.type]}
            </option>
          ))}
        </select>
      )}
      {filter.field === "age" || filter.operator === "between" || filter.operator === "gte" || filter.operator === "lte" ? (
        <Input
          value={valueText}
          placeholder={filter.operator === "between" ? "min,max" : "number"}
          onChange={(e) => {
            const raw = e.target.value;
            if (filter.operator === "between") {
              const parts = raw.split(",").map((s) => Number(s.trim()));
              onChange({ ...filter, value: parts });
            } else if (filter.operator === "gte" || filter.operator === "lte") {
              onChange({ ...filter, value: Number(raw) });
            } else {
              onChange({ ...filter, value: raw });
            }
          }}
        />
      ) : (
        <Input
          value={valueText}
          placeholder="Expected answer"
          onChange={(e) => onChange({ ...filter, value: e.target.value })}
        />
      )}
      <label className="flex items-center justify-between text-sm text-muted">
        Hard filter
        <Switch checked={filter.hard} onCheckedChange={(v) => onChange({ ...filter, hard: v })} />
      </label>
    </div>
  );
}
