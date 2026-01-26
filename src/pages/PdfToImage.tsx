import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { message, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import NoFilesYet from "../components/NoFilesYet";
import SelectedFileCard from "../components/SelectedPdfCard";
import Loader from "../components/Loading";
import { checkEncrypted } from "../utils/check_encypted";
import { usePasswordUnlock } from "../contexts/UnlockPdfContext";
import { PdfResult } from "../types/PdfResult";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readFile } from "@tauri-apps/plugin-fs";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type ImageFormat = "png" | "jpg" | "webp";

const PdfToImage = () => {
  const [inputPath, setInputPath] = useState<string | null>();
  const [fileName, setFileName] = useState<string>("Unknown.pdf");
  const [format, setFormat] = useState<ImageFormat>("png");
  const [loading, setLoading] = useState<boolean>(false);
  const { requestPassword } = usePasswordUnlock();

  const formats: { value: ImageFormat; label: string; desc: string }[] = [
    { value: "png", label: "PNG", desc: "Best quality, larger size" },
    { value: "jpg", label: "JPG", desc: "Smaller size, lossy" },
    { value: "webp", label: "WEBP", desc: "Modern, efficient" },
  ];
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
          message(result.Message.message);
        }
      } catch (err) {
        message("Invalid Password");
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
      return path;
    }
    return null;
  };

  const convertToImage = async () => {
    if (!inputPath) return;

    setLoading(true);
    try {
      // 1. Ask Rust to let the user pick a folder and give us the path back
      const outputDir = await invoke<string | null>("pick_output_folder", {
        fileName: fileName,
      });
      if (!outputDir) {
        setLoading(false);
        return;
      }

      // 2. Read the PDF file into bytes so pdf.js can use it
      const fileBytes = await readFile(inputPath);
      const pdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;

      // 3. Loop through pages and render
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0; // Adjust for quality (2.0 = High Res)
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport, canvas })
          .promise;

        // 4. Convert canvas to Blob based on your selected format
        const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) {
                resolve(b);
              } else {
                reject(new Error("Canvas to Blob conversion failed"));
              }
            },
            mimeType,
            0.95,
          );
        });
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // 5. Send bytes to Rust to save
        await invoke("save_rendered_page", {
          buffer: Array.from(uint8Array), // Tauri IPC accepts arrays
          pageIndex: i,
          outputDir,
          extension: format,
        });
      }

      message(`Successfully converted ${pdf.numPages} pages!`);
    } catch (error) {
      console.error(error);
      message("Conversion failed: " + error);
    } finally {
      setLoading(false);
    }
  };

  const clearPdf = () => {
    setInputPath(null);
    setFileName("");
  };

  const id = "pdf-to-image";
  const tool: Tool | undefined = toolData.tools.find((tool) => tool.id === id);
  if (!tool) {
    return <div className="p-4 text-red-500">Tool not found</div>;
  }
  useEffect(() => {
    const done = listen<string>("pdf-to-img", (e) => {
      setLoading(false);
      message(e.payload);
      clearPdf();
    });
    const error = listen<string>("pdf-to-img-err", (_e) => {
      setLoading(false);
      clearPdf();
      message("Failed To convert");
    });
    return () => {
      done.then((f) => f());
      error.then((f) => f());
    };
  }, []);

  return (
    <>
      <div className="w-full h-full lg:px-50 lg:py-30 p-10">
        {loading && <Loader label="Converting Pdf to Images" />}
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

              <div className="grid grid-cols-3 gap-4 w-full ">
                {formats.map((f) => (
                  <label
                    key={f.value}
                    className={`
        relative cursor-pointer rounded-xl  w-full border-2 p-4 transition-all

        ${
          format === f.value
            ? "border-primary bg-primary/5 shadow"
            : "border-border hover:border-primary/50"
        }
      `}
                  >
                    <input
                      type="radio"
                      name="image-format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={() => setFormat(f.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer "
                    />

                    <div className="flex flex-col gap-1 ">
                      <span className="font-semibold text-sm">{f.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {f.desc}
                      </span>
                    </div>

                    {format === f.value && (
                      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary" />
                    )}
                  </label>
                ))}
              </div>

              <button
                disabled={inputPath == null}
                type="button"
                onClick={convertToImage}
                className="px-8 py-4 w-full  disabled:opacity-30   text-xl  
            bg-blue-500/10 disabled:text-primary hover:text-white disabled:hover:text-black  disabled:bg-blue-500/10 text-primary
            font-semibold rounded-xl hover:bg-primary/80 transition-all duration-300 border border-border"
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
export default PdfToImage;
