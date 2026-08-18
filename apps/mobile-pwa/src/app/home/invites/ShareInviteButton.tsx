"use client";

import { useState, type ReactElement } from "react";

type ShareInviteButtonProps = {
  expiresAt: string;
  inviteId: string;
  visitorName: string;
};

export function ShareInviteButton({
  expiresAt,
  inviteId,
  visitorName
}: ShareInviteButtonProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const shareText = `Olá ${visitorName}! Aqui está seu convite de acesso ao condomínio. Código: ${inviteId.slice(0, 8).toUpperCase()}. Apresente este QR Code na portaria na sua chegada (válido até ${expiresAt}).`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // Fallback
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
      <a
        className="button-link"
        href={whatsappUrl}
        rel="noopener noreferrer"
        style={{
          background: "#25D366",
          borderColor: "#25D366",
          color: "#ffffff",
          flex: 1,
          justifyContent: "center",
          minHeight: "40px"
        }}
        target="_blank"
      >
        📲 Enviar por WhatsApp
      </a>
      <button
        className="secondary"
        onClick={handleCopy}
        style={{ minHeight: "40px" }}
        type="button"
      >
        {copied ? "✅ Copiado!" : "📋 Copiar Texto"}
      </button>
    </div>
  );
}
