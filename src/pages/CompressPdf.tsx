import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { message, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import Loader from "../components/Loading";
import SelectedFileCard from "../components/SelectedPdfCard";
import NoFilesYet from "../components/NoFilesYet";
import { checkEncrypted } from "../utils/check_encypted";
import { usePasswordUnlock } from "../contexts/UnlockPdfContext";
import { PdfResult } from "../types/PdfResult";

const CompressPdf = () => {
  const [loading, setLoading] = useState(false);
  const [inputPath, setInputPath] = useState<string | null>();
  const [fileName, setFileName] = useState<string>("Unknown.pdf");
  const { requestPassword } = usePasswordUnlock();
  const openFilePicker = async () => {
    const path = await takePath();
    if (!path) {
      return;
    } else if (path == null) {
      message("invalid path");
      return;
    }
    setInputPath(path);
    setFileName(path.split(/[\\/]/).pop() ?? "Unknown.pdf");
    const isEncrypted = await checkEncrypted(path);
    if (isEncrypted) {
      const password = await requestPassword();

      if (password == null) {
        clearPdf();
        return;
      }

      try {
        const result = await invoke<PdfResult>("decrypt_pdf", {
          inputPath: path,
          password,
          temp: true,
        });

        if ("Message" in result) {
          clearPdf();
          message(result.Message.message);
        }
      } catch (err) {
        message("Invalid Password");
        clearPdf();
      } finally {
        clearPdf();
      }
    }
  };
  const takePath = async () => {
    const path = await open({
      multiple: false,
      filters: [
        {
          name: "PDF Files",
          extensions: ["pdf"],
        },
      ],
    });
    if (typeof path === "string") {
      console.log(path);
      return path;
    }
    return null;
  };

  const clearPdf = () => {
    setInputPath(null);
    setFileName("");
  };

  const compressPdf = async () => {
    try {
      setLoading(true);
      const result = await invoke("compress_pdf", {
        inputPath,
      });
      alert(result);
    } catch (error) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const id = "compress-pdf";
  const tool: Tool | undefined = toolData.tools.find((tool) => tool.id === id);
  if (!tool) {
    return <div className="p-4 text-red-500">Tool not found</div>;
  }

  return (
    <>
      <div className="w-full h-full lg:px-50 lg:py-30 p-10">
        {loading && <Loader label="compressing" />}
        <div className="w-full flex flex-col items-center justify-center gap-5">
          <ToolCard
            hide={true}
            id={tool.id}
            title={tool?.title}
            description={tool.description}
            icon={tool.icon}
            color={tool.color}
            link={tool.link}
            tags={tool.tags}
            mascot={tool.mascot}
          />
          <button
            type="button"
            onClick={openFilePicker}
            className="px-8 py-4 w-full 
            bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all duration-300 border border-border text-xl"
          >
            Upload a File
          </button>

          {inputPath == null ? (
            <NoFilesYet />
          ) : (
            <>
              <SelectedFileCard fileName={fileName} />

              <button
                disabled={inputPath == null}
                type="button"
                onClick={compressPdf}
                className="px-8 py-4 w-full  disabled:opacity-30   text-xl  
            bg-blue-500/10  hover:text-white    text-primary
            font-semibold rounded-xl hover:bg-primary transition-all duration-300 border border-border"
              >
                Convert
              </button>
              <button
                onClick={clearPdf}
                disabled={inputPath == null}
                className="px-6 py-3  w-full  text-xl disabled:opacity-50  font-semibold rounded-xl  border border-red-300 cursor-pointer"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
      ;
    </>
  );
};

export default CompressPdf;
