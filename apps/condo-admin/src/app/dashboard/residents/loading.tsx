export default function ResidentsLoading() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Moradores</h1>
          <p className="muted">Carregando cadastro de moradores...</p>
        </div>
      </header>
      <section className="admin-section">
        <div className="empty-state">
          <strong>Carregando dados</strong>
          <p>Buscando moradores, unidades e vinculos do condominio ativo.</p>
        </div>
      </section>
    </main>
  );
}
