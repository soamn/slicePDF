import { useState } from "react";

export const PasswordDialog = ({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (user: string) => void;
}) => {
  const [password, setPassword] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Protect PDF</h2>

        {/* User password */}
        <div className="mb-3">
          <label className="text-sm font-medium"> Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">
            Cancel
          </button>
          <button
            disabled={!password}
            onClick={() => onConfirm(password)}
            className="px-4 py-2 rounded-lg text-warm-foreground hover:bg-warm-foreground hover:text-white  disabled:opacity-50"
          >
            Encrypt
          </button>
        </div>
      </div>
    </div>
  );
};
