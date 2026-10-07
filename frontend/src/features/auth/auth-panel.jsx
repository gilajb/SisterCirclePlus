"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CirclePlus, Gift } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { setToken } from "@/lib/auth";
import { flattenErrors } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  AgeInput,
  GuardianEmailInput,
  PasswordInput,
  TermsCheckbox,
  TextInput,
  isMinorAge,
} from "./form-fields";

const TABS = [
  { id: "signup", label: "Sign Up" },
  { id: "login", label: "Log In" },
  { id: "chw", label: "Institution" },
];

function SubmitButton({ loading, loadingLabel, className, children }) {
  return (
    <Button
      type="submit"
      variant="plum"
      size="xl"
      disabled={loading}
      className={cn("h-[52px] text-base", className)}
    >
      {loading ? (
        <>
          <Spinner /> {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login/", { email, password });
      setToken(data.access, data.refresh);
      router.push("/dashboard");
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <TextInput
        label="Email Address"
        placeholder="grace@example.com"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <PasswordInput
        label="Password"
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <div className="text-right">
        <Link href="/reset-password" className="text-[13px] font-medium text-primary">
          Forgot password?
        </Link>
      </div>
      <ErrorBanner message={error} />
      <SubmitButton loading={loading} loadingLabel="Logging in…">
        Log In
      </SubmitButton>
    </form>
  );
}

/**
 * Registration for both patients and institutions (CHW programs). The two
 * differ only in copy, the is_chw flag and where the user lands afterwards.
 */
function RegisterForm({ institution }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minor = isMinorAge(age);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name || !username || !email || !password || !age) {
      setError(
        institution
          ? "Please fill in all fields."
          : "Please fill in your name, username, email, age, and password.",
      );
      return;
    }
    if (!termsAccepted) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    if (minor && !guardianEmail) {
      setError("A parent or guardian email is required for users under 16.");
      return;
    }

    const nameParts = name.trim().split(" ");
    const payload = {
      username,
      email,
      password,
      password2: password,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      age: Number(age),
      terms_accepted: termsAccepted,
      ...(institution ? { is_chw: true, location } : location && { location }),
      ...(minor && { guardian_email: guardianEmail }),
    };

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register/", payload);
      setToken(data.access, data.refresh);
      router.push(institution ? "/chw" : "/symptom-check");
    } catch (err) {
      setError(flattenErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      {institution ? (
        <div className="rounded-xl border border-gold-border bg-gold-light p-5 text-gold-dark">
          <h2 className="mb-2 font-heading text-base font-bold">
            Institutional Portal Registration
          </h2>
          <p className="text-sm leading-relaxed">
            Register your school, NGO, or CHW program to manage youth access codes, reach your
            community, and access clinical diagnostic tools.
          </p>
        </div>
      ) : null}

      <TextInput
        label={institution ? "Contact Name" : "Full Name"}
        placeholder={institution ? "e.g., Amina Yusuf" : "Grace Adeleke"}
        autoComplete="name"
        value={name}
        onChange={setName}
      />
      {institution ? (
        <TextInput
          label="Institution / School / NGO Name"
          placeholder="e.g., Kenyatta Girls' Secondary School"
          autoComplete="organization"
          value={location}
          onChange={setLocation}
        />
      ) : null}
      <TextInput
        label="Email Address"
        placeholder={institution ? "name@organization.org" : "grace@example.com"}
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />
      <TextInput
        label="Username"
        placeholder={institution ? "e.g., amina_yusuf" : "grace_adeleke"}
        autoComplete="username"
        value={username}
        onChange={setUsername}
      />

      {institution ? (
        <AgeInput label="Age" placeholder="30" value={age} onChange={setAge} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <AgeInput label="Age" placeholder="28" value={age} onChange={setAge} />
          <TextInput
            label="Location"
            placeholder="Lagos, NG"
            autoComplete="address-level2"
            value={location}
            onChange={setLocation}
          />
        </div>
      )}
      {minor ? <GuardianEmailInput value={guardianEmail} onChange={setGuardianEmail} /> : null}

      {institution ? null : (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-gold-border bg-gold-light px-4 py-3 text-gold-dark">
          <Gift className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-[13px] font-semibold">
            Your account starts on our Free plan — no payment needed to begin.
          </span>
        </div>
      )}

      <PasswordInput
        label="Create Password"
        placeholder="••••••••"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
      <ErrorBanner message={error} />

      {institution ? (
        <SubmitButton
          loading={loading}
          loadingLabel="Registering…"
          className="bg-gold hover:bg-gold/90"
        >
          Register Institution <ArrowRight aria-hidden="true" />
        </SubmitButton>
      ) : (
        <SubmitButton loading={loading} loadingLabel="Creating account…" className="mt-1">
          Create Account
        </SubmitButton>
      )}
    </form>
  );
}

export function AuthPanel() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("type") === "chw" ? "chw" : "signup");

  return (
    <>
      <div role="tablist" aria-label="Account" className="flex rounded-full bg-[#ede8e4] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 cursor-pointer rounded-full py-[9px] text-sm font-medium text-muted-foreground transition-colors",
              tab === t.id && "bg-plum font-bold text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "signup" ? <RegisterForm key="signup" /> : null}
      {tab === "login" ? <LoginForm /> : null}
      {tab === "chw" ? <RegisterForm key="chw" institution /> : null}

      {tab === "chw" ? null : (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t pt-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-light text-gold-dark">
            <CirclePlus className="size-[18px]" aria-hidden="true" />
          </div>
          <span className="min-w-40 flex-1 text-sm text-body">
            Represent a School, NGO, or CHW Program?
          </span>
          <button
            type="button"
            onClick={() => setTab("chw")}
            className="cursor-pointer text-[13px] font-bold whitespace-nowrap text-gold-dark underline"
          >
            Register your institution here
          </button>
        </div>
      )}
    </>
  );
}
