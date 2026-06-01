import { LoginShell } from "@kynovia/ui";
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
    <LoginShell
      title={appName}
      description={loginDescription}
      signInAction={signInAction}
      errorMessage={errorMessage}
    />
  );
}
