"use client";

import { useMemo, useState } from "react";
import { createUnitAction, deleteUnitAction, updateUnitAction } from "../actions";

type UnitListItem = {
  block: string | null;
  floor: string | null;
  id: string;
  number: string;
};

type UnitsManagementProps = {
  condominiumId: string;
  query: string;
  units: UnitListItem[];
};

const pageSize = 10;

function unitLabel(unit: UnitListItem) {
  const block = unit.block ? `Bloco ${unit.block}` : "Sem bloco";
  const floor = unit.floor ? `Andar ${unit.floor}` : "Sem andar";

  return `${block} · Unidade ${unit.number} · ${floor}`;
}

export function UnitsManagement({ condominiumId, query, units }: UnitsManagementProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, setModal] = useState<{ type: "create" } | { type: "edit"; unit: UnitListItem } | null>(null);
  const pageCount = Math.max(Math.ceil(units.length / pageSize), 1);
  const visibleUnits = useMemo(
    () => units.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, units]
  );

  function changePage(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), pageCount));
  }

  return (
    <>
      <section className="units-toolbar">
        <form className="units-search-form">
          <label>
            Buscar unidade
            <input name="q" placeholder="Bloco, número ou andar" defaultValue={query} />
          </label>
          <button type="submit">Buscar</button>
          {query ? (
            <a className="button-link secondary" href="/dashboard/units">
              Limpar
            </a>
          ) : null}
        </form>
        <button type="button" onClick={() => setModal({ type: "create" })}>
          Adicionar unidade
        </button>
      </section>

      <section className="units-list-section">
        <div className="units-list-heading">
          <div>
            <h2>Unidades cadastradas</h2>
            <p className="muted">
              {units.length ? `${units.length} unidade(s) encontradas` : "Nenhuma unidade encontrada"}
            </p>
          </div>
          <span>
            Página {currentPage} de {pageCount}
          </span>
        </div>

        <div className="units-list">
          <div className="units-list-head" aria-hidden="true">
            <span>Unidade</span>
            <span>Bloco</span>
            <span>Andar</span>
            <span>Ação</span>
          </div>
          {visibleUnits.map((unit) => (
            <button className="units-list-row" type="button" key={unit.id} onClick={() => setModal({ type: "edit", unit })}>
              <span className="unit-main-cell">
                <strong>Unidade {unit.number}</strong>
                <small>{unitLabel(unit)}</small>
              </span>
              <span>{unit.block || "Não informado"}</span>
              <span>{unit.floor || "Não informado"}</span>
              <span className="unit-open-cell">Abrir</span>
            </button>
          ))}
          {!visibleUnits.length ? (
            <div className="units-empty-state">
              <h3>Nenhuma unidade encontrada</h3>
              <p>Ajuste a busca ou adicione a primeira unidade deste condomínio.</p>
            </div>
          ) : null}
        </div>

        <div className="units-pagination" aria-label="Paginação de unidades">
          <button className="secondary" type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>
            Anterior
          </button>
          <span>
            {visibleUnits.length ? `${(currentPage - 1) * pageSize + 1}-${(currentPage - 1) * pageSize + visibleUnits.length}` : "0"} de{" "}
            {units.length}
          </span>
          <button className="secondary" type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>
            Próxima
          </button>
        </div>
      </section>

      {modal ? (
        <div className="unit-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <aside
            aria-label={modal.type === "create" ? "Adicionar unidade" : "Editar unidade"}
            className="unit-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="unit-modal-header">
              <div>
                <span>{modal.type === "create" ? "Nova unidade" : "Unidade cadastrada"}</span>
                <h2>{modal.type === "create" ? "Adicionar unidade" : `Unidade ${modal.unit.number}`}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setModal(null)}>
                x
              </button>
            </div>

            <form className="admin-form unit-modal-form" action={modal.type === "create" ? createUnitAction : updateUnitAction}>
              <input type="hidden" name="condominiumId" value={condominiumId} />
              {modal.type === "edit" ? <input type="hidden" name="unitId" value={modal.unit.id} /> : null}
              <label>
                Bloco
                <input name="block" defaultValue={modal.type === "edit" ? modal.unit.block ?? "" : ""} placeholder="A" />
              </label>
              <label>
                Número
                <input name="number" required defaultValue={modal.type === "edit" ? modal.unit.number : ""} placeholder="101" />
              </label>
              <label>
                Andar
                <input name="floor" defaultValue={modal.type === "edit" ? modal.unit.floor ?? "" : ""} placeholder="1" />
              </label>
              <button type="submit">{modal.type === "create" ? "Adicionar unidade" : "Salvar alterações"}</button>
            </form>

            {modal.type === "edit" ? (
              <form className="unit-modal-danger" action={deleteUnitAction}>
                <input type="hidden" name="condominiumId" value={condominiumId} />
                <input type="hidden" name="unitId" value={modal.unit.id} />
                <button className="danger" type="submit">
                  Remover unidade
                </button>
              </form>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
