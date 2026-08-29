import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnswerValue, QuestionDraft } from "@/lib/dately/types";

export function QuestionAnswer({
  question,
  value,
  onChange,
}: {
  question: QuestionDraft;
  value: AnswerValue | undefined;
  onChange: (next: AnswerValue) => void;
}) {
  const config = question.config;
  const options = config.options?.filter(Boolean) ?? [];

  if (question.type === "long_text") {
    return (
      <Textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.placeholder || "Write a little…"}
        maxLength={config.maxLength ?? 600}
      />
    );
  }

  if (question.type === "slider" || question.type === "scale") {
    const min = config.min ?? 1;
    const max = config.max ?? 10;
    const step = config.step ?? 1;
    const current = typeof value === "number" ? value : Math.round((min + max) / 2);
    return (
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-xs text-subtle">{config.leftLabel || config.minLabel || min}</span>
          <span className="font-display text-3xl tabular-nums leading-none text-fg">{current}</span>
          <span className="text-xs text-subtle">{config.rightLabel || config.maxLabel || max}</span>
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[current]}
          onValueChange={(v) => onChange(v[0])}
        />
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["Yes", "No"].map((opt) => (
          <Choice key={opt} selected={value === opt} onClick={() => onChange(opt)} label={opt} />
        ))}
      </div>
    );
  }

  if (question.type === "multiple_choice" || question.type === "predefined") {
    return (
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <Choice key={opt} selected={value === opt} onClick={() => onChange(opt)} label={opt} />
        ))}
      </div>
    );
  }

  if (question.type === "multi_select") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <Choice
              key={opt}
              selected={on}
              onClick={() =>
                onChange(on ? selected.filter((s) => s !== opt) : [...selected, opt])
              }
              label={opt}
            />
          );
        })}
      </div>
    );
  }

  return (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder={config.placeholder || "Your answer"}
      maxLength={config.maxLength ?? 200}
    />
  );
}

function Choice({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-md border px-4 text-left text-sm transition-[background-color,border-color] duration-150",
        selected
          ? "border-rose bg-rose/15 text-fg"
          : "border-border bg-surface text-muted hover:border-border-strong",
      )}
    >
      {label}
    </button>
  );
}

export const TYPE_LABELS: Record<QuestionDraft["type"], string> = {
  text: "Short text",
  long_text: "Long text",
  slider: "Slider",
  multiple_choice: "Multiple choice",
  multi_select: "Select many",
  yes_no: "Yes / No",
  scale: "Scale",
  predefined: "My answers",
};

export function defaultConfig(type: QuestionDraft["type"]): QuestionDraft["config"] {
  switch (type) {
    case "slider":
      return { min: 0, max: 10, step: 1, leftLabel: "Not at all", rightLabel: "Completely" };
    case "scale":
      return { min: 1, max: 10, minLabel: "Low", maxLabel: "High" };
    case "multiple_choice":
      return { options: ["Yes", "Sometimes", "No"] };
    case "multi_select":
      return { options: ["Weeknights", "Weekends", "Travel"] };
    case "predefined":
      return { options: ["Dealbreaker if no", "Nice to have", "I already do this"] };
    case "long_text":
      return { placeholder: "Tell me more" };
    default:
      return { placeholder: "Your answer" };
  }
}
