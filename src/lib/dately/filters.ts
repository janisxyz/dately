import type { AnswerValue, FilterDraft, QuestionDraft } from "./types";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(asString).join(", ");
  return String(value);
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (value == null || value === "") return [];
  return [String(value)];
}

export function evaluateFilters(input: {
  filters: FilterDraft[];
  profile: { age: number | null; gender: string; lookingFor: string };
  answers: Record<string, AnswerValue>;
  questions: QuestionDraft[];
}): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const hard = input.filters.filter((f) => f.hard);

  for (const filter of hard) {
    if (filter.kind === "profile") {
      if (filter.field === "age") {
        const age = input.profile.age;
        if (filter.operator === "gte" && !(age != null && age >= Number(filter.value))) {
          reasons.push(`Age must be at least ${String(filter.value)}`);
        } else if (filter.operator === "lte" && !(age != null && age <= Number(filter.value))) {
          reasons.push(`Age must be at most ${String(filter.value)}`);
        } else if (filter.operator === "between") {
          const range = Array.isArray(filter.value) ? filter.value : [18, 99];
          const min = Number(range[0]);
          const max = Number(range[1]);
          if (!(age != null && age >= min && age <= max)) {
            reasons.push(`Age must be between ${min} and ${max}`);
          }
        }
      } else if (filter.field === "gender") {
        const want = asList(filter.value).map((s) => s.toLowerCase());
        if (want.length && !want.includes(input.profile.gender.toLowerCase())) {
          reasons.push("Gender does not match");
        }
      } else if (filter.field === "looking_for") {
        const want = asString(filter.value).toLowerCase();
        if (want && !input.profile.lookingFor.toLowerCase().includes(want)) {
          reasons.push("Looking-for does not match");
        }
      }
      continue;
    }

    const question = input.questions.find((q) => q.clientId === filter.questionClientId);
    if (!question) continue;
    const answer = input.answers[question.clientId] ?? input.answers[String(question.id ?? "")];
    const label = question.prompt.slice(0, 48) || "A question";

    if (filter.operator === "eq") {
      if (asString(answer).toLowerCase() !== asString(filter.value).toLowerCase()) {
        reasons.push(`“${label}” must be ${asString(filter.value)}`);
      }
    } else if (filter.operator === "neq") {
      if (asString(answer).toLowerCase() === asString(filter.value).toLowerCase()) {
        reasons.push(`“${label}” must not be ${asString(filter.value)}`);
      }
    } else if (filter.operator === "gte") {
      const n = asNumber(answer);
      if (!(n != null && n >= Number(filter.value))) {
        reasons.push(`“${label}” must be ≥ ${String(filter.value)}`);
      }
    } else if (filter.operator === "lte") {
      const n = asNumber(answer);
      if (!(n != null && n <= Number(filter.value))) {
        reasons.push(`“${label}” must be ≤ ${String(filter.value)}`);
      }
    } else if (filter.operator === "between") {
      const range = Array.isArray(filter.value) ? filter.value : [0, 100];
      const n = asNumber(answer);
      if (!(n != null && n >= Number(range[0]) && n <= Number(range[1]))) {
        reasons.push(`“${label}” must be between ${String(range[0])} and ${String(range[1])}`);
      }
    } else if (filter.operator === "in") {
      const allowed = asList(filter.value).map((s) => s.toLowerCase());
      const given = asList(answer).map((s) => s.toLowerCase());
      if (!given.some((g) => allowed.includes(g))) {
        reasons.push(`“${label}” must include an accepted answer`);
      }
    } else if (filter.operator === "contains") {
      if (!asString(answer).toLowerCase().includes(asString(filter.value).toLowerCase())) {
        reasons.push(`“${label}” must mention ${asString(filter.value)}`);
      }
    }
  }

  return { passed: reasons.length === 0, reasons };
}
