import { resetPasswordAction } from "../actions";

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const sent = params?.sent === "1";
  const hasError = Boolean(params?.error);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Kynovia Access</p>
        <h1>Recuperar senha</h1>
        <p className="muted">Informe seu e-mail para receber o link de recuperação.</p>
        <form action={resetPasswordAction} className="auth-form">
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          {hasError ? <p className="form-error">Informe um e-mail válido.</p> : null}
          {sent ? <p className="form-success">Se o e-mail existir, o link será enviado.</p> : null}
          <button type="submit">Enviar link</button>
        </form>
        <a className="text-link" href="/login">
          Voltar para login
        </a>
      </section>
    </main>
  );
}
