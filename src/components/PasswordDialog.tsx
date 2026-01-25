import { useState } from "react";

export const PasswordDialog = ({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (user: string, owner: string) => void;
}) => {
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [separateOwner, setSeparateOwner] = useState(false);

  if (!open) return null;

  const effectiveOwnerPassword = separateOwner ? ownerPassword : userPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Protect PDF</h2>

        {/* User password */}
        <div className="mb-3">
          <label className="text-sm font-medium">User Password</label>
          <input
            type="text"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {separateOwner
              ? "Permissions: Read & Print only"
              : "Permissions: Read, Create, Modify & Print"}
          </p>
        </div>

        {/* Separate owner checkbox */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={separateOwner}
            onChange={(e) => setSeparateOwner(e.target.checked)}
          />
          <span className="text-sm">Use separate owner password</span>
        </div>

        {/* Owner password */}
        {separateOwner && (
          <div className="mb-3">
            <label className="text-sm font-medium">Owner Password</label>
            <input
              type="text"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Owner has full permissions
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">
            Cancel
          </button>
          <button
            disabled={!userPassword || (separateOwner && !ownerPassword)}
            onClick={() => onConfirm(userPassword, effectiveOwnerPassword)}
            className="px-4 py-2 rounded-lg text-warm-foreground hover:bg-warm-foreground hover:text-white  disabled:opacity-50"
          >
            Encrypt
          </button>
        </div>
      </div>
    </div>
  );
};
