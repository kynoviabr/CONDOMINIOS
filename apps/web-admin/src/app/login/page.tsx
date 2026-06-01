import { signInAction } from "../actions";
import { appName, loginDescription } from "../../lib/auth/config";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getErrorMessage(error?: string | string[]) {
  if (!error) {
    return null;
  }

  return error === "missing_credentials"
    ? "Informe e-mail e senha para continuar."
    : "Não foi possível entrar com essas credenciais.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Kynovia Access</p>
        <h1>{appName}</h1>
        <p className="muted">{loginDescription}</p>
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
        <a className="text-link" href="/reset-password">
          Recuperar senha
        </a>
      </section>
    </main>
  );
}
