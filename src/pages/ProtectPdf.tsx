import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import SelectedPdfCard from "../components/SelectedPdfCard";
import { checkEncrypted } from "../utils/check_encypted";
import { PasswordDialog } from "../components/PasswordDialog";
import { usePasswordUnlock } from "../contexts/UnlockPdfContext";
import { PdfResult } from "../types/PdfResult";
import Loader from "../components/Loading";
import NoFilesYet from "../components/NoFilesYet";

const ProtectPdf = () => {
  const [inputPath, setInputPath] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { requestPassword } = usePasswordUnlock();

  const openFilePicker = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (path === null) {
      clearPdf();
      alert("Upload Failed");
      return;
    }
    setInputPath(path);
    setFileName(path.split(/[\\/]/).pop() ?? "Unknown.pdf");
    const isEncrypted = await checkEncrypted(path);
    if (isEncrypted) {
      setShowDialog(false);
      const password = await requestPassword();
      if (password == null) {
        return;
      }

      try {
        const result = await invoke<PdfResult>("decrypt_pdf", {
          inputPath: path,
          password,
          temp: true,
        });

        if ("TempPath" in result) {
          const tempPath = result.TempPath.path;
          setInputPath(tempPath);
        }
        if ("Message" in result) {
          alert(result.Message.message);
        }
      } catch (err) {
        alert("Invalid Password");
        clearPdf();
        return;
      }
    }
    setShowDialog(true);

    return;
  };

  const clearPdf = () => {
    setInputPath("");
    setFileName(null);
  };
  const encryptPdf = async (password: string) => {
    setLoading(true);
    try {
      const result = await invoke("protect_pdf", {
        inputPath,
        password,
      });

      setShowDialog(false);
      alert(result);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const id = "protect-pdf";
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

        <PasswordDialog
          open={showDialog}
          onClose={() => {
            clearPdf();
            setShowDialog(false);
          }}
          onConfirm={encryptPdf}
        />
      </div>
    </div>
  );
};

export default ProtectPdf;
