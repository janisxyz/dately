import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { evaluateFilters } from "./filters";
import type {
  AnswerValue,
  ApplicationListItem,
  ApplicationStatus,
  DiscoverCard,
  FilterDraft,
  FilterValue,
  MediaItem,
  Profile,
  PublicProfile,
  QuestionConfig,
  QuestionDraft,
  Questionnaire,
} from "./types";
import { QUESTION_TYPES } from "./types";

function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function slug(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function parseQuestion(row: {
  id: number;
  type: string;
  prompt: string;
  required: boolean;
  config: unknown;
  sort_order: number;
}): QuestionDraft & { id: number } {
  return {
    id: Number(row.id),
    clientId: String(row.id),
    type: QUESTION_TYPES.includes(row.type as (typeof QUESTION_TYPES)[number])
      ? (row.type as QuestionDraft["type"])
      : "text",
    prompt: row.prompt,
    required: Boolean(row.required),
    config: asJson<QuestionConfig>(row.config, {}),
  };
}

function parseFilter(row: {
  id: number;
  kind: string;
  field: string | null;
  question_id: number | null;
  operator: string;
  value: unknown;
  hard: boolean;
}): FilterDraft {
  return {
    clientId: String(row.id),
    kind: row.kind === "question" ? "question" : "profile",
    field: (row.field as FilterDraft["field"]) ?? undefined,
    questionClientId: row.question_id != null ? String(row.question_id) : undefined,
    operator: (row.operator as FilterDraft["operator"]) || "eq",
    value: asJson<FilterValue>(row.value, null),
    hard: Boolean(row.hard),
  };
}

async function ensureProfile(userId: string, displayName?: string | null) {
  const sql = await getSql();
  await sql`
    insert into profiles (user_id, display_name)
    values (${userId}, ${displayName ?? ""})
    on conflict (user_id) do nothing
  `;
}

async function loadProfile(userId: string): Promise<Profile> {
  const sql = await getSql();
  await ensureProfile(userId);
  const rows = await sql<{
    user_id: string;
    display_name: string;
    age: number | null;
    bio: string;
    location: string;
    gender: string;
    looking_for: string;
  }>`select user_id, display_name, age, bio, location, gender, looking_for from profiles where user_id = ${userId}`;
  const row = rows[0];
  const fields = await sql<{ id: number; label: string; value: string }>`
    select id, label, value from profile_fields where user_id = ${userId} order by sort_order, id
  `;
  const media = await sql<{
    id: number;
    kind: string;
    mime: string;
    data: string;
    sort_order: number;
  }>`select id, kind, mime, data, sort_order from profile_media where user_id = ${userId} order by sort_order, id`;
  return {
    userId,
    displayName: row?.display_name ?? "",
    age: row?.age ?? null,
    bio: row?.bio ?? "",
    location: row?.location ?? "",
    gender: row?.gender ?? "",
    lookingFor: row?.looking_for ?? "",
    fields: fields.map((f) => ({ id: Number(f.id), label: f.label, value: f.value })),
    media: media.map((m) => ({
      id: Number(m.id),
      kind: m.kind === "video" ? "video" : "photo",
      mime: m.mime,
      data: m.data,
      sortOrder: Number(m.sort_order),
    })),
  };
}

function toPublic(profile: Profile): PublicProfile {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    age: profile.age,
    bio: profile.bio,
    location: profile.location,
    gender: profile.gender,
    lookingFor: profile.lookingFor,
    fields: profile.fields,
    photos: profile.media.filter((m) => m.kind === "photo"),
    videos: profile.media.filter((m) => m.kind === "video"),
    cover: profile.media.find((m) => m.kind === "photo")?.data ?? null,
  };
}

async function getOrCreateQuestionnaire(userId: string) {
  const sql = await getSql();
  const existing = await sql<{
    id: number;
    user_id: string;
    title: string;
    intro: string;
    is_published: boolean;
    slug: string;
  }>`select id, user_id, title, intro, is_published, slug from questionnaires where user_id = ${userId}`;
  if (existing[0]) return existing[0];
  const made = await sql<{
    id: number;
    user_id: string;
    title: string;
    intro: string;
    is_published: boolean;
    slug: string;
  }>`
    insert into questionnaires (user_id, title, slug)
    values (${userId}, ${"Dating me"}, ${slug()})
    returning id, user_id, title, intro, is_published, slug
  `;
  return made[0];
}

const questionConfigSchema = z.object({
  placeholder: z.string().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  leftLabel: z.string().optional(),
  rightLabel: z.string().optional(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number()])),
]);

const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
]);

const questionDraftSchema = z.object({
  clientId: z.string(),
  id: z.number().optional(),
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().max(400),
  required: z.boolean(),
  config: questionConfigSchema.optional(),
});

const filterDraftSchema = z.object({
  clientId: z.string(),
  kind: z.enum(["profile", "question"]),
  field: z.enum(["age", "gender", "looking_for"]).optional(),
  questionClientId: z.string().optional(),
  operator: z.enum(["eq", "neq", "gte", "lte", "between", "in", "contains"]),
  value: filterValueSchema,
  hard: z.boolean(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return loadProfile(context.userId);
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().max(80),
      age: z.number().int().min(18).max(99).nullable(),
      bio: z.string().max(800),
      location: z.string().max(80),
      gender: z.string().max(40),
      lookingFor: z.string().max(80),
      fields: z.array(z.object({ label: z.string().max(40), value: z.string().max(200) })).max(20),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name, age, bio, location, gender, looking_for, updated_at)
      values (
        ${context.userId}, ${data.displayName.trim()}, ${data.age}, ${data.bio.trim()},
        ${data.location.trim()}, ${data.gender.trim()}, ${data.lookingFor.trim()}, now()
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        age = excluded.age,
        bio = excluded.bio,
        location = excluded.location,
        gender = excluded.gender,
        looking_for = excluded.looking_for,
        updated_at = now()
    `;
    await sql`delete from profile_fields where user_id = ${context.userId}`;
    for (const [i, field] of data.fields.entries()) {
      const label = field.label.trim();
      if (!label) continue;
      await sql`
        insert into profile_fields (user_id, label, value, sort_order)
        values (${context.userId}, ${label}, ${field.value.trim()}, ${i})
      `;
    }
    return loadProfile(context.userId);
  });

export const addMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      kind: z.enum(["photo", "video"]),
      mime: z.string().max(80),
      data: z.string().max(6_500_000),
    }),
  )
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId);
    const sql = await getSql();
    const counts = await sql<{ n: number; kind: string }>`
      select kind, count(*)::int as n from profile_media where user_id = ${context.userId} group by kind
    `;
    const photos = counts.find((c) => c.kind === "photo")?.n ?? 0;
    const videos = counts.find((c) => c.kind === "video")?.n ?? 0;
    if (data.kind === "photo" && photos >= 6) throw new Error("You can add up to 6 photos.");
    if (data.kind === "video" && videos >= 2) throw new Error("You can add up to 2 videos.");
    const max = await sql<{ m: number | null }>`
      select max(sort_order) as m from profile_media where user_id = ${context.userId}
    `;
    const order = Number(max[0]?.m ?? -1) + 1;
    const inserted = await sql<{ id: number }>`
      insert into profile_media (user_id, kind, mime, data, sort_order)
      values (${context.userId}, ${data.kind}, ${data.mime}, ${data.data}, ${order})
      returning id
    `;
    return { id: Number(inserted[0].id) };
  });

export const removeMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from profile_media where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

async function loadQuestionnaire(userId: string): Promise<Questionnaire> {
  const q = await getOrCreateQuestionnaire(userId);
  const sql = await getSql();
  const questions = await sql<{
    id: number;
    type: string;
    prompt: string;
    required: boolean;
    config: unknown;
    sort_order: number;
  }>`select id, type, prompt, required, config, sort_order from questions where questionnaire_id = ${q.id} order by sort_order, id`;
  const filters = await sql<{
    id: number;
    kind: string;
    field: string | null;
    question_id: number | null;
    operator: string;
    value: unknown;
    hard: boolean;
  }>`select id, kind, field, question_id, operator, value, hard from filters where questionnaire_id = ${q.id} order by id`;
  return {
    id: Number(q.id),
    userId: q.user_id,
    title: q.title,
    intro: q.intro,
    isPublished: Boolean(q.is_published),
    slug: q.slug,
    questions: questions.map(parseQuestion),
    filters: filters.map(parseFilter),
  };
}

export const getMyQuestionnaire = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Questionnaire> => {
    return loadQuestionnaire(context.userId);
  });

export const saveQuestionnaire = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      title: z.string().max(80),
      intro: z.string().max(600),
      isPublished: z.boolean(),
      questions: z.array(questionDraftSchema).max(40),
      filters: z.array(filterDraftSchema).max(30),
    }),
  )
  .handler(async ({ context, data }): Promise<Questionnaire> => {
    const q = await getOrCreateQuestionnaire(context.userId);
    const sql = await getSql();
    await sql`
      update questionnaires
      set title = ${data.title.trim() || "Dating me"},
          intro = ${data.intro.trim()},
          is_published = ${data.isPublished},
          updated_at = now()
      where id = ${q.id} and user_id = ${context.userId}
    `;
    await sql`delete from questions where questionnaire_id = ${q.id}`;
    const idMap = new Map<string, number>();
    for (const [i, question] of data.questions.entries()) {
      const prompt = question.prompt.trim();
      if (!prompt) continue;
      const inserted = await sql.query<{ id: number }>(
        `insert into questions (questionnaire_id, type, prompt, required, config, sort_order)
         values ($1, $2, $3, $4, $5::jsonb, $6) returning id`,
        [q.id, question.type, prompt, question.required, JSON.stringify(question.config ?? {}), i],
      );
      idMap.set(question.clientId, Number(inserted[0].id));
    }
    for (const filter of data.filters) {
      const questionId =
        filter.kind === "question" && filter.questionClientId
          ? (idMap.get(filter.questionClientId) ?? null)
          : null;
      if (filter.kind === "question" && questionId == null) continue;
      await sql.query(
        `insert into filters (questionnaire_id, kind, field, question_id, operator, value, hard)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          q.id,
          filter.kind,
          filter.field ?? null,
          questionId,
          filter.operator,
          JSON.stringify(filter.value ?? null),
          filter.hard,
        ],
      );
    }
    return loadQuestionnaire(context.userId);
  });

export const listDiscover = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DiscoverCard[]> => {
    const sql = await getSql();
    const rows = await sql<{
      slug: string;
      title: string;
      intro: string;
      question_count: number;
      user_id: string;
      display_name: string;
      age: number | null;
      location: string;
      cover: string | null;
    }>`
      select
        q.slug,
        q.title,
        q.intro,
        (select count(*)::int from questions qq where qq.questionnaire_id = q.id) as question_count,
        p.user_id,
        p.display_name,
        p.age,
        p.location,
        (
          select m.data from profile_media m
          where m.user_id = q.user_id and m.kind = 'photo'
          order by m.sort_order, m.id
          limit 1
        ) as cover
      from questionnaires q
      join profiles p on p.user_id = q.user_id
      where q.is_published = true
        and q.user_id <> ${context.userId}
        and p.display_name <> ''
      order by q.updated_at desc
      limit 50
    `;
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      intro: r.intro,
      questionCount: Number(r.question_count),
      owner: {
        userId: r.user_id,
        displayName: r.display_name,
        age: r.age,
        location: r.location,
        cover: r.cover,
      },
    }));
  });

export const getPublicQuestionnaire = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().max(40) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const qrows = await sql<{
      id: number;
      user_id: string;
      title: string;
      intro: string;
      is_published: boolean;
      slug: string;
    }>`select id, user_id, title, intro, is_published, slug from questionnaires where slug = ${data.slug}`;
    const q = qrows[0];
    if (!q || !q.is_published) return null;
    const questions = await sql<{
      id: number;
      type: string;
      prompt: string;
      required: boolean;
      config: unknown;
      sort_order: number;
    }>`select id, type, prompt, required, config, sort_order from questions where questionnaire_id = ${q.id} order by sort_order, id`;
    const owner = toPublic(await loadProfile(q.user_id));
    return {
      id: Number(q.id),
      slug: q.slug,
      title: q.title,
      intro: q.intro,
      owner,
      questions: questions.map(parseQuestion),
    };
  });

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      slug: z.string().max(40),
      answers: z.record(z.string(), answerValueSchema),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const qrows = await sql<{
      id: number;
      user_id: string;
      is_published: boolean;
    }>`select id, user_id, is_published from questionnaires where slug = ${data.slug}`;
    const q = qrows[0];
    if (!q || !q.is_published) throw new Error("This questionnaire is not open.");
    if (q.user_id === context.userId) throw new Error("You cannot apply to yourself.");

    const profile = await loadProfile(context.userId);
    if (!profile.displayName.trim() || profile.age == null) {
      throw new Error("Add your name and age on your profile before applying.");
    }

    const questions = await sql<{
      id: number;
      type: string;
      prompt: string;
      required: boolean;
      config: unknown;
      sort_order: number;
    }>`select id, type, prompt, required, config, sort_order from questions where questionnaire_id = ${q.id} order by sort_order, id`;
    const parsed = questions.map(parseQuestion);
    for (const question of parsed) {
      if (!question.required) continue;
      const value = data.answers[question.clientId];
      if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
        throw new Error(`Please answer: ${question.prompt}`);
      }
    }

    const filters = await sql<{
      id: number;
      kind: string;
      field: string | null;
      question_id: number | null;
      operator: string;
      value: unknown;
      hard: boolean;
    }>`select id, kind, field, question_id, operator, value, hard from filters where questionnaire_id = ${q.id}`;
    const parsedFilters = filters.map(parseFilter);
    const result = evaluateFilters({
      filters: parsedFilters,
      profile: { age: profile.age, gender: profile.gender, lookingFor: profile.lookingFor },
      answers: data.answers,
      questions: parsed,
    });
    const autoStatus: ApplicationStatus = parsedFilters.some((f) => f.hard)
      ? result.passed
        ? "candidate"
        : "rejected"
      : "pending";

    const existing = await sql<{ id: number }>`
      select id from applications where questionnaire_id = ${q.id} and applicant_id = ${context.userId}
    `;
    let applicationId: number;
    if (existing[0]) {
      applicationId = Number(existing[0].id);
      await sql.query(
        `update applications set status = $1, auto_status = $1, fail_reasons = $2::jsonb, submitted_at = now() where id = $3`,
        [autoStatus, JSON.stringify(result.reasons), applicationId],
      );
      await sql`delete from answers where application_id = ${applicationId}`;
    } else {
      const inserted = await sql.query<{ id: number }>(
        `insert into applications (questionnaire_id, applicant_id, status, auto_status, fail_reasons)
         values ($1, $2, $3, $3, $4::jsonb) returning id`,
        [q.id, context.userId, autoStatus, JSON.stringify(result.reasons)],
      );
      applicationId = Number(inserted[0].id);
    }

    for (const question of parsed) {
      if (!(question.clientId in data.answers)) continue;
      await sql.query(
        `insert into answers (application_id, question_id, value) values ($1, $2, $3::jsonb)`,
        [applicationId, question.id, JSON.stringify(data.answers[question.clientId] ?? null)],
      );
    }

    return { applicationId, autoStatus, reasons: result.reasons };
  });

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ApplicationListItem[]> => {
    const q = await getOrCreateQuestionnaire(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      status: string;
      auto_status: string;
      fail_reasons: unknown;
      submitted_at: string;
      applicant_id: string;
      display_name: string;
      age: number | null;
      location: string;
      cover: string | null;
    }>`
      select
        a.id, a.status, a.auto_status, a.fail_reasons, a.submitted_at::text as submitted_at,
        a.applicant_id, p.display_name, p.age, p.location,
        (
          select m.data from profile_media m
          where m.user_id = a.applicant_id and m.kind = 'photo'
          order by m.sort_order, m.id limit 1
        ) as cover
      from applications a
      join profiles p on p.user_id = a.applicant_id
      where a.questionnaire_id = ${q.id}
      order by a.submitted_at desc
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      status: r.status as ApplicationStatus,
      autoStatus: r.auto_status as ApplicationStatus,
      failReasons: asJson<string[]>(r.fail_reasons, []),
      submittedAt: r.submitted_at,
      applicant: {
        userId: r.applicant_id,
        displayName: r.display_name,
        age: r.age,
        location: r.location,
        cover: r.cover,
      },
    }));
  });

export const getApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      questionnaire_id: number;
      applicant_id: string;
      status: string;
      auto_status: string;
      fail_reasons: unknown;
      submitted_at: string;
      owner_id: string;
      title: string;
    }>`
      select a.id, a.questionnaire_id, a.applicant_id, a.status, a.auto_status, a.fail_reasons,
             a.submitted_at::text as submitted_at, q.user_id as owner_id, q.title
      from applications a
      join questionnaires q on q.id = a.questionnaire_id
      where a.id = ${data.id}
    `;
    const row = rows[0];
    if (!row) return null;
    if (row.owner_id !== context.userId && row.applicant_id !== context.userId) return null;

    const applicant = toPublic(await loadProfile(row.applicant_id));
    const questions = await sql<{
      id: number;
      type: string;
      prompt: string;
      required: boolean;
      config: unknown;
      sort_order: number;
    }>`select id, type, prompt, required, config, sort_order from questions where questionnaire_id = ${row.questionnaire_id} order by sort_order, id`;
    const answers = await sql<{ question_id: number; value: unknown }>`
      select question_id, value from answers where application_id = ${row.id}
    `;
    const answerMap: Record<string, AnswerValue> = {};
    for (const a of answers) answerMap[String(a.question_id)] = asJson<AnswerValue>(a.value, null);
    const messages = await sql<{
      id: number;
      sender_id: string;
      body: string;
      created_at: string;
    }>`select id, sender_id, body, created_at::text as created_at from messages where application_id = ${row.id} order by id`;

    return {
      id: Number(row.id),
      title: row.title,
      isOwner: row.owner_id === context.userId,
      status: row.status as ApplicationStatus,
      autoStatus: row.auto_status as ApplicationStatus,
      failReasons: asJson<string[]>(row.fail_reasons, []),
      submittedAt: row.submitted_at,
      applicant,
      questions: questions.map(parseQuestion),
      answers: answerMap,
      messages: messages.map((m) => ({
        id: Number(m.id),
        senderId: m.sender_id,
        body: m.body,
        createdAt: m.created_at,
        mine: m.sender_id === context.userId,
      })),
    };
  });

export const setApplicationStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number(), status: z.enum(["pending", "candidate", "rejected", "maybe"]) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const q = await getOrCreateQuestionnaire(context.userId);
    await sql`
      update applications set status = ${data.status}
      where id = ${data.id} and questionnaire_id = ${q.id}
    `;
    return { ok: true as const };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ applicationId: z.number(), body: z.string().min(1).max(1000) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ owner_id: string; applicant_id: string }>`
      select q.user_id as owner_id, a.applicant_id
      from applications a
      join questionnaires q on q.id = a.questionnaire_id
      where a.id = ${data.applicationId}
    `;
    const row = rows[0];
    if (!row) throw new Error("Application not found");
    if (row.owner_id !== context.userId && row.applicant_id !== context.userId) {
      throw new Error("Unauthorized");
    }
    const inserted = await sql<{ id: number; created_at: string }>`
      insert into messages (application_id, sender_id, body)
      values (${data.applicationId}, ${context.userId}, ${data.body.trim()})
      returning id, created_at::text as created_at
    `;
    return {
      id: Number(inserted[0].id),
      senderId: context.userId,
      body: data.body.trim(),
      createdAt: inserted[0].created_at,
      mine: true,
    };
  });

export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: number;
      status: string;
      title: string;
      slug: string;
      owner_name: string;
      submitted_at: string;
    }>`
      select a.id, a.status, q.title, q.slug, p.display_name as owner_name,
             a.submitted_at::text as submitted_at
      from applications a
      join questionnaires q on q.id = a.questionnaire_id
      join profiles p on p.user_id = q.user_id
      where a.applicant_id = ${context.userId}
      order by a.submitted_at desc
    `;
  });

export type { MediaItem };
