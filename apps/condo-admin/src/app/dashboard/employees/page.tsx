import {
  employeeDepartmentLabels,
  employeeDepartments,
  employeeStatusLabels,
  formatShift,
  formatWorkdays,
  parseEmployeeMetadata,
  sanitizeEmployeeSearch,
  weekdayLabels
} from "@kynovia/database";
import type { EmployeeDepartment, EmployeeStatus } from "@kynovia/database";
import Link from "next/link";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  toggleEmployeeStatusAction,
  updateEmployeeAction
} from "./actions";
import { DeleteEmployeeButton } from "./DeleteEmployeeButton";
import { getCondoAdminContext } from "../../../lib/condominiums/context";
import { requireOperationalModuleAccess } from "../../../lib/operations/modules";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

type SearchParams = Promise<{
  department?: string;
  feedback?: string;
  q?: string;
  status?: string;
}>;

type Employee = {
  created_at: string;
  department: EmployeeDepartment;
  document: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  full_name: string;
  hire_date: string | null;
  id: string;
  metadata: unknown;
  phone: string | null;
  role_title: string;
  shift_end: string;
  shift_start: string;
  status: EmployeeStatus;
  workdays: number[];
};

export const dynamic = "force-dynamic";

const feedbackMessages: Record<string, { message: string; tone: "error" | "success" }> = {
  create_employee_failed: { message: "Não foi possível cadastrar o funcionário.", tone: "error" },
  delete_employee_failed: { message: "Não foi possível remover o funcionário.", tone: "error" },
  employee_activated: { message: "Funcionário marcado como ativo com sucesso.", tone: "success" },
  employee_created: { message: "Funcionário cadastrado com sucesso.", tone: "success" },
  employee_deleted: { message: "Funcionário removido com sucesso.", tone: "success" },
  employee_not_found: { message: "Funcionário não encontrado no condomínio ativo.", tone: "error" },
  employee_status_changed: { message: "Status do funcionário atualizado com sucesso.", tone: "success" },
  employee_updated: { message: "Dados do funcionário atualizados com sucesso.", tone: "success" },
  employee_vacation: { message: "Funcionário colocado em período de férias.", tone: "success" },
  invalid_status: { message: "Status informado é inválido.", tone: "error" },
  missing_employee_id: { message: "Funcionário não identificado.", tone: "error" },
  missing_employee_name: { message: "Informe o nome completo do funcionário.", tone: "error" },
  update_employee_failed: { message: "Não foi possível atualizar o funcionário.", tone: "error" }
};

export default async function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const context = requireOperationalModuleAccess(await getCondoAdminContext(), "employees");
  const params = await searchParams;
  const search = sanitizeEmployeeSearch(params.q ?? "").toLowerCase();
  const selectedDepartment = (params.department ?? "").trim();
  const selectedStatus = (params.status ?? "all").trim();
  const rawStatus = (params.feedback ?? "").trim();
  const feedback = rawStatus ? feedbackMessages[rawStatus] : undefined;

  const supabase = await createServerSupabaseClient();

  const { data: employeesData, error: employeesError } = await supabase
    .from("employees")
    .select(
      "id, full_name, document, role_title, department, phone, email, shift_start, shift_end, workdays, status, emergency_contact_name, emergency_contact_phone, hire_date, metadata, created_at"
    )
    .eq("tenant_id", context.profile.tenantId)
    .eq("condominium_id", context.condominium.id)
    .order("full_name", { ascending: true });

  const rawEmployees = (employeesData ?? []) as Employee[];

  // Metrics
  const totalEmployees = rawEmployees.length;
  const activeCount = rawEmployees.filter((e) => e.status === "active").length;
  const vacationCount = rawEmployees.filter((e) => e.status === "vacation").length;
  const inactiveCount = rawEmployees.filter(
    (e) => e.status === "inactive" || e.status === "terminated"
  ).length;

  // Filter
  const filteredEmployees = rawEmployees.filter((e) => {
    const meta = parseEmployeeMetadata(e.metadata);

    if (selectedDepartment && e.department !== selectedDepartment) {
      return false;
    }

    if (selectedStatus !== "all" && e.status !== selectedStatus) {
      return false;
    }

    if (search) {
      const matchName = e.full_name.toLowerCase().includes(search);
      const matchRole = e.role_title.toLowerCase().includes(search);
      const matchDoc = (e.document ?? "").toLowerCase().includes(search);
      const matchPhone = (e.phone ?? "").toLowerCase().includes(search);
      const matchEmail = (e.email ?? "").toLowerCase().includes(search);
      const matchBadge = (meta.badgeNumber ?? "").toLowerCase().includes(search);
      const matchNotes = (meta.notes ?? "").toLowerCase().includes(search);

      return (
        matchName ||
        matchRole ||
        matchDoc ||
        matchPhone ||
        matchEmail ||
        matchBadge ||
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
          <h1>Funcionários e Colaboradores</h1>
          <p className="muted">
            Quadro funcional, escalas, turnos e contatos de emergência do{" "}
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

      {employeesError ? (
        <section className="feedback destructive" role="alert">
          Falha ao carregar a lista de funcionários do condomínio.
        </section>
      ) : null}

      <section className="condo-overview">
        <div className="metric-card">
          <span>Total de Colaboradores</span>
          <strong>{totalEmployees}</strong>
        </div>
        <div className="metric-card">
          <span>Em Atividade (Ativos)</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="metric-card">
          <span>Em Férias</span>
          <strong style={{ color: vacationCount > 0 ? "#0284c7" : "inherit" }}>
            {vacationCount}
          </strong>
        </div>
        <div className="metric-card">
          <span>Inativos / Desligados</span>
          <strong>{inactiveCount}</strong>
        </div>
      </section>

      {/* Formulário de Novo Funcionário no Topo */}
      <section className="admin-section" style={{ marginBottom: "24px" }}>
        <h2>Novo Funcionário / Colaborador</h2>
        <p className="section-description">
          Cadastre um novo colaborador da equipe própria do condomínio ou terceirizado fixo.
        </p>

        <form action={createEmployeeAction} className="admin-form">
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
            }}
          >
            <label>
              Nome Completo *
              <input name="fullName" placeholder="Ex: Antônio Carlos Ferreira" required />
            </label>

            <label>
              Cargo / Função *
              <input name="roleTitle" placeholder="Ex: Zelador Geral, Porteiro Diurno" required />
            </label>

            <label>
              Departamento *
              <select defaultValue="general" name="department">
                {employeeDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {employeeDepartmentLabels[dept]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              CPF ou RG
              <input name="document" placeholder="000.000.000-00" />
            </label>

            <label>
              Telefone / WhatsApp
              <input name="phone" placeholder="(11) 97777-6666" />
            </label>

            <label>
              E-mail de Contato
              <input name="email" placeholder="colaborador@condominio.com" type="email" />
            </label>

            <label>
              Horário Início Turno
              <input defaultValue="08:00" name="shiftStart" placeholder="08:00" />
            </label>

            <label>
              Horário Fim Turno
              <input defaultValue="17:00" name="shiftEnd" placeholder="17:00" />
            </label>

            <label>
              Tipo de Escala
              <input name="shiftType" placeholder="Ex: 5x2, 6x1, 12x36" />
            </label>

            <label>
              Data de Admissão
              <input name="hireDate" type="date" />
            </label>

            <label>
              Nº Crachá / Matrícula
              <input name="badgeNumber" placeholder="Ex: ZEL-01, POR-04" />
            </label>

            <label>
              Tamanho Uniforme
              <input name="uniformSize" placeholder="Ex: M, G, GG" />
            </label>

            <label>
              Contato de Emergência (Nome)
              <input name="emergencyContactName" placeholder="Ex: Maria (Esposa)" />
            </label>

            <label>
              Contato de Emergência (Telefone)
              <input name="emergencyContactPhone" placeholder="(11) 97777-0000" />
            </label>

            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "8px" }}>
                Dias de Trabalho na Escala
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
                      name="workdays"
                      type="checkbox"
                      value={dayNum}
                    />
                    <span>{weekdayLabels[dayNum]}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={{ gridColumn: "1 / -1" }}>
              Observações internas e registros funcionais
              <textarea
                name="notes"
                placeholder="Detalhes adicionais sobre o colaborador, certificados, CNH..."
                rows={2}
              />
            </label>
          </div>

          <div>
            <button type="submit">Cadastrar Funcionário</button>
          </div>
        </form>
      </section>

      {/* Toolbar de Filtros */}
      <section className="toolbar">
        <form className="filter-form">
          <label>
            Buscar colaborador
            <input
              defaultValue={params.q ?? ""}
              name="q"
              placeholder="Nome, cargo, CPF, telefone, crachá..."
            />
          </label>

          <label>
            Departamento
            <select defaultValue={params.department ?? ""} name="department">
              <option value="">Todos os departamentos</option>
              {employeeDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {employeeDepartmentLabels[dept]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select defaultValue={params.status ?? "all"} name="status">
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="vacation">Em Férias</option>
              <option value="inactive">Inativos</option>
              <option value="terminated">Desligados</option>
            </select>
          </label>

          <button type="submit">Filtrar</button>
          <Link className="button-link secondary" href="/dashboard/employees">
            Limpar
          </Link>
        </form>
      </section>

      {/* Tabela de Listagem */}
      <section className="admin-section">
        <div className="section-heading">
          <div>
            <h2>Quadro de Colaboradores ({filteredEmployees.length})</h2>
            <p className="section-description">
              Equipe do condomínio, cargos, escalas de trabalho e informações operacionais.
            </p>
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum funcionário encontrado</strong>
            <p>Nenhum registro corresponde aos filtros ou termos pesquisados.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Colaborador & Cargo</th>
                  <th>Contato & Emergência</th>
                  <th>Escala & Turno</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const meta = parseEmployeeMetadata(employee.metadata);
                  const isVacation = employee.status === "vacation";
                  const shiftLabel = formatShift(employee.shift_start, employee.shift_end);
                  const workdaysLabel = formatWorkdays(employee.workdays);

                  return (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.full_name}</strong>
                        <span style={{ color: "#334155", display: "block", fontSize: "0.85rem", fontWeight: 500 }}>
                          {employee.role_title}
                        </span>
                        <span
                          className="status-badge"
                          style={{
                            background: "#e0f2fe",
                            color: "#0369a1",
                            display: "inline-block",
                            fontSize: "0.75rem",
                            marginTop: "4px"
                          }}
                        >
                          {employeeDepartmentLabels[employee.department]}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "2px", fontSize: "0.85rem" }}>
                          {employee.document ? (
                            <span>
                              📄 <strong>{employee.document}</strong>
                            </span>
                          ) : null}
                          {employee.phone ? <span>📞 {employee.phone}</span> : null}
                          {employee.email ? <span className="muted">✉️ {employee.email}</span> : null}
                          {employee.emergency_contact_name ? (
                            <span style={{ color: "#c2410c", fontSize: "0.8rem", marginTop: "2px" }}>
                              🆘 {employee.emergency_contact_name} ({employee.emergency_contact_phone ?? "sem fone"})
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: "3px", fontSize: "0.85rem" }}>
                          <span>
                            🗓️ <strong>{workdaysLabel}</strong>
                          </span>
                          <span>
                            ⏰ <strong>{shiftLabel}</strong> {meta.shiftType ? `(${meta.shiftType})` : ""}
                          </span>
                          {meta.badgeNumber ? (
                            <span className="muted">Crachá: {meta.badgeNumber}</span>
                          ) : null}
                          {employee.hire_date ? (
                            <small className="muted" style={{ margin: 0 }}>
                              Admissão: {new Date(employee.hire_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            </small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            employee.status === "active"
                              ? "active"
                              : employee.status === "vacation"
                              ? "inactive"
                              : "destructive"
                          }`}
                          style={
                            employee.status === "vacation"
                              ? { background: "#e0f2fe", color: "#0369a1" }
                              : undefined
                          }
                        >
                          {employeeStatusLabels[employee.status]}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {/* Botão Rápido de Férias / Ativar */}
                        <form
                          action={toggleEmployeeStatusAction}
                          style={{ display: "inline-block", marginRight: "6px" }}
                        >
                          <input name="employeeId" type="hidden" value={employee.id} />
                          <input
                            name="targetStatus"
                            type="hidden"
                            value={isVacation ? "active" : "vacation"}
                          />
                          <button
                            className="secondary"
                            style={{
                              borderColor: isVacation ? "#16a34a" : "#0284c7",
                              color: isVacation ? "#16a34a" : "#0284c7",
                              minHeight: "30px",
                              padding: "0 8px"
                            }}
                            type="submit"
                          >
                            {isVacation ? "Retornar" : "Férias"}
                          </button>
                        </form>

                        {/* Modal Inline de Edição */}
                        <details className="record-details">
                          <summary>Editar</summary>
                          <form action={updateEmployeeAction} className="edit-employee-form admin-form">
                            <input name="employeeId" type="hidden" value={employee.id} />

                            <h3 style={{ margin: "0 0 10px" }}>Editar {employee.full_name}</h3>

                            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
                              <label>
                                Nome Completo *
                                <input defaultValue={employee.full_name} name="fullName" required />
                              </label>

                              <label>
                                Cargo / Função *
                                <input defaultValue={employee.role_title} name="roleTitle" required />
                              </label>

                              <label>
                                Departamento *
                                <select defaultValue={employee.department} name="department">
                                  {employeeDepartments.map((dept) => (
                                    <option key={dept} value={dept}>
                                      {employeeDepartmentLabels[dept]}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                CPF ou RG
                                <input defaultValue={employee.document ?? ""} name="document" />
                              </label>

                              <label>
                                Telefone
                                <input defaultValue={employee.phone ?? ""} name="phone" />
                              </label>

                              <label>
                                E-mail
                                <input defaultValue={employee.email ?? ""} name="email" type="email" />
                              </label>

                              <label>
                                Status
                                <select defaultValue={employee.status} name="status">
                                  <option value="active">Ativo</option>
                                  <option value="vacation">Em Férias</option>
                                  <option value="inactive">Inativo</option>
                                  <option value="terminated">Desligado</option>
                                </select>
                              </label>

                              <label>
                                Início Turno
                                <input defaultValue={employee.shift_start} name="shiftStart" />
                              </label>

                              <label>
                                Fim Turno
                                <input defaultValue={employee.shift_end} name="shiftEnd" />
                              </label>

                              <label>
                                Data de Admissão
                                <input defaultValue={employee.hire_date ?? ""} name="hireDate" type="date" />
                              </label>

                              <label>
                                Contato Emergência (Nome)
                                <input
                                  defaultValue={employee.emergency_contact_name ?? ""}
                                  name="emergencyContactName"
                                />
                              </label>

                              <label>
                                Contato Emergência (Fone)
                                <input
                                  defaultValue={employee.emergency_contact_phone ?? ""}
                                  name="emergencyContactPhone"
                                />
                              </label>

                              <label>
                                Nº Crachá
                                <input defaultValue={meta.badgeNumber ?? ""} name="badgeNumber" />
                              </label>

                              <label>
                                Tamanho Uniforme
                                <input defaultValue={meta.uniformSize ?? ""} name="uniformSize" />
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
                                  Dias de Trabalho
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
                                        defaultChecked={employee.workdays.includes(dayNum)}
                                        name="workdays"
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

                        <DeleteEmployeeButton
                          deleteAction={deleteEmployeeAction}
                          employeeId={employee.id}
                          employeeName={employee.full_name}
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
