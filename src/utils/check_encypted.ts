
import * as pdfJs from "pdfjs-dist";
pdfJs.GlobalWorkerOptions.workerSrc = workerSrc;
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readFile } from "@tauri-apps/plugin-fs";

export async function checkEncrypted(path: string) {
  try {
    const bytes = await readFile(path);
    await pdfJs.getDocument({ data: bytes }).promise;
  } catch (err: any) {
    if (err.name === "PasswordException" && err.code === 1) {
      return true;
    }
    return false;
  }
}
