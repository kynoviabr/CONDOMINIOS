import { AccessDeniedShell } from "@kynovia/ui";

export default function AccessDeniedPage() {
  return (
    <AccessDeniedShell
      eyebrow="Kynovia Condo Admin"
      description="Seu perfil não possui permissão para acessar o backoffice interno da Kynovia."
    />
  );
}
