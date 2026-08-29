import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { addMedia, getMyProfile, removeMedia, saveProfile } from "@/lib/dately/api";
import { compressImage, readVideo } from "@/lib/dately/media";
import type { Profile, ProfileField } from "@/lib/dately/types";
import { AuthGate } from "@/components/auth-gate";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/me")({ component: () => <AuthGate><Me /></AuthGate> });

function Me() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => toast.error("Could not load profile"));
  }, []);

  if (!profile) {
    return (
      <Shell>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="mt-4 h-64 w-full rounded-xl" />
      </Shell>
    );
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  async function onSave() {
    if (!profile) return;
    setBusy(true);
    try {
      const saved = await saveProfile({
        data: {
          displayName: profile.displayName,
          age: profile.age,
          bio: profile.bio,
          location: profile.location,
          gender: profile.gender,
          lookingFor: profile.lookingFor,
          fields: profile.fields.map((f) => ({ label: f.label, value: f.value })),
        },
      });
      setProfile(saved);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const data = await compressImage(file);
      const added = await addMedia({ data: { kind: "photo", mime: "image/jpeg", data } });
      setProfile((p) =>
        p
          ? {
              ...p,
              media: [
                ...p.media,
                { id: added.id, kind: "photo", mime: "image/jpeg", data, sortOrder: p.media.length },
              ],
            }
          : p,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add photo");
    }
  }

  async function onVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const data = await readVideo(file);
      const added = await addMedia({ data: { kind: "video", mime: file.type || "video/mp4", data } });
      setProfile((p) =>
        p
          ? {
              ...p,
              media: [
                ...p.media,
                { id: added.id, kind: "video", mime: file.type || "video/mp4", data, sortOrder: p.media.length },
              ],
            }
          : p,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add video");
    }
  }

  async function onRemove(id: number) {
    await removeMedia({ data: { id } });
    setProfile((p) => (p ? { ...p, media: p.media.filter((m) => m.id !== id) } : p));
  }

  const photos = profile.media.filter((m) => m.kind === "photo");
  const videos = profile.media.filter((m) => m.kind === "video");

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-subtle">You</p>
          <h1 className="mt-1 font-display text-4xl">Profile</h1>
        </div>
        <UserButton />
      </div>

      <section className="mt-6">
        <Label>Photos</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {photos.map((m) => (
            <div key={m.id} className="relative aspect-[3/4] overflow-hidden rounded-md">
              <img src={m.data} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-bg/70 text-fg"
                onClick={() => void onRemove(m.id)}
                aria-label="Remove photo"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong text-subtle"
            >
              <Plus className="size-5" />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPhoto(e.target.files)}
        />
      </section>

      <section className="mt-6">
        <Label>Videos</Label>
        <p className="mt-1 text-xs text-subtle">Short clips, under 4 MB.</p>
        <div className="mt-2 space-y-2">
          {videos.map((m) => (
            <div key={m.id} className="relative overflow-hidden rounded-lg">
              <video src={m.data} controls className="w-full bg-black" />
              <button
                type="button"
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-bg/70"
                onClick={() => void onRemove(m.id)}
                aria-label="Remove video"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {videos.length < 2 && (
            <Button type="button" variant="secondary" onClick={() => videoRef.current?.click()}>
              <Plus className="size-4" /> Add video
            </Button>
          )}
        </div>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => void onVideo(e.target.files)}
        />
      </section>

      <div className="mt-8 space-y-4">
        <Field label="Name">
          <Input
            value={profile.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            placeholder="What should they call you"
          />
        </Field>
        <Field label="Age">
          <Input
            type="number"
            min={18}
            max={99}
            value={profile.age ?? ""}
            onChange={(e) => update("age", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
        <Field label="Location">
          <Input
            value={profile.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="City"
          />
        </Field>
        <Field label="Gender">
          <Input
            value={profile.gender}
            onChange={(e) => update("gender", e.target.value)}
            placeholder="Woman, man, non-binary…"
          />
        </Field>
        <Field label="Looking for">
          <Input
            value={profile.lookingFor}
            onChange={(e) => update("lookingFor", e.target.value)}
            placeholder="Whoever you are hoping to meet"
          />
        </Field>
        <Field label="About">
          <Textarea
            value={profile.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="A few sentences. Skip the resume."
          />
        </Field>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <Label>Your own fields</Label>
          <button
            type="button"
            className="text-sm text-rose"
            onClick={() =>
              update("fields", [...profile.fields, { label: "", value: "" } satisfies ProfileField])
            }
          >
            Add field
          </button>
        </div>
        <p className="mt-1 text-xs text-subtle">Height, job, languages — you name the label.</p>
        <div className="mt-3 space-y-2">
          {profile.fields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="Label"
                value={field.label}
                onChange={(e) => {
                  const next = [...profile.fields];
                  next[i] = { ...field, label: e.target.value };
                  update("fields", next);
                }}
              />
              <Input
                placeholder="Value"
                value={field.value}
                onChange={(e) => {
                  const next = [...profile.fields];
                  next[i] = { ...field, value: e.target.value };
                  update("fields", next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => update("fields", profile.fields.filter((_, j) => j !== i))}
                aria-label="Remove field"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Button className="mt-8 w-full" size="lg" disabled={busy} onClick={() => void onSave()}>
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
