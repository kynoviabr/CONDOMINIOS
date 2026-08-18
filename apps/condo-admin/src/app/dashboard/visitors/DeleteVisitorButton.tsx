"use client";

import type { ReactElement } from "react";

type DeleteVisitorButtonProps = {
  deleteAction: (formData: FormData) => Promise<void> | void;
  entityName: string;
  idFieldName: "visitorId" | "visitorVehicleId";
  idValue: string;
  label?: string;
};

export function DeleteVisitorButton({
  deleteAction,
  entityName,
  idFieldName,
  idValue,
  label = "Excluir"
}: DeleteVisitorButtonProps): ReactElement {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!window.confirm(`Deseja realmente remover "${entityName}"?`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-block", marginLeft: "4px" }}
    >
      <input name={idFieldName} type="hidden" value={idValue} />
      <button
        className="secondary"
        style={{ minHeight: "28px", padding: "0 6px" }}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
