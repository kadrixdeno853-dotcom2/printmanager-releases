import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  BusinessProfile,
  User,
  createFirstOwner,
  generateRecoveryCode,
  login,
  resetPasswordWithRecovery,
  resetWorkspace,
} from "./lib/desktop";
import CompanyLogo from "./CompanyLogo";

export function OwnerSetup({
  profile,
  onComplete,
}: {
  profile: BusinessProfile;
  onComplete: (user: User) => void;
}) {
  const [input, setInput] = useState({
    fullName: profile.ownerName,
    username: "owner",
    password: "",
    role: "owner",
    phone: profile.phone,
    isActive: true,
  });
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [owner, setOwner] = useState<User | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (input.password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const created = await createFirstOwner(input);
      const signedIn = await login(created.username, input.password);
      setOwner(signedIn);
      setRecoveryCode(await generateRecoveryCode());
    } catch (reason) {
      setError(String(reason));
    }
  };
  if (showSignIn) return <LoginScreen business={profile} onLogin={onComplete} onReset={() => setShowSignIn(false)} />;
  if (recoveryCode && owner)
    return (
      <AuthLayout>
        <div className="auth-icon">
          <KeyRound />
        </div>
        <p className="eyebrow">EMERGENCY ACCESS</p>
        <h1>Save your recovery code</h1>
        <p className="auth-copy">
          Use this code to reset the owner password without losing business
          data. Print it or store it away from this computer.
        </p>
        <div className="recovery-code">{recoveryCode}</div>
        <p className="recovery-warning">
          This code is shown only once. Creating another code later will replace
          it.
        </p>
        <button className="auth-continue" onClick={() => onComplete(owner)}>
          I saved the code <ArrowRight />
        </button>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      <div className="auth-icon">
        <ShieldCheck />
      </div>
      <p className="eyebrow">SECURE YOUR BUSINESS</p>
      <h1>Create the owner account</h1>
      <p className="auth-copy">
        This account controls employees, financial reports, backups and
        settings.
      </p>
      <form onSubmit={submit}>
        <Field
          label="Owner name"
          value={input.fullName}
          set={(value) => setInput({ ...input, fullName: value })}
        />
        <Field
          label="Username"
          value={input.username}
          set={(value) => setInput({ ...input, username: value })}
        />
        <Field
          label="Password"
          value={input.password}
          set={(value) => setInput({ ...input, password: value })}
          password
        />
        <Field
          label="Confirm password"
          value={confirm}
          set={setConfirm}
          password
        />
        {error && <p className="auth-error">{error}</p>}
        <button>
          Create owner account <ArrowRight />
        </button>
        <button type="button" className="auth-link" onClick={() => setShowSignIn(true)}>
          Already have an owner account? Sign in
        </button>
      </form>
    </AuthLayout>
  );
}

export function LoginScreen({
  business,
  onLogin,
  onReset,
}: {
  business: BusinessProfile;
  onLogin: (user: User) => void;
  onReset: () => void;
}) {
  const [mode, setMode] = useState<"login" | "recover" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError("");
  };
  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(username, password));
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };
  const recover = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resetPasswordWithRecovery(username, code, newPassword);
      setMode("login");
      setPassword("");
      setError("Password reset successfully. Sign in with the new password.");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };
  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (resetConfirmation !== `RESET ${business.businessName}`) {
      setError(`Type RESET ${business.businessName} exactly to continue.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resetWorkspace();
      onReset();
    } catch (reason) {
      setError(String(reason));
      setBusy(false);
    }
  };
  if (mode === "reset")
    return (
      <AuthLayout>
        <div className="auth-icon reset-icon">
          <AlertTriangle />
        </div>
        <p className="eyebrow">START A NEW COMPANY</p>
        <h1>Reset PrintManager</h1>
        <p className="auth-copy">
          This permanently removes <strong>{business.businessName}</strong>,
          every account, customer, order, quotation, invoice, payment, expense
          and inventory record on this computer.
        </p>
        <div className="reset-warning">
          <AlertTriangle />
          <span>
            <strong>This cannot be undone</strong>
            <small>
              Use Backup & recovery first if any existing information must be
              kept.
            </small>
          </span>
        </div>
        <form onSubmit={reset}>
          <label>
            Type <strong>RESET {business.businessName}</strong> to confirm
            <input
              autoFocus
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button
            className="danger-action"
            disabled={busy || !resetConfirmation}
          >
            {busy
              ? "Resetting everything…"
              : "Erase data and register a new company"}
            <ArrowRight />
          </button>
          <button
            type="button"
            className="auth-link"
            onClick={() => changeMode("login")}
          >
            <ArrowLeft /> Cancel and return to sign in
          </button>
        </form>
      </AuthLayout>
    );
  if (mode === "recover")
    return (
      <AuthLayout>
        <div className="auth-icon">
          <KeyRound />
        </div>
        <p className="eyebrow">{business.businessName}</p>
        <h1>Recover owner account</h1>
        <p className="auth-copy">
          Reset the owner password without changing business data.
        </p>
        <form onSubmit={recover}>
          <Field label="Owner username" value={username} set={setUsername} />
          <Field
            label="Recovery code"
            value={code}
            set={(value) => setCode(value.toUpperCase())}
          />
          <Field
            label="New password"
            value={newPassword}
            set={setNewPassword}
            password
          />
          <Field
            label="Confirm new password"
            value={confirm}
            set={setConfirm}
            password
          />
          {error && <p className="auth-error">{error}</p>}
          <button disabled={busy}>
            Reset password <ArrowRight />
          </button>
          <button
            type="button"
            className="auth-link"
            onClick={() => changeMode("login")}
          >
            <ArrowLeft /> Back to sign in
          </button>
        </form>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      <div className="auth-icon">
        <LockKeyhole />
      </div>
      <p className="eyebrow">{business.businessName}</p>
      <h1>Welcome back</h1>
      <p className="auth-copy">
        Sign in to open the offline business workspace.
      </p>
      <form onSubmit={signIn}>
        <Field label="Username" value={username} set={setUsername} />
        <Field label="Password" value={password} set={setPassword} password />
        {error && (
          <p
            className={
              error.includes("successfully") ? "auth-success" : "auth-error"
            }
          >
            {error}
          </p>
        )}
        <button disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <ArrowRight />
        </button>
        <div className="auth-links">
          <button type="button" onClick={() => changeMode("recover")}>
            <KeyRound /> Forgot password?
          </button>
          <button type="button" onClick={() => changeMode("reset")}>
            <UserPlus /> Create account
          </button>
        </div>
      </form>
      <div className="auth-local">
        <UserRound /> Accounts are verified securely on this computer.
      </div>
    </AuthLayout>
  );
}

function Field({
  label,
  value,
  set,
  password = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  password?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        required
        type={password ? "password" : "text"}
        minLength={password ? 6 : undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
}
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="setup-brand">
        <CompanyLogo className="brand-mark" />
        <strong>PrintManager</strong>
      </div>
      <main>{children}</main>
      <small>Offline business management • Local data protection</small>
    </div>
  );
}
