import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { useUploadDeletion } from "../store/use-upload-deletion";
import { DeleteUploadModal } from "./delete-upload-modal";

export function UploadDeletionDialog() {
  const { upload, open } = useUploadDeletion();
  const [pending, setPending] = useState(false);
  const client = useQueryClient();
  const close = () => useUploadDeletion.setState({ open: false });
  const confirm = async () => {
    if (!upload || pending) return;
    setPending(true);
    try {
      await axios.delete(`/api/media-assets/${upload.id}?permanent=true`);
      close();
      await Promise.all([
        client.invalidateQueries({ queryKey: ["media-assets"] }),
        client.invalidateQueries({ queryKey: ["media-storage-usage"] }),
        client.invalidateQueries({ queryKey: ["upload-availability"] }),
      ]);
    } catch { toast.error("Unable to delete this upload. Please try again."); }
    finally { setPending(false); }
  };
  return upload ? <DeleteUploadModal id={upload.id} name={upload.fileName} source={upload.url} open={open} pending={pending} onClose={close} onConfirm={() => void confirm()} /> : null;
}
