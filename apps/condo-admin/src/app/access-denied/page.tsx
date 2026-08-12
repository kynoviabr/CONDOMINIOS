import { AccessDeniedShell } from "@kynovia/ui";

export default function AccessDeniedPage() {
  return (
    <AccessDeniedShell
      eyebrow="Condo Admin"
      description="Seu perfil não possui permissão para acessar a administração do condomínio."
    />
  );
}
