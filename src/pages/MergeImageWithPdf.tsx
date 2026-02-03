import { message, open } from "@tauri-apps/plugin-dialog";
import * as pdfJs from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readFile } from "@tauri-apps/plugin-fs";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";
import { animations } from "@formkit/drag-and-drop";
import { invoke } from "@tauri-apps/api/core";
import { ToolCard } from "../components/ToolCard";
import { Tool } from "../types/tools";
import toolData from "../data/tools.json";
import Loader from "../components/Loading";

pdfJs.GlobalWorkerOptions.workerSrc = workerSrc;

type SourceFileMap = Record<
  string,
  {
    filename: string;
    filepath: string;
    type: "pdf" | "image";
    pdf?: pdfJs.PDFDocumentProxy;
    imageUrl?: string;
  }
>;

type DraggablePage = {
  id: string;
  fileId: string;
  pageNumber: number;
  type: "pdf" | "image";
  selected: boolean;
};

const MergeImageWithPdf = () => {
  const [sourceFiles, setSourceFiles] = useState<SourceFileMap>({});
  const [loading, setLoading] = useState(false);

  const [parent, pages, setPages] = useDragAndDrop<
    HTMLDivElement,
    DraggablePage
  >([], { plugins: [animations()] });

  const openFilePicker = async (mode: "pdf" | "image") => {
    const paths = await open({
      multiple: true,
      filters:
        mode === "pdf"
          ? [{ name: "PDF", extensions: ["pdf"] }]
          : [{ name: "Images", extensions: ["jpg", "png", "jpeg"] }],
    });

    if (!paths) return;

    const newSources: SourceFileMap = {};
    const newPages: DraggablePage[] = [];

    for (const path of paths) {
      let activePath = path;
      const fileId = crypto.randomUUID();
      const fileName = path.split(/[\\/]/).pop() ?? "file";

      if (mode === "pdf") {
        const bytes = await readFile(activePath);
        const pdf = await pdfJs.getDocument({ data: bytes }).promise;
        newSources[fileId] = {
          filename: fileName,
          filepath: activePath,
          type: "pdf",
          pdf,
        };

        for (let i = 1; i <= pdf.numPages; i++) {
          newPages.push({
            id: crypto.randomUUID(),
            fileId,
            pageNumber: i,
            type: "pdf",
            selected: true,
          });
        }
      } else {
        // Image logic remains untouched
        const bytes = await readFile(path);
        const imageUrl = URL.createObjectURL(new Blob([bytes]));
        newSources[fileId] = {
          filename: fileName,
          filepath: path,
          type: "image",
          imageUrl,
        };
        newPages.push({
          id: crypto.randomUUID(),
          fileId,
          pageNumber: 1,
          type: "image",
          selected: true,
        });
      }
    }
    setSourceFiles((prev) => ({ ...prev, ...newSources }));
    setPages((prev) => [...prev, ...newPages]);
  };

  const toggleSelection = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)),
    );
  };

  const runMerge = async () => {
    const fileMap: Record<string, string> = {};
    Object.entries(sourceFiles).forEach(
      ([id, data]) => (fileMap[id] = data.filepath),
    );

    const instructions = pages
      .filter((p) => p.selected)
      .map((p) => ({
        fileId: p.fileId,
        pageNumber: p.pageNumber,
        kind: p.type,
      }));
    setLoading(true);
    try {
      await invoke("merge_all", { instructions, fileMap });
      message("Successfully merged!");
    } catch (e) {
      setLoading(false);
      message("Error: " + e);
    } finally {
      setLoading(false);
    }
  };
  const clearAll = () => {
    Object.values(sourceFiles).forEach((file) => {
      if (file.imageUrl) {
        URL.revokeObjectURL(file.imageUrl);
      }
    });
    setSourceFiles({});
    setPages([]);
  };
  const id = "merge-image-with-pdf";
  const tool: Tool | undefined = toolData.tools.find((tool) => tool.id === id);
  if (!tool) return <div className="p-4 text-red-500">Tool not found</div>;

  return (
    <div className="w-full h-full lg:px-50 lg:py-30 p-10">
      {loading && <Loader label="Merging files" />}
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
          onClick={() => openFilePicker("pdf")}
          className="px-6 py-3  text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 border border-border"
        >
          Add PDF
        </button>
        <button
          onClick={() => openFilePicker("image")}
          className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 border border-border"
        >
          Add Image
        </button>
        <button
          onClick={runMerge}
          disabled={pages.filter((p) => p.selected).length === 0}
          className="px-8 py-4  disabled:opacity-30 
            bg-sky-500/10 disabled:text-sky-500 hover:text-white disabled:hover:text-sky-500 hover:bg-sky-800 disabled:bg-blue-500/10 text-sky-500
            font-semibold rounded-xl transition-all duration-300 border border-border"
        >
          Merge & Save ({pages.filter((p) => p.selected).length})
        </button>
        <button
          onClick={clearAll}
          disabled={pages.length === 0}
          className="px-6 py-3   text-xl disabled:opacity-50  font-semibold rounded-xl  border border-red-300 cursor-pointer "
        >
          Clear
        </button>
      </div>

      {pages.length > 0 ? (
        <div
          ref={parent}
          className="grid grid-cols-6 gap-4 p-4 border-2 border-dashed draggable-container  border-gray-200 rounded-xl bg-gray-50/50"
        >
          {pages.map((page, index) => {
            const source = sourceFiles[page.fileId];
            if (!source) return null;

            return (
              <div
                key={page.id}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all group bg-white
                  ${page.selected ? "border-sky-400 shadow-sm" : "border-gray-200 opacity-60 grayscale"}
                `}
              >
                {/* Checkbox Overlay */}
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    className="accent-sky-500 w-5 h-5 cursor-pointer"
                    checked={page.selected}
                    onChange={() => toggleSelection(page.id)}
                  />
                </div>

                {/* Thumbnail Area */}
                <div
                  className="cursor-grab active:cursor-grabbing w-full flex justify-center  items-center bg-gray-100 rounded overflow-hidden"
                  onClick={() => toggleSelection(page.id)}
                >
                  {page.type === "pdf" ? (
                    <PdfPageThumbnail
                      scale={0.25}
                      pdf={source.pdf!}
                      pageNumber={page.pageNumber}
                    />
                  ) : (
                    <img
                      src={source.imageUrl}
                      draggable={false}
                      className="object-contain  h-full w-full "
                      alt="preview"
                    />
                  )}
                </div>

                {/* Info Area */}
                <div className="w-full text-center">
                  <p
                    className="text-[10px] text-gray-500 truncate px-1"
                    title={source.filename}
                  >
                    {source.filename}
                  </p>
                  <p className="text-xs font-bold text-gray-700 uppercase">
                    {page.type} - Pg {page.pageNumber}
                    <span className="ml-1 text-gray-400 font-normal">
                      ({index + 1})
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-20 text-gray-400 border-2 border-dashed rounded-xl">
          Drop or upload files to begin merging.
        </div>
      )}
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
      className="max-w-full h-auto shadow-sm rounded bg-gray-100"
    />
  );
}

export default MergeImageWithPdf;
