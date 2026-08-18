"use client";

import type { ReactElement } from "react";

type DeleteEmployeeButtonProps = {
  deleteAction: (formData: FormData) => Promise<void> | void;
  employeeId: string;
  employeeName: string;
};

export function DeleteEmployeeButton({
  deleteAction,
  employeeId,
  employeeName
}: DeleteEmployeeButtonProps): ReactElement {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!window.confirm(`Deseja realmente remover o colaborador "${employeeName}"?`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-block", marginLeft: "6px" }}
    >
      <input name="employeeId" type="hidden" value={employeeId} />
      <button
        className="secondary"
        style={{ minHeight: "30px", padding: "0 8px" }}
        type="submit"
      >
        Excluir
      </button>
    </form>
  );
}
