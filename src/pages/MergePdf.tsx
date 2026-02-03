import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import { message, open } from "@tauri-apps/plugin-dialog";
import * as pdfJs from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readFile } from "@tauri-apps/plugin-fs";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";
import { animations } from "@formkit/drag-and-drop";
import { invoke } from "@tauri-apps/api/core";
import NoFilesYet from "../components/NoFilesYet";
import Loader from "../components/Loading";
import { Move } from "lucide-react";
pdfJs.GlobalWorkerOptions.workerSrc = workerSrc;

type SourcePdfMap = Record<
  string,
  {
    filename: string;
    pdf: pdfJs.PDFDocumentProxy;
    filepath: string;
  }
>;

type DraggablePage = {
  id: string;
  pdfId: string;
  pageNumber: number;
  selected: boolean;
};

const MergePdf = () => {
  const [sourcePdfs, setSourcePdfs] = useState<SourcePdfMap>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [parent, pages, setPages] = useDragAndDrop<
    HTMLDivElement,
    DraggablePage
  >([], {
    plugins: [animations()],
  });
  const openFilePicker = async () => {
    const paths = await takePath();
    if (!paths.length) return;

    const newSources: SourcePdfMap = {};
    const newPages: DraggablePage[] = [];

    for (const path of paths) {
      let activePath = path;

      try {
        const bytes = await readFile(activePath);
        const pdf = await pdfJs.getDocument({ data: bytes }).promise;
        const fileName = path.split(/[\\/]/).pop() ?? "Unknown.pdf";
        const pdfId = crypto.randomUUID();

        newSources[pdfId] = {
          filename: fileName,
          pdf,
          filepath: activePath, // Store the path that the backend should use
        };

        for (let i = 1; i <= pdf.numPages; i++) {
          newPages.push({
            id: crypto.randomUUID(),
            pdfId: pdfId,
            pageNumber: i,
            selected: true,
          });
        }
      } catch (err) {
        message(
          `Could not load ${path}. It might be corrupted or still protected.`,
        );
      }
    }

    // 4. Update state with all successfully processed files
    setSourcePdfs((prev) => ({ ...prev, ...newSources }));
    setPages((prev) => [...prev, ...newPages]);
  };
  const takePath = async () => {
    const paths = await open({
      multiple: true,
      filters: [{ name: "PDF files", extensions: ["pdf"] }],
    });
    return paths || [];
  };

  const mergePdfs = async () => {
    const pdfMapping: Record<string, string> = {};
    for (const [id, data] of Object.entries(sourcePdfs)) {
      pdfMapping[id] = data.filepath;
    }

    const processingPayload = pages
      .filter((p) => p.selected)
      .map((p) => ({
        sourcepdfid: p.pdfId,
        sourcePageNumber: p.pageNumber,
      }));

    try {
      setLoading(true);
      const result = await invoke("merge_pdf", {
        instructions: processingPayload,
        fileMap: pdfMapping,
      });
      setLoading(false);
      message(String(result));
      clearPdfs();
    } catch (error) {
      setLoading(false);
      clearPdfs();
    }
  };

  const toggleSelection = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, selected: !p.selected } : p)),
    );
  };

  const clearPdfs = () => {
    setSourcePdfs({});
    setPages([]);
  };

  const id = "merge-pdf";
  const tool: Tool | undefined = toolData.tools.find((tool) => tool.id === id);
  if (!tool) return <div className="p-4 text-red-500">Tool not found</div>;

  return (
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
      </div>

      <div className="flex gap-4 mb-6 w-full p-2 justify-center">
        <button
          type="button"
          onClick={openFilePicker}
          className="px-8 py-4 w-full 
            bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-all duration-300 border border-border text-md   lg:text-xl  "
        >
          Add PDF Files
        </button>
        <button
          onClick={mergePdfs}
          disabled={pages.length === 0}
          className="px-8 py-4 w-full  disabled:opacity-30 text-md   lg:text-xl  
            bg-emerald-500/10 disabled:text-emerald-500 hover:text-white disabled:hover:text-black hover:bg-emerald-500 disabled:bg-emerald-500/10 text-emerald-500
            font-semibold rounded-xl  transition-all duration-300 border border-border"
        >
          Merge Files
        </button>
        <button
          onClick={clearPdfs}
          disabled={pages.length === 0}
          className="px-6 py-3  w-full  text-xl disabled:opacity-50  font-semibold rounded-xl  border border-red-300 cursor-pointer text-md lg:text-xl"
        >
          Clear
        </button>
      </div>

      {pages.length > 0 && (
        <div
          ref={parent}
          className="grid  grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4  border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 "
        >
          {pages.map((page, index) => {
            const source = sourcePdfs[page.pdfId];
            if (!source) return null;

            return (
              <div
                onClick={() => toggleSelection(page.id)}
                key={page.id}
                className={`
    relative flex flex-col items-center gap-2 p-3
    rounded-lg border-2 transition-all bg-white
    ${page.selected ? "border-emerald-400 shadow-sm" : "border-gray-200 opacity-60 grayscale"}
  `}
              >
                {/* Drag handle */}
                <div
                  data-dnd-handle
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0 left-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 select-none"
                >
                  <Move />
                </div>

                {/* Checkbox */}
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    className="accent-emerald-500 w-5 h-5 cursor-pointer"
                    checked={page.selected}
                  />
                </div>

                {/* Thumbnail */}
                <div className="w-full flex justify-center">
                  <PdfPageThumbnail
                    pdf={source.pdf}
                    pageNumber={page.pageNumber}
                    scale={0.25}
                  />
                </div>

                {/* Text */}
                <div className="w-full text-center select-none">
                  <p className="text-[10px] text-gray-500 truncate px-1">
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

      {pages.length === 0 && <NoFilesYet />}
    </div>
  );
};

function PdfPageThumbnail({
  pdf,
  pageNumber,
  scale,
}: {
  pdf: pdfJs.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdf) return;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise;
      } catch (err) {
        console.error("Error rendering page thumbnail", err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full select-none   h-auto shadow-sm rounded  pointer-events-none"
    />
  );
}

export default MergePdf;
