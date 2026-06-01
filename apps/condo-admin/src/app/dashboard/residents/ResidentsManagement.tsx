"use client";

import { residentStatuses, residentUnitRelationships } from "@kynovia/database";
import { useMemo, useState } from "react";
import {
  createResidentAction,
  deleteResidentAction,
  linkResidentUnitAction,
  unlinkResidentUnitAction,
  updateResidentAction
} from "./actions";

type UnitOption = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

type ResidentUnitLink = {
  id: string;
  isPrimary: boolean;
  relationship: string;
  unitId: string;
};

type ResidentListItem = {
  birthDate: string;
  blockReason: string | null;
  document: string | null;
  email: string | null;
  fullName: string;
  id: string;
  links: ResidentUnitLink[];
  notes: string;
  phone: string | null;
  status: string;
  whatsapp: string;
};

type ResidentsManagementProps = {
  condominiumId: string;
  query: string;
  residents: ResidentListItem[];
  selectedStatus: string;
  selectedUnitId: string;
  units: UnitOption[];
};

const pageSize = 10;

function optionLabel(value: string) {
  const labels: Record<string, string> = {
    active: "Ativo",
    blocked: "Bloqueado",
    dependent: "Dependente",
    inactive: "Inativo",
    owner: "Proprietário",
    resident: "Morador",
    tenant: "Inquilino"
  };

  return labels[value] ?? value;
}

function unitLabel(unit: UnitOption | undefined) {
  if (!unit) {
    return "Unidade removida";
  }

  return [unit.block ? `Bloco ${unit.block}` : null, `Unidade ${unit.number}`, unit.floor ? `Andar ${unit.floor}` : null]
    .filter(Boolean)
    .join(" · ");
}

function primaryUnitLabel(resident: ResidentListItem, unitsById: Map<string, UnitOption>) {
  const primaryLink = resident.links.find((link) => link.isPrimary) ?? resident.links[0];
  return primaryLink ? unitLabel(unitsById.get(primaryLink.unitId)) : "Sem unidade vinculada";
}

export function ResidentsManagement({
  condominiumId,
  query,
  residents,
  selectedStatus,
  selectedUnitId,
  units
}: ResidentsManagementProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState<{ type: "create" } | { type: "edit"; resident: ResidentListItem } | null>(null);
  const unitsById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);
  const pageCount = Math.max(Math.ceil(residents.length / pageSize), 1);
  const visibleResidents = useMemo(
    () => residents.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, residents]
  );
  const hasActiveFilter = Boolean(query || selectedStatus || selectedUnitId);

  function changePage(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), pageCount));
  }

  return (
    <>
      <section className="residents-toolbar">
        <form className="residents-search-form">
          <label>
            Buscar morador
            <input name="q" placeholder="Nome, CPF, telefone ou e-mail" defaultValue={query} />
          </label>
          <label>
            Unidade
            <select name="unitId" defaultValue={selectedUnitId}>
              <option value="">Todas as unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={selectedStatus}>
              <option value="">Todos</option>
              {residentStatuses.map((status) => (
                <option key={status} value={status}>
                  {optionLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Buscar</button>
          {hasActiveFilter ? (
            <a className="button-link secondary" href="/dashboard/residents">
              Limpar
            </a>
          ) : null}
        </form>
        <button type="button" onClick={() => setModal({ type: "create" })}>
          Adicionar morador
        </button>
      </section>

      <section className="residents-list-section">
        <div className="residents-list-heading">
          <div>
            <h2>Moradores cadastrados</h2>
            <p className="muted">
              {residents.length ? `${residents.length} morador(es) encontrados` : "Nenhum morador encontrado"}
            </p>
          </div>
          <span>
            Página {currentPage} de {pageCount}
          </span>
        </div>

        <div className="residents-list">
          <div className="residents-list-head" aria-hidden="true">
            <span>Morador</span>
            <span>Unidade</span>
            <span>Status</span>
            <span>Contato</span>
            <span>Ação</span>
          </div>
          {visibleResidents.map((resident) => (
            <button
              className="residents-list-row"
              type="button"
              key={resident.id}
              onClick={() => setModal({ type: "edit", resident })}
            >
              <span className="resident-main-cell">
                <strong>{resident.fullName}</strong>
                <small>{resident.document || "Documento não informado"}</small>
              </span>
              <span>{primaryUnitLabel(resident, unitsById)}</span>
              <span className={resident.status === "blocked" ? "resident-status blocked" : "resident-status"}>
                {optionLabel(resident.status)}
              </span>
              <span>{resident.phone || resident.whatsapp || resident.email || "Não informado"}</span>
              <span className="resident-open-cell">Abrir</span>
            </button>
          ))}
          {!visibleResidents.length ? (
            <div className="residents-empty-state">
              <h3>Nenhum morador encontrado</h3>
              <p>Ajuste a busca ou adicione o primeiro morador deste condomínio.</p>
            </div>
          ) : null}
        </div>

        <div className="residents-pagination" aria-label="Paginação de moradores">
          <button className="secondary" type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>
            Anterior
          </button>
          <span>
            {visibleResidents.length ? `${(currentPage - 1) * pageSize + 1}-${(currentPage - 1) * pageSize + visibleResidents.length}` : "0"}{" "}
            de {residents.length}
          </span>
          <button className="secondary" type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>
            Próxima
          </button>
        </div>
      </section>

      {modal ? (
        <div className="resident-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <aside
            aria-label={modal.type === "create" ? "Adicionar morador" : "Editar morador"}
            className="resident-modal resident-workspace-panel"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="resident-modal-header">
              <div>
                <span>{modal.type === "create" ? "Novo morador" : "Morador cadastrado"}</span>
                <h2>{modal.type === "create" ? "Adicionar morador" : modal.resident.fullName}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setModal(null)}>
                x
              </button>
            </div>

            <form className="admin-form resident-modal-form" action={modal.type === "create" ? createResidentAction : updateResidentAction}>
              <input name="condominiumId" type="hidden" value={condominiumId} />
              {modal.type === "edit" ? <input name="residentId" type="hidden" value={modal.resident.id} /> : null}
              <label className="resident-field-wide">
                Nome completo
                <input name="fullName" required defaultValue={modal.type === "edit" ? modal.resident.fullName : ""} placeholder="Maria Silva" />
              </label>
              <label>
                CPF
                <input name="document" required defaultValue={modal.type === "edit" ? modal.resident.document ?? "" : ""} placeholder="000.000.000-00" />
              </label>
              <label>
                Data de nascimento
                <input name="birthDate" type="date" defaultValue={modal.type === "edit" ? modal.resident.birthDate : ""} />
              </label>
              <label>
                Telefone
                <input name="phone" defaultValue={modal.type === "edit" ? modal.resident.phone ?? "" : ""} placeholder="(11) 99999-0000" />
              </label>
              <label>
                WhatsApp
                <input name="whatsapp" defaultValue={modal.type === "edit" ? modal.resident.whatsapp : ""} placeholder="(11) 99999-0000" />
              </label>
              <label className="resident-field-wide">
                E-mail
                <input name="email" type="email" defaultValue={modal.type === "edit" ? modal.resident.email ?? "" : ""} placeholder="morador@example.com" />
              </label>
              {modal.type === "create" ? (
                <>
                  <label>
                    Unidade
                    <select name="unitId" required defaultValue="">
                      <option value="" disabled>
                        Selecione uma unidade
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unitLabel(unit)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Relacionamento
                    <select name="relationship" defaultValue="resident">
                      {residentUnitRelationships.map((relationship) => (
                        <option key={relationship} value={relationship}>
                          {optionLabel(relationship)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <label>
                Status
                <select name="status" defaultValue={modal.type === "edit" ? modal.resident.status : "active"}>
                  {residentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {optionLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Motivo do bloqueio
                <input name="blockReason" defaultValue={modal.type === "edit" ? modal.resident.blockReason ?? "" : ""} placeholder="Obrigatório apenas se bloqueado" />
              </label>
              <label className="resident-field-wide">
                Observações
                <textarea name="notes" defaultValue={modal.type === "edit" ? modal.resident.notes : ""} placeholder="Observações internas sobre o morador" />
              </label>
              <button type="submit">{modal.type === "create" ? "Adicionar morador" : "Salvar alterações"}</button>
            </form>

            {modal.type === "edit" ? (
              <>
                <section className="resident-links-panel">
                  <h3>Unidades vinculadas</h3>
                  <form className="resident-link-form" action={linkResidentUnitAction}>
                    <input name="condominiumId" type="hidden" value={condominiumId} />
                    <input name="residentId" type="hidden" value={modal.resident.id} />
                    <select name="unitId" required defaultValue="">
                      <option value="" disabled>
                        Unidade
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unitLabel(unit)}
                        </option>
                      ))}
                    </select>
                    <select name="relationship" defaultValue="resident">
                      {residentUnitRelationships.map((relationship) => (
                        <option key={relationship} value={relationship}>
                          {optionLabel(relationship)}
                        </option>
                      ))}
                    </select>
                    <label className="checkbox-label">
                      <input name="isPrimary" type="checkbox" />
                      Principal
                    </label>
                    <button type="submit">Vincular</button>
                  </form>
                  <div className="resident-link-chips">
                    {modal.resident.links.map((link) => (
                      <form className="resident-link-chip" action={unlinkResidentUnitAction} key={link.id}>
                        <input name="condominiumId" type="hidden" value={condominiumId} />
                        <input name="residentUnitId" type="hidden" value={link.id} />
                        <span>
                          {unitLabel(unitsById.get(link.unitId))} · {optionLabel(link.relationship)}
                          {link.isPrimary ? " · principal" : ""}
                        </span>
                        <button className="secondary compact-button" type="submit">
                          Remover
                        </button>
                      </form>
                    ))}
                    {!modal.resident.links.length ? <p className="muted">Nenhuma unidade vinculada.</p> : null}
                  </div>
                </section>

                <form className="resident-modal-danger" action={deleteResidentAction}>
                  <input name="condominiumId" type="hidden" value={condominiumId} />
                  <input name="residentId" type="hidden" value={modal.resident.id} />
                  <button className="danger" type="submit">
                    Remover morador
                  </button>
                </form>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
