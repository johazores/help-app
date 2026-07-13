"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { accountService } from "@/services/account-service";
import { formatDateTime } from "@/lib/format";
import type { Profile, SessionInfo } from "@/services/types";

/** Reads a file, resizes it to a small square, returns a compact JPEG data URL. */
async function fileToAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file doesn't look like a photo."));
      i.src = url;
    });
    const size = 192;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process the photo.");
    const min = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AccountPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Section state
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "code">("idle");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinNew2, setPinNew2] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);

  function say(text: string, bad = false) {
    setNotice({ text, bad });
    setTimeout(() => setNotice(null), 5000);
  }

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    Promise.all([authService.me(), authService.sessions()])
      .then(([p, s]) => {
        setProfile(p);
        setName(p.name);
        setEmailInput(p.email ?? "");
        setSessions(s);
      })
      .catch(() => {
        void authService.signOut();
        router.replace("/sign-in");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function saveName() {
    if (name.trim().length < 2) return say("Please enter your name.", true);
    setSavingName(true);
    try {
      await accountService.updateName(name);
      setProfile((p) => (p ? { ...p, name: name.trim() } : p));
      say("Your name is updated.");
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't save.", true);
    } finally {
      setSavingName(false);
    }
  }

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const data = await fileToAvatar(file);
      await accountService.updateAvatar(data);
      setProfile((p) => (p ? { ...p, avatar: data } : p));
      say("Photo updated.");
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't update the photo.", true);
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      await accountService.updateAvatar(null);
      setProfile((p) => (p ? { ...p, avatar: null } : p));
      say("Photo removed.");
    } catch {
      say("Couldn't remove the photo.", true);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function sendEmailCode() {
    if (!emailInput) return say("Please enter an email address.", true);
    setEmailBusy(true);
    try {
      const res = await accountService.requestEmail(emailInput);
      setEmailStep("code");
      say(`We emailed a code to ${res.sentTo}.`);
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't send the code.", true);
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailCode() {
    if (emailCode.length !== 6) return say("Please enter the 6-number code.", true);
    setEmailBusy(true);
    try {
      const res = await accountService.confirmEmail(emailCode);
      setProfile((p) => (p ? { ...p, email: res.email, emailVerified: true } : p));
      setEmailStep("idle");
      setEmailCode("");
      say("Your email is verified.");
    } catch (err) {
      say(err instanceof Error ? err.message : "That code didn't work.", true);
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePin() {
    if (pinNew !== pinNew2) return say("Your new PINs don't match.", true);
    setPinBusy(true);
    try {
      await accountService.changePin(pinCurrent, pinNew);
      setPinCurrent("");
      setPinNew("");
      setPinNew2("");
      const s = await authService.sessions();
      setSessions(s);
      say("PIN changed. Other devices were signed out.");
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't change your PIN.", true);
    } finally {
      setPinBusy(false);
    }
  }

  async function revoke(sessionId: string) {
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      say("That device was signed out.");
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't sign that device out.", true);
    }
  }

  async function revokeOthers() {
    try {
      await authService.revokeAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.current));
      say("All other devices were signed out.");
    } catch {
      say("Couldn't sign other devices out.", true);
    }
  }

  function signOut() {
    void authService.signOut().finally(() => router.push("/sign-in"));
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink">
          <Spinner className="h-7 w-7" />
        </div>
      </AppShell>
    );
  }

  const initials = (profile?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell>
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Account</h1>

      {notice ? (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-[15px] font-medium ${
            notice.bad ? "bg-danger/10 text-danger" : "bg-sage/15 text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-6 grid max-w-4xl gap-6 lg:grid-cols-2">
        {/* Profile */}
        <div className="card space-y-5 p-6">
          <h2 className="text-[18px] font-bold text-ink">Your profile</h2>
          <div className="flex items-center gap-4">
            {profile?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full border border-line object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-[22px] font-bold text-paper">
                {initials}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickAvatar(e.target.files?.[0])}
              />
              <Button size="md" variant="ghost" loading={avatarBusy} onClick={() => fileRef.current?.click()}>
                {profile?.avatar ? "Change photo" : "Add a photo"}
              </Button>
              {profile?.avatar ? (
                <Button size="md" variant="ghost" onClick={removeAvatar} disabled={avatarBusy}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <Field label="Your name">
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
          <Button size="md" loading={savingName} onClick={saveName}>
            Save name
          </Button>

          <div className="border-t border-line pt-4">
            <p className="text-[14px] text-subtle">Mobile number (used to sign in)</p>
            <p className="mt-0.5 text-[17px] font-semibold text-ink">{profile?.phone}</p>
          </div>
        </div>

        {/* Email */}
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-ink">Email</h2>
            {profile?.email ? (
              <Badge tone={profile.emailVerified ? "received" : "open"}>
                {profile.emailVerified ? "Verified" : "Not verified"}
              </Badge>
            ) : null}
          </div>
          <p className="text-[15px] text-body">
            A verified email lets you recover your account if you ever forget your PIN.
          </p>
          <Field label={profile?.email ? "Change email" : "Add your email"}>
            {(id) => (
              <Input
                id={id}
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            )}
          </Field>
          {emailStep === "idle" ? (
            <Button size="md" loading={emailBusy} onClick={sendEmailCode}>
              {profile?.email && !profile.emailVerified && emailInput === profile.email
                ? "Resend verification code"
                : "Send verification code"}
            </Button>
          ) : (
            <div className="space-y-3">
              <Field label="Enter the 6-number code we emailed">
                {(id) => (
                  <Input
                    id={id}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    className="tracking-[0.4em]"
                  />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button size="md" loading={emailBusy} onClick={confirmEmailCode}>
                  Verify
                </Button>
                <Button size="md" variant="ghost" onClick={sendEmailCode} disabled={emailBusy}>
                  Send again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="card space-y-4 p-6">
          <h2 className="text-[18px] font-bold text-ink">Change your PIN</h2>
          <Field label="Current PIN">
            {(id) => (
              <Input id={id} value={pinCurrent} inputMode="numeric" className="tracking-[0.5em]" placeholder="••••••"
                onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            )}
          </Field>
          <Field label="New 6-number PIN">
            {(id) => (
              <Input id={id} value={pinNew} inputMode="numeric" className="tracking-[0.5em]" placeholder="••••••"
                onChange={(e) => setPinNew(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            )}
          </Field>
          <Field label="Type your new PIN again">
            {(id) => (
              <Input id={id} value={pinNew2} inputMode="numeric" className="tracking-[0.5em]" placeholder="••••••"
                onChange={(e) => setPinNew2(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            )}
          </Field>
          <Button size="md" loading={pinBusy} onClick={changePin}>
            Change PIN
          </Button>
          <p className="text-[13px] text-subtle">
            For safety, changing your PIN signs out every other device.
          </p>
        </div>

        {/* Sessions */}
        <div className="card space-y-4 p-6">
          <h2 className="text-[18px] font-bold text-ink">Where you&rsquo;re signed in</h2>
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-ink">
                    {s.device}
                    {s.current ? <span className="ml-2 text-[12px] font-bold text-sage">This device</span> : null}
                  </p>
                  <p className="text-[13px] text-subtle">Last used {formatDateTime(s.lastSeenAt)}</p>
                </div>
                {!s.current ? (
                  <button onClick={() => revoke(s.id)} className="shrink-0 text-[14px] font-semibold text-danger hover:underline">
                    Sign out
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {sessions.length > 1 ? (
            <Button size="md" variant="danger" onClick={revokeOthers}>
              Sign out all other devices
            </Button>
          ) : (
            <p className="text-[14px] text-subtle">You&rsquo;re only signed in here.</p>
          )}
        </div>

        {/* Quick links + sign out */}
        <div className="space-y-4 lg:col-span-2">
          <Link href="/home/wallets" className="block">
            <div className="card flex items-center justify-between p-6 hover:shadow-lift">
              <div>
                <p className="text-[17px] font-semibold text-ink">Your wallets</p>
                <p className="text-[15px] text-subtle">Switch, rename, add, or back up wallets</p>
              </div>
              <span className="text-[22px] text-subtle">→</span>
            </div>
          </Link>
          <Link href="/home/deposit" className="block">
            <div className="card flex items-center justify-between p-6 hover:shadow-lift">
              <div>
                <p className="text-[17px] font-semibold text-ink">Add funds</p>
                <p className="text-[15px] text-subtle">Top up or see your address</p>
              </div>
              <span className="text-[22px] text-subtle">→</span>
            </div>
          </Link>
          <Link href="/home/withdraw" className="block">
            <div className="card flex items-center justify-between p-6 hover:shadow-lift">
              <div>
                <p className="text-[17px] font-semibold text-ink">Move to your pocket</p>
                <p className="text-[15px] text-subtle">GCash, Maya, bank — coming soon</p>
              </div>
              <span className="text-[22px] text-subtle">→</span>
            </div>
          </Link>
          <Link href="/home/guide" className="block">
            <div className="card flex items-center justify-between p-6 hover:shadow-lift">
              <div>
                <p className="text-[17px] font-semibold text-ink">How Sagip works</p>
                <p className="text-[15px] text-subtle">A quick, friendly walkthrough</p>
              </div>
              <span className="text-[22px] text-subtle">→</span>
            </div>
          </Link>
          <Button variant="ghost" onClick={signOut} fullWidth>
            Sign out
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
