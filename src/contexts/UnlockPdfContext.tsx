// src/contexts/UnlockPdfContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface PasswordContextType {
  requestPassword: () => Promise<string | null>;
}

// 1. Export the context itself (for rare cases)
export const PasswordUnlockContext = createContext<PasswordContextType | null>(
  null,
);

// 2. The Provider
export const UnlockPdfProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolver, setResolver] = useState<
    ((val: string | null) => void) | null
  >(null);
  const [value, setValue] = useState("");

  const requestPassword = () => {
    setIsOpen(true);
    setValue("");
    return new Promise<string | null>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    resolver?.(value);
    setIsOpen(false);
  };

  return (
    <PasswordUnlockContext.Provider value={{ requestPassword }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-90 space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold">
              This PDF is encrypted. Enter the password to continue.
            </h2>
            <input
              type="text"
              placeholder="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
            <div className="flex justify-end gap-3 pt-3">
              <button
                disabled={value === ""}
                className="text-sm px-3 py-1 disabled:bg-emerald-50 disabled:text-black text-emerald-400 hover:bg-emerald-400 hover:text-white rounded-md "
                onClick={handleConfirm}
              >
                Unlock
              </button>
              <button
                onClick={() => {
                  resolver?.(null);
                  setIsOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PasswordUnlockContext.Provider>
  );
};

// 3. The Hook (In the SAME file to guarantee it uses the SAME context)
export const usePasswordUnlock = () => {
  const context = useContext(PasswordUnlockContext);
  if (!context)
    throw new Error(
      "usePasswordUnlock must be used within an UnlockPdfProvider",
    );
  return context;
};
