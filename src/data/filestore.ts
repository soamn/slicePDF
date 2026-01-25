import { create } from "zustand";

type FileItem = {
  id: string;
  file: File;
  error?: string;
};

type FileStore = {
  files: FileItem[];
  add: (file: File) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useFileStore = create<FileStore>((set) => ({
  files: [],

  add: (file: File) =>
    set((state) => ({
      files: [
        ...state.files,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          progress: 0,
          status: "queued",
        } as FileItem,
      ],
    })),

  remove: (id: string) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  clear: () => set({ files: [] }),
}));
