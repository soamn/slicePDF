import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { message, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import * as pdfJs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readFile } from "@tauri-apps/plugin-fs";
import Loader from "../components/Loading";
import NoFilesYet from "../components/NoFilesYet";
import SelectedFileCard from "../components/SelectedPdfCard";

pdfJs.GlobalWorkerOptions.workerSrc = workerSrc;

type SourcePdfMap = Record<
  string,
  {
    filename: string;
    pdf: pdfJs.PDFDocumentProxy;
    filepath: string;
  }
>;
type RotatablePage = {
  id: string;
  pdfId: string;
  pageNumber: number;
  rotation: number;
};
const RotatePdfPages = () => {
  const [loading, setLoading] = useState(false);
  const [sourcePdfs, setSourcePdfs] = useState<SourcePdfMap>({});
  const [pages, setPages] = useState<RotatablePage[]>([]);
  const [fileName, setFileName] = useState<string>("Unknown.pdf");

  const openFilePicker = async () => {
    if (Object.keys(sourcePdfs).length >= 1) {
      await clearPdf();
    }
    const path = await takePath();
    const newSources: SourcePdfMap = {};
    const newPages: RotatablePage[] = [];
    if (path === null) return;
    setFileName(path.split(/[\\/]/).pop() ?? "Unknown.pdf");
    const bytes = await readFile(path);
    let pdf = null;
    try {
      pdf = await pdfJs.getDocument({ data: bytes }).promise;
    } catch (err: any) {
      if (err.name === "PasswordException" && err.code === 1) {
        message("PDF is password protected ! Use the unlocked version ");
        return;
      }
    }
    if (pdf == null) return;
    const fileName = path.split(/[\\/]/).pop() ?? "Unknown.pdf";
    const pdfId = crypto.randomUUID();

    newSources[pdfId] = {
      filename: fileName,
      pdf,
      filepath: path,
    };
    for (let i = 1; i <= pdf.numPages; i++) {
      newPages.push({
        id: crypto.randomUUID(),
        pdfId: pdfId,
        pageNumber: i,
        rotation: 0,
      });
    }
    setSourcePdfs((prev) => ({ ...prev, ...newSources }));
    setPages((prev) => [...prev, ...newPages]);
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
    return path;
  };

  const rotatePage = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
      ),
    );
  };
  const rotatePdf = async () => {
    setLoading(true);
    let filepath = "";
    Object.values(sourcePdfs).forEach((value) => {
      filepath = value.filepath;
    });

    const processingPayload = pages
      .filter((p) => p.rotation !== 0)
      .map((p) => ({
        sourcepdfid: p.pdfId,
        pagenumber: p.pageNumber,
        rotation: p.rotation,
        filepath,
      }));

    try {
      const result = await invoke("rotate_pdf_pages", {
        instructions: processingPayload,
      });

      message(String(result));
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const clearPdf = async () => {
    setSourcePdfs({});
    setPages([]);
    setFileName("");
  };

  const id = "rotate-pdf";
  const tool: Tool | undefined = toolData.tools.find((tool) => tool.id === id);
  if (!tool) {
    return <div className="p-4 text-red-500">Tool not found</div>;
  }

  return (
    <>
      <div className="w-full h-full lg:px-50 lg:py-30 p-10">
        {loading && <Loader label="merging" />}
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

          <div className="flex gap-4 mb-6 w-full p-2 justify-center">
            <button
              type="button"
              onClick={openFilePicker}
              className="px-8 py-4 w-full 
            bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all duration-300 border border-border text-md    "
            >
              Upload a File
            </button>
            <button
              onClick={rotatePdf}
              disabled={pages.length === 0}
              className="px-8 py-4 w-full  disabled:opacity-30 text-md   
            bg-emerald-500/10 disabled:text-emerald-500 hover:text-white  hover:bg-emerald-500 disabled:bg-emerald-500/10 text-emerald-500
            font-semibold rounded-xl  transition-all duration-300 border border-border"
            >
              Confirm Rotations
            </button>
            <button
              onClick={clearPdf}
              disabled={pages.length === 0}
              className="px-6 py-3  w-full  text-xl disabled:opacity-50  font-semibold rounded-xl  border border-red-300 cursor-pointer text-md "
            >
              Clear
            </button>
          </div>
          {pages.length === 0 ? (
            <NoFilesYet />
          ) : (
            <>
              <SelectedFileCard fileName={fileName} />
              {pages.length > 0 && (
                <div className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 ">
                  {pages.map((page, index) => {
                    const source = sourcePdfs[page.pdfId];
                    if (!source) return null;

                    return (
                      <div
                        key={page.id}
                        className={`
                  relative flex flex-col items-center gap-2 p-3 border-warm rounded-lg border-2 transition-all group bg-white
                `}
                      >
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={() => rotatePage(page.id)}
                            className="text-warm w-5 h-5 cursor-pointer"
                          >
                            🔄
                          </button>
                        </div>

                        <div className="  w-full flex justify-center">
                          <PdfPageThumbnail
                            pdf={source.pdf}
                            pageNumber={page.pageNumber}
                            scale={0.25}
                            rotation={page.rotation}
                          />
                        </div>

                        <div className="w-full text-center">
                          <p
                            className="text-[10px] text-gray-500 truncate px-1"
                            title={source.filename}
                          >
                            {source.filename}
                          </p>
                          <p className="text-xs font-bold text-gray-700">
                            Pg {page.pageNumber}{" "}
                            <span className="text-gray-400 font-normal">
                              ({index + 1})
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      ;
    </>
  );
};

function PdfPageThumbnail({
  pdf,
  pageNumber,
  scale,
  rotation,
}: {
  pdf: pdfJs.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdf) return;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        // Correct way to handle rotation:
        // page.rotate is the built-in property for the PDF's default orientation
        const totalRotation = (page.rotate + rotation) % 360;

        const viewport = page.getViewport({
          scale,
          rotation: totalRotation,
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
      } catch (err) {
        console.error("Error rendering page thumbnail", err);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale, rotation]); // Re-renders when 'rotation' state changes

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto shadow-sm rounded bg-gray-100 transition-all duration-200"
    />
  );
}

export default RotatePdfPages;
