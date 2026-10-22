"use client";

import { useState } from "react";
import type { Client, ClientInput } from "@/lib/types";
import { ClientForm } from "./ClientForm";
import { AlertIcon, SpinnerIcon, TrashIcon } from "./icons";
import { Modal } from "./ui";

interface RecordDialogsProps {
  editing: Client | null;
  deleting: Client | null;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onSave: (id: string, input: ClientInput) => Promise<void>;
  onConfirmDelete: (id: string) => Promise<void>;
}

export function RecordDialogs({ editing, deleting, onCloseEdit, onCloseDelete, onSave, onConfirmDelete }: RecordDialogsProps) {
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await onConfirmDelete(deleting.id);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={Boolean(editing)}
        title="Edit Record"
        description={editing ? `Update the details for ${editing.name}.` : undefined}
        onClose={onCloseEdit}
      >
        {editing && (
          <ClientForm
            key={editing.id}
            initial={editing}
            submitLabel="Save Changes"
            onCancel={onCloseEdit}
            onSubmit={(input) => onSave(editing.id, input)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title="Delete Record"
        onClose={() => {
          if (!deletingBusy) {
            setDeleteError(null);
            onCloseDelete();
          }
        }}
        size="sm"
      >
        {deleting && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
              <AlertIcon size={18} className="mt-0.5 shrink-0" />
              <p>
                You are about to permanently delete <span className="font-bold">{deleting.name}</span> ({deleting.phone}).
                This cannot be undone.
              </p>
            </div>
            {deleteError && <p className="text-sm font-medium text-rose-600">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={onCloseDelete} disabled={deletingBusy}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={deletingBusy}>
                {deletingBusy ? <SpinnerIcon size={16} /> : <TrashIcon size={16} />}
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
