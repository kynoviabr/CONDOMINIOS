"use client";

import type { ReactElement } from "react";

type DeleteUnitButtonProps = {
  deleteAction: (formData: FormData) => Promise<void> | void;
  unitId: string;
  unitLabel: string;
};

export function DeleteUnitButton({
  deleteAction,
  unitId,
  unitLabel
}: DeleteUnitButtonProps): ReactElement {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!window.confirm(`Deseja realmente remover a unidade ${unitLabel}?`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-block", marginLeft: "8px" }}
    >
      <input name="unitId" type="hidden" value={unitId} />
      <button
        className="secondary"
        style={{ minHeight: "32px", padding: "0 10px" }}
        type="submit"
      >
        Excluir
      </button>
    </form>
  );
}
