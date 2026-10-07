"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CenteredCard } from "@/components/layout/centered-card";
import { ErrorBanner } from "@/components/shared/error-banner";
import { Field } from "@/components/shared/field";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { Spinner } from "@/components/shared/spinner";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { removeToken } from "@/lib/auth";
import { flattenErrors } from "@/lib/errors";
import { DeleteAccountDialog } from "./delete-account-dialog";

const TIER_LABELS = {
  free: "Free",
  under_18: "Under-18 (discounted)",
  standard: "Standard",
  premium: "Premium",
};

function PasswordField({ label, value, onChange, autoComplete }) {
  return (
    <Field label={<span className="text-[13px]">{label}</span>}>
      {(id) => (
        <Input
          id={id}
          type="password"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-border h-[42px] rounded-lg px-3.5 text-sm"
        />
      )}
    </Field>
  );
}

function AccountDetails({ me }) {
  if (!me) return <p className="text-muted-foreground text-[13px]">Loading…</p>;
  const rows = [
    ["Username", me.username],
    ["Email", me.email],
    ["Plan", TIER_LABELS[me.tier] || me.tier],
    ["Email verified", me.email_verified ? "Yes" : "No"],
  ];
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!currentPassword || !newPassword || !newPassword2) {
      setError("Please fill in all three fields.");
      return;
    }
    setState("loading");
    try {
      await api.post("/api/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setState("done");
    } catch (err) {
      setError(flattenErrors(err));
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-success flex items-center gap-1.5 text-[13px] font-semibold">
        <Check className="size-4" aria-hidden="true" /> Your password has been changed.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <PasswordField
        label="Current Password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label="New Password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm New Password"
        value={newPassword2}
        onChange={setNewPassword2}
        autoComplete="new-password"
      />
      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="mauve"
        size="xl"
        disabled={state === "loading"}
        className="h-[42px] self-start rounded-lg px-5 text-sm"
      >
        {state === "loading" ? (
          <>
            <Spinner /> Updating…
          </>
        ) : (
          "Update Password"
        )}
      </Button>
    </form>
  );
}

function ExportData({ username }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error

  async function handleExport() {
    setState("loading");
    try {
      const { data } = await api.get("/api/user/export/");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sistercircle-data-export-${username || "account"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <Button
        variant="mauve"
        size="xl"
        onClick={handleExport}
        disabled={state === "loading"}
        className="h-[42px] rounded-lg px-5 text-sm"
      >
        {state === "loading" ? (
          <>
            <Spinner /> Preparing…
          </>
        ) : (
          "Export My Data"
        )}
      </Button>
      {state === "done" ? (
        <p className="text-success mt-2.5 flex items-center gap-1 text-xs">
          <Check className="size-3.5" aria-hidden="true" /> Downloaded
        </p>
      ) : null}
      {state === "error" ? (
        <p role="alert" className="text-danger mt-2.5 text-xs">
          Couldn't export your data right now. Please try again.
        </p>
      ) : null}
    </>
  );
}

export function Settings() {
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    api
      .get("/api/auth/me/")
      .then((res) => setMe(res.data))
      .catch(() => setMeError("Couldn't load your account details right now."));
  }, []);

  function handleDeleted() {
    removeToken();
    setShowDeleteDialog(false);
    setDeleted(true);
  }

  if (deleted) {
    return (
      <CenteredCard className="py-10">
        <Check className="mx-auto size-8" aria-hidden="true" />
        <h1 className="font-heading text-lg font-bold">Your account has been deleted</h1>
        <p className="text-body text-sm">
          Your account and all associated data have been permanently removed.
        </p>
        <Button asChild variant="mauve" size="xl" className="mt-2 w-full">
          <Link href="/">Back to Home</Link>
        </Button>
      </CenteredCard>
    );
  }

  return (
    <div className="min-h-screen">
      <DeleteAccountDialog
        open={showDeleteDialog}
        username={me?.username || "your account"}
        onOpenChange={setShowDeleteDialog}
        onDeleted={handleDeleted}
      />

      <header className="border-b px-6 py-6 md:px-12">
        <Wordmark href="/dashboard" className="text-lg" />
      </header>

      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-6 py-12">
        <h1 className="font-heading text-[28px] font-extrabold">Account Settings</h1>

        <ErrorBanner message={meError} />

        <Panel as="section">
          <PanelTitle className="mb-4">Your Account</PanelTitle>
          <AccountDetails me={me} />
        </Panel>

        <Panel as="section">
          <PanelTitle className="mb-4">Change Password</PanelTitle>
          <ChangePassword />
        </Panel>

        <Panel as="section">
          <PanelTitle className="mb-2">Your Data</PanelTitle>
          <p className="text-body mb-4 text-[13px] leading-relaxed">
            Download a copy of your account details and every symptom check you've submitted, as a
            JSON file.
          </p>
          <ExportData username={me?.username} />
        </Panel>

        <Panel as="section" className="border-danger-border">
          <PanelTitle className="text-danger mb-2">Danger Zone</PanelTitle>
          <p className="text-body mb-4 text-[13px] leading-relaxed">
            Permanently delete your account and every symptom check you've submitted. This cannot
            be undone.
          </p>
          <Button
            variant="outline"
            size="xl"
            onClick={() => setShowDeleteDialog(true)}
            className="border-danger bg-card text-danger hover:bg-danger-bg hover:text-danger h-[42px] rounded-lg px-5 text-sm"
          >
            Delete My Account
          </Button>
        </Panel>
      </main>
    </div>
  );
}
