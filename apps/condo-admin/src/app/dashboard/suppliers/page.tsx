import {
  formatAllowedSchedule,
  formatAllowedWeekdays,
  parseSupplierMetadata,
  sanitizeSupplierSearch,
  supplierCategories,
  supplierCategoryLabels,
  supplierStatusLabels,
  weekdayLabels
} from "@kynovia/database";
import type { SupplierCategory, SupplierStatus } from "@kynovia/database";
import Link from "next/link";
import {
  createSupplierAction,
  deleteSupplierAction,
  toggleSupplierStatusAction,
  updateSupplierAction
} from "./actions";
import { DeleteSupplierButton } from "./DeleteSupplierButton";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  category?: string;
  feedback?: string;
  q?: string;
  status?: string;
}>;

type Supplier = {
  allowed_time_end: string;
  allowed_time_start: string;
  allowed_weekdays: number[];
  block_reason: string | null;
  blocked_at: string | null;
  category: SupplierCategory;
  contact_name: string | null;
  created_at: string;
  document: string | null;
  email: string | null;
  id: string;
  metadata: unknown;
  name: string;
  phone: string | null;
  status: SupplierStatus;
  trade_name: string | null;
};

export const dynamic = "force-dynamic";

const feedbackMessages: Record<string, { message: string; tone: "error" | "success" }> = {
  create_supplier_failed: { message: "Não foi possível cadastrar o prestador.", tone: "error" },
  delete_supplier_failed: { message: "Não foi possível remover o prestador.", tone: "error" },
  invalid_status: { message: "Status informado é inválido.", tone: "error" },
  missing_supplier_id: { message: "Prestador não identificado.", tone: "error" },
  missing_supplier_name: { message: "Informe a razão social ou nome da empresa.", tone: "error" },
  supplier_activated: { message: "Prestador ativado com sucesso.", tone: "success" },
  supplier_blocked: { message: "Prestador bloqueado com sucesso na portaria.", tone: "success" },
  supplier_created: { message: "Prestador cadastrado com sucesso.", tone: "success" },
  supplier_deleted: { message: "Prestador removido com sucesso.", tone: "success" },
  supplier_not_found: { message: "Prestador não encontrado no condomínio ativo.", tone: "error" },
  supplier_updated: { message: "Dados do prestador atualizados com sucesso.", tone: "success" },
  update_supplier_failed: { message: "Não foi possível atualizar o prestador.", tone: "error" }
};

export default async function SuppliersPage({ searchParams }: { searchParams: SearchParams }) {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "suppliers");
  const params = await searchParams;
  const search = sanitizeSupplierSearch(params.q ?? "").toLowerCase();
  const selectedCategory = (params.category ?? "").trim();
  const selectedStatus = (params.status ?? "all").trim();
  const rawStatus = (params.feedback ?? "").trim();
  const feedback = rawStatus ? feedbackMessages[rawStatus] : undefined;

  const supabase = await createServerSupabaseClient();

  const { data: suppliersData, error: suppliersError } = await supabase
    .from("suppliers")
    .select(
      "id, name, trade_name, document, category, contact_name, phone, email, status, block_reason, blocked_at, allowed_weekdays, allowed_time_start, allowed_time_end, metadata, created_at"
    )
    .eq("tenant_id", context.profile.tenantId)
    .eq("condominium_id", context.condominium.id)
    .order("name", { ascending: true });

  const rawSuppliers = (suppliersData ?? []) as Supplier[];

  // Metrics
  const totalSuppliers = rawSuppliers.length;
  const activeCount = rawSuppliers.filter((s) => s.status === "active").length;
  const blockedCount = rawSuppliers.filter((s) => s.status === "blocked").length;
  const fullAccessCount = rawSuppliers.filter(
    (s) => s.allowed_time_start === "00:00" && s.allowed_time_end === "23:59"
  ).length;

  // Filter
  const filteredSuppliers = rawSuppliers.filter((s) => {
    const meta = parseSupplierMetadata(s.metadata);

    if (selectedCategory && s.category !== selectedCategory) {
      return false;
    }

    if (selectedStatus !== "all" && s.status !== selectedStatus) {
      return false;
    }

    if (search) {
      const matchName = s.name.toLowerCase().includes(search);
      const matchTrade = (s.trade_name ?? "").toLowerCase().includes(search);
      const matchDoc = (s.document ?? "").toLowerCase().includes(search);
      const matchContact = (s.contact_name ?? "").toLowerCase().includes(search);
      const matchPhone = (s.phone ?? "").toLowerCase().includes(search);
      const matchEmail = (s.email ?? "").toLowerCase().includes(search);
      const matchContract = (meta.contractNumber ?? "").toLowerCase().includes(search);
      const matchNotes = (meta.notes ?? "").toLowerCase().includes(search);

      return (
        matchName ||
        matchTrade ||
        matchDoc ||
        matchContact ||
        matchPhone ||
        matchEmail ||
        matchContract ||
        matchNotes
      );
    }

    return true;
  });

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Condo Admin</p>
          <h1>Prestadores e Fornecedores</h1>
          <p className="muted">
            Cadastro, categorias e regras de acesso de empresas e técnicos autorizados no{" "}
            <strong>{context.condominium.name}</strong>.
          </p>
        </div>
        <Link className="button-link secondary" href="/dashboard">
          Voltar ao painel
        </Link>
      </header>

      {feedback ? (
        <section
          className={`feedback ${feedback.tone === "success" ? "success" : "destructive"}`}
          role="alert"
        >
          {feedback.message}
        </section>
      ) : null}

      {suppliersError ? (
        <section className="feedback destructive" role="alert">
          Falha ao carregar a lista de prestadores do condomínio.
        </section>
      ) : null}

      <section className="condo-overview">
        <div className="metric-card">
          <span>Total de Prestadores</span>
          <strong>{totalSuppliers}</strong>
        </div>
        <div className="metric-card">
          <span>Ativos</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="metric-card">
          <span>Bloqueados</span>
          <strong style={{ color: blockedCount > 0 ? "#e11d48" : "inherit" }}>
            {blockedCount}
          </strong>
        </div>
        <div className="metric-card">
          <span>Acesso 24 Horas</span>
          <strong>{fullAccessCount}</strong>
        </div>
      </section>

      {/* Formulário de Novo Prestador posicionado antes da listagem */}
      <section className="admin-section" style={{ marginBottom: "24px" }}>
        <h2>Novo Prestador / Fornecedor</h2>
        <p className="section-description">
          Cadastre uma nova empresa terceirizada, equipe técnica ou fornecedor recorrente.
        </p>

        <form action={createSupplierAction} className="admin-form">
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
            }}
          >
            <label>
              Razão Social / Nome da Empresa *
              <input name="name" placeholder="Ex: Atlas Schindler Elevadores Ltda" required />
            </label>

            <label>
              Nome Fantasia
              <input name="tradeName" placeholder="Ex: Atlas Elevadores" />
            </label>

            <label>
              CNPJ ou CPF
              <input name="document" placeholder="00.000.000/0001-00" />
            </label>

            <label>
              Categoria do Serviço *
              <select defaultValue="maintenance" name="category">
                {supplierCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {supplierCategoryLabels[cat]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Responsável / Contato
              <input name="contactName" placeholder="Ex: Carlos (Gerente de Contas)" />
            </label>

            <label>
              Telefone / WhatsApp
              <input name="phone" placeholder="(11) 99999-8888" />
            </label>

            <label>
              E-mail de Contato
              <input name="email" placeholder="contato@empresa.com.br" type="email" />
            </label>

            <label>
              Nº do Contrato / Referência
              <input name="contractNumber" placeholder="Ex: CT-2026-09" />
            </label>

            <label>
              Horário de Entrada Permitido
              <input defaultValue="08:00" name="allowedTimeStart" placeholder="08:00" />
            </label>

            <label>
              Horário de Saída Limite
              <input defaultValue="18:00" name="allowedTimeEnd" placeholder="18:00" />
            </label>

            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
                Dias da Semana Permitidos para Entrada
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
                {[2, 3, 4, 5, 6, 7, 1].map((dayNum) => (
                  <label
                    key={dayNum}
                    style={{
                      alignItems: "center",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "row",
                      gap: "6px"
                    }}
                  >
                    <input
                      defaultChecked={[2, 3, 4, 5, 6].includes(dayNum)}
                      name="allowedWeekdays"
                      type="checkbox"
                      value={dayNum}
                    />
                    <span>{weekdayLabels[dayNum]}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={{ gridColumn: "1 / -1" }}>
              Observações internas e regras de portaria
              <textarea
                name="notes"
                placeholder="Exige EPI obrigatório, crachá na portaria, acesso somente pela garagem..."
                rows={2}
              />
            </label>
          </div>

          <div>
            <button type="submit">Cadastrar Prestador</button>
          </div>
        </form>
      </section>

      {/* Toolbar de Filtros */}
      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar prestador
            <input
              defaultValue={params.q ?? ""}
              name="q"
              placeholder="Razão social, nome fantasia, CNPJ, contato, fone..."
            />
          </label>

          <label>
            Categoria
            <select defaultValue={params.category ?? ""} name="category">
              <option value="">Todas as categorias</option>
              {supplierCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {supplierCategoryLabels[cat]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select defaultValue={params.status ?? "all"} name="status">
              <option value="all">Todos os status</option>
              <option value="active">Apenas ativos</option>
              <option value="blocked">Apenas bloqueados</option>
              <option value="inactive">Apenas inativos</option>
            </select>
          </label>

          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/suppliers">
            Limpar
          </Link>
        </form>
      </section>

      {/* Tabela de Listagem */}
      <section className="admin-section">
        <div className="section-heading">
          <div>
            <h2>Prestadores Cadastrados ({filteredSuppliers.length})</h2>
            <p className="section-description">
              Empresas prestadoras de serviços e fornecedores homologados para o condomínio.
            </p>
          </div>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum prestador encontrado</strong>
            <p>Nenhum registro corresponde aos filtros ou termos pesquisados.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prestador / Empresa</th>
                  <th>Contato & Documento</th>
                  <th>Regras de Acesso</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => {
                  const meta = parseSupplierMetadata(supplier.metadata);
                  const isBlocked = supplier.status === "blocked";
                  const scheduleLabel = formatAllowedSchedule(
                    supplier.allowed_time_start,
                    supplier.allowed_time_end
                  );
                  const weekdaysLabel = formatAllowedWeekdays(supplier.allowed_weekdays);

                  return (
                    <tr key={supplier.id}>
                      <td>
                        <strong>{supplier.name}</strong>
                        {supplier.trade_name ? (
                          <span style={{ color: "#64748b", display: "block", fontSize: "0.85rem" }}>
                            {supplier.trade_name}
                          </span>
                        ) : null}
                        <span
                          className="status-badge"
                          style={{
                            background: "#e0e7ff",
                            color: "#3730a3",
                            display: "inline-block",
                            fontSize: "0.75rem",
                            marginTop: "4px"
                          }}
                        >
                          {supplierCategoryLabels[supplier.category]}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "2px", fontSize: "0.85rem" }}>
                          {supplier.document ? (
                            <span>
                              📄 <strong>{supplier.document}</strong>
                            </span>
                          ) : null}
                          {supplier.contact_name ? (
                            <span>👤 {supplier.contact_name}</span>
                          ) : null}
                          {supplier.phone ? (
                            <span>📞 {supplier.phone}</span>
                          ) : null}
                          {supplier.email ? (
                            <span className="muted">✉️ {supplier.email}</span>
                          ) : null}
                          {!supplier.document && !supplier.contact_name && !supplier.phone && !supplier.email ? (
                            <span className="muted">Sem contato registrado</span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "3px", fontSize: "0.85rem" }}>
                          <span>
                            🗓️ <strong>{weekdaysLabel}</strong>
                          </span>
                          <span>
                            ⏰ <strong>{scheduleLabel}</strong>
                          </span>
                          {meta.contractNumber ? (
                            <span className="muted">Contrato: {meta.contractNumber}</span>
                          ) : null}
                          {meta.notes ? (
                            <small className="muted" style={{ margin: 0 }}>
                              📝 {meta.notes}
                            </small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            supplier.status === "active"
                              ? "active"
                              : supplier.status === "blocked"
                              ? "destructive"
                              : "inactive"
                          }`}
                        >
                          {supplierStatusLabels[supplier.status]}
                        </span>
                        {isBlocked && supplier.block_reason ? (
                          <small
                            style={{
                              color: "#be123c",
                              display: "block",
                              fontSize: "0.75rem",
                              marginTop: "2px"
                            }}
                          >
                            Motivo: {supplier.block_reason}
                          </small>
                        ) : null}
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {/* Botão Rápido de Bloqueio / Desbloqueio */}
                        <form
                          action={toggleSupplierStatusAction}
                          style={{ display: "inline-block", marginRight: "6px" }}
                        >
                          <input name="supplierId" type="hidden" value={supplier.id} />
                          <input
                            name="targetStatus"
                            type="hidden"
                            value={isBlocked ? "active" : "blocked"}
                          />
                          <button
                            className="secondary"
                            style={{
                              borderColor: isBlocked ? "#16a34a" : "#dc2626",
                              color: isBlocked ? "#16a34a" : "#dc2626",
                              minHeight: "30px",
                              padding: "0 8px"
                            }}
                            type="submit"
                          >
                            {isBlocked ? "Desbloquear" : "Bloquear"}
                          </button>
                        </form>

                        {/* Modal Inline de Edição */}
                        <details className="record-details">
                          <summary>Editar</summary>
                          <form action={updateSupplierAction} className="edit-supplier-form admin-form">
                            <input name="supplierId" type="hidden" value={supplier.id} />

                            <h3 style={{ margin: "0 0 10px" }}>Editar {supplier.name}</h3>

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
                              <label>
                                Razão Social *
                                <input defaultValue={supplier.name} name="name" required />
                              </label>

                              <label>
                                Nome Fantasia
                                <input defaultValue={supplier.trade_name ?? ""} name="tradeName" />
                              </label>

                              <label>
                                CNPJ / CPF
                                <input defaultValue={supplier.document ?? ""} name="document" />
                              </label>

                              <label>
                                Categoria *
                                <select defaultValue={supplier.category} name="category">
                                  {supplierCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {supplierCategoryLabels[cat]}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Contato / Responsável
                                <input defaultValue={supplier.contact_name ?? ""} name="contactName" />
                              </label>

                              <label>
                                Telefone
                                <input defaultValue={supplier.phone ?? ""} name="phone" />
                              </label>

                              <label>
                                E-mail
                                <input defaultValue={supplier.email ?? ""} name="email" type="email" />
                              </label>

                              <label>
                                Status
                                <select defaultValue={supplier.status} name="status">
                                  <option value="active">Ativo</option>
                                  <option value="inactive">Inativo</option>
                                  <option value="blocked">Bloqueado</option>
                                </select>
                              </label>

                              <label>
                                Horário Entrada
                                <input
                                  defaultValue={supplier.allowed_time_start}
                                  name="allowedTimeStart"
                                />
                              </label>

                              <label>
                                Horário Saída
                                <input
                                  defaultValue={supplier.allowed_time_end}
                                  name="allowedTimeEnd"
                                />
                              </label>

                              <label>
                                Nº do Contrato
                                <input defaultValue={meta.contractNumber ?? ""} name="contractNumber" />
                              </label>

                              <div style={{ gridColumn: "1 / -1" }}>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    marginBottom: "4px"
                                  }}
                                >
                                  Dias Permitidos
                                </span>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                  {[2, 3, 4, 5, 6, 7, 1].map((dayNum) => (
                                    <label
                                      key={dayNum}
                                      style={{
                                        alignItems: "center",
                                        display: "flex",
                                        flexDirection: "row",
                                        fontSize: "0.85rem",
                                        gap: "4px"
                                      }}
                                    >
                                      <input
                                        defaultChecked={supplier.allowed_weekdays.includes(dayNum)}
                                        name="allowedWeekdays"
                                        type="checkbox"
                                        value={dayNum}
                                      />
                                      <span>{weekdayLabels[dayNum]}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <label style={{ gridColumn: "1 / -1" }}>
                                Observações internas
                                <textarea defaultValue={meta.notes ?? ""} name="notes" rows={2} />
                              </label>
                            </div>

                            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                              <button style={{ flex: 1 }} type="submit">
                                Salvar Alterações
                              </button>
                            </div>
                          </form>
                        </details>

                        <DeleteSupplierButton
                          deleteAction={deleteSupplierAction}
                          supplierId={supplier.id}
                          supplierName={supplier.name}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
