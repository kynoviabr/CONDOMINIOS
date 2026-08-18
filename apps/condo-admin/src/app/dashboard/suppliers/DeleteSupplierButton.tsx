"use client";

import type { ReactElement } from "react";

type DeleteSupplierButtonProps = {
  deleteAction: (formData: FormData) => Promise<void> | void;
  supplierId: string;
  supplierName: string;
};

export function DeleteSupplierButton({
  deleteAction,
  supplierId,
  supplierName
}: DeleteSupplierButtonProps): ReactElement {
  return (
    <form
      action={deleteAction}
      onSubmit={(e) => {
        if (!window.confirm(`Deseja realmente remover o prestador "${supplierName}"?`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-block", marginLeft: "6px" }}
    >
      <input name="supplierId" type="hidden" value={supplierId} />
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
