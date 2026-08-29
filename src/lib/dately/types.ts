export const QUESTION_TYPES = [
  "text",
  "long_text",
  "slider",
  "multiple_choice",
  "multi_select",
  "yes_no",
  "scale",
  "predefined",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export type FilterValue = string | number | boolean | null | Array<string | number>;
export type AnswerValue = string | number | boolean | null | string[];

export type QuestionConfig = {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  options?: string[];
};

export type QuestionDraft = {
  clientId: string;
  id?: number;
  type: QuestionType;
  prompt: string;
  required: boolean;
  config: QuestionConfig;
};

export type FilterDraft = {
  clientId: string;
  kind: "profile" | "question";
  field?: "age" | "gender" | "looking_for";
  questionClientId?: string;
  operator: "eq" | "neq" | "gte" | "lte" | "between" | "in" | "contains";
  value: FilterValue;
  hard: boolean;
};

export type ProfileField = {
  id?: number;
  label: string;
  value: string;
};

export type MediaItem = {
  id: number;
  kind: "photo" | "video";
  mime: string;
  data: string;
  sortOrder: number;
};

export type Profile = {
  userId: string;
  displayName: string;
  age: number | null;
  bio: string;
  location: string;
  gender: string;
  lookingFor: string;
  fields: ProfileField[];
  media: MediaItem[];
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  age: number | null;
  bio: string;
  location: string;
  gender: string;
  lookingFor: string;
  fields: ProfileField[];
  photos: MediaItem[];
  videos: MediaItem[];
  cover: string | null;
};

export type Questionnaire = {
  id: number;
  userId: string;
  title: string;
  intro: string;
  isPublished: boolean;
  slug: string;
  questions: Array<QuestionDraft & { id: number }>;
  filters: FilterDraft[];
};

export type DiscoverCard = {
  slug: string;
  title: string;
  intro: string;
  questionCount: number;
  owner: {
    userId: string;
    displayName: string;
    age: number | null;
    location: string;
    cover: string | null;
  };
};

export type ApplicationStatus = "pending" | "candidate" | "rejected" | "maybe";

export type ApplicationListItem = {
  id: number;
  status: ApplicationStatus;
  autoStatus: ApplicationStatus;
  failReasons: string[];
  submittedAt: string;
  applicant: {
    userId: string;
    displayName: string;
    age: number | null;
    location: string;
    cover: string | null;
  };
};

export type AnswerMap = Record<string, AnswerValue>;

export type ApplicationDetail = {
  id: number;
  title: string;
  isOwner: boolean;
  status: ApplicationStatus;
  autoStatus: ApplicationStatus;
  failReasons: string[];
  submittedAt: string;
  applicant: PublicProfile;
  questions: Array<QuestionDraft & { id: number }>;
  answers: AnswerMap;
  messages: Array<{
    id: number;
    senderId: string;
    body: string;
    createdAt: string;
    mine: boolean;
  }>;
};

