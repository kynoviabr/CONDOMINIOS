import type { ComponentPropsWithoutRef, ReactNode } from "react";

type FormAction = ComponentPropsWithoutRef<"form">["action"];

export type AdminProfileSummary = {
  fullName: string;
  role: string;
  tenantId: string;
};

export type ShellPanelProps = {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  surface?: "auth" | "app";
};

export function ShellPanel({
  eyebrow,
  title,
  description,
  children,
  surface = "app"
}: ShellPanelProps) {
  return (
    <main className={surface === "auth" ? "auth-page" : "app-page"}>
      <section className={surface === "auth" ? "auth-panel" : "app-panel"}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="muted">{description}</p>
        {children}
      </section>
    </main>
  );
}

export type ProfileSummaryProps = {
  profile: AdminProfileSummary;
};

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  return (
    <dl className="profile-list">
      <div>
        <dt>Usuário</dt>
        <dd>{profile.fullName}</dd>
      </div>
      <div>
        <dt>Perfil</dt>
        <dd>{profile.role}</dd>
      </div>
      <div>
        <dt>Tenant</dt>
        <dd>{profile.tenantId}</dd>
      </div>
    </dl>
  );
}

export type AdminDashboardShellProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  profile: AdminProfileSummary;
  signOutAction: FormAction;
  children?: ReactNode;
};

export function AdminDashboardShell({
  eyebrow,
  title,
  description,
  profile,
  children
}: AdminDashboardShellProps) {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </header>
      <ProfileSummary profile={profile} />
      {children}
    </main>
  );
}

export type AccessDeniedShellProps = {
  eyebrow: string;
  description: ReactNode;
  loginHref?: string;
};

export function AccessDeniedShell({
  eyebrow,
  description,
  loginHref = "/login"
}: AccessDeniedShellProps) {
  return (
    <ShellPanel
      eyebrow={eyebrow}
      title="Acesso negado"
      description={description}
      surface="auth"
    >
      <a className="button-link" href={loginHref}>
        Trocar usuário
      </a>
    </ShellPanel>
  );
}

export type LoginShellProps = {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  signInAction: FormAction;
  errorMessage?: string | null;
  resetPasswordHref?: string;
};

export function LoginShell({
  eyebrow,
  title,
  description,
  signInAction,
  errorMessage,
  resetPasswordHref = "/reset-password"
}: LoginShellProps) {
  return (
    <ShellPanel eyebrow={eyebrow} title={title} description={description} surface="auth">
      <form action={signInAction} className="auth-form">
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Senha
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <button type="submit">Entrar</button>
      </form>
      <a className="text-link" href={resetPasswordHref}>
        Recuperar senha
      </a>
    </ShellPanel>
  );
}

export type ResetPasswordShellProps = {
  resetPasswordAction: FormAction;
  hasError?: boolean;
  sent?: boolean;
  loginHref?: string;
};

export function ResetPasswordShell({
  resetPasswordAction,
  hasError = false,
  sent = false,
  loginHref = "/login"
}: ResetPasswordShellProps) {
  return (
    <ShellPanel
      eyebrow="Kynovia Access"
      title="Recuperar senha"
      description="Informe seu e-mail para receber o link de recuperação."
      surface="auth"
    >
      <form action={resetPasswordAction} className="auth-form">
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {hasError ? <p className="form-error">Informe um e-mail válido.</p> : null}
        {sent ? <p className="form-success">Se o e-mail existir, o link será enviado.</p> : null}
        <button type="submit">Enviar link</button>
      </form>
      <a className="text-link" href={loginHref}>
        Voltar para login
      </a>
    </ShellPanel>
  );
}
