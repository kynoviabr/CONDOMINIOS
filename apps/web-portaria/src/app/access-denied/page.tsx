export default function AccessDeniedPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Kynovia Access</p>
        <h1>Acesso negado</h1>
        <p className="muted">Seu perfil não possui permissão para acessar esta área.</p>
        <a className="button-link" href="/login">
          Trocar usuário
        </a>
      </section>
    </main>
  );
}
