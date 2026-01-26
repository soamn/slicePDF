import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { message, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import SelectedPdfCard from "../components/SelectedPdfCard";
import { checkEncrypted } from "../utils/check_encypted";
import { usePasswordUnlock } from "../contexts/UnlockPdfContext";
import { PdfResult } from "../types/PdfResult";
import Loader from "../components/Loading";
import NoFilesYet from "../components/NoFilesYet";

const DecryptPdf = () => {
  const [inputPath, setInputPath] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { requestPassword } = usePasswordUnlock();

  const openFilePicker = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (path === null) {
      clearPdf();
      message("Upload Failed");
      return;
    }
    setInputPath(path);
    setFileName(path.split(/[\\/]/).pop() ?? "Unknown.pdf");
    const isEncrypted = await checkEncrypted(path);
    if (isEncrypted) {
      const password = await requestPassword();
      if (password == null) {
        return;
      }

      try {
        setLoading(true);
        const result = await invoke<PdfResult>("decrypt_pdf", {
          inputPath: path,
          password,
          temp: false,
        });
        if ("Message" in result) {
          message(result.Message.message);
        }
      } catch (err) {
        message("Invalid Password");
      } finally {
        clearPdf();
        setLoading(false);
        return;
      }
    } else {
      message("PDF is Already Unlocked");
      clearPdf();
    }
    return;
  };
  const clearPdf = () => {
    setInputPath("");
    setFileName(null);
  };
  const id = "decrypt-pdf";
  const tool: Tool | undefined = toolData.tools.find((t) => t.id === id);
  if (!tool) return <div>Tool not found</div>;

  return (
    <div className="w-full h-full lg:px-50 lg:py-30 p-10">
      {loading && <Loader label="Encrypting" />}
      <div className="w-full flex flex-col items-center justify-center gap-5">
        <ToolCard hide={true} {...tool} />
        <button
          onClick={openFilePicker}
          className="px-8 py-4 w-full 
            bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all duration-300 border border-border text-xl"
        >
          Upload PDF
        </button>
        {fileName && (
          <>
            <button
              onClick={clearPdf}
              disabled={inputPath == null}
              className="px-6 py-3  w-full  text-xl disabled:opacity-50  font-semibold rounded-xl  border border-red-300 cursor-pointer"
            >
              Clear
            </button>
            <SelectedPdfCard fileName={fileName} />
          </>
        )}
        {!fileName && <NoFilesYet />}
      </div>
    </div>
  );
};

export default DecryptPdf;
