import { ToolCard } from "../components/ToolCard";
import toolData from "../data/tools.json";
import { message, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import { useState, useEffect } from "react";
import NoFilesYet from "../components/NoFilesYet";
import Loader from "../components/Loading";

interface ImagePreview {
  path: string;
  src: string; 
  name: string;
}

const ImageToPdf = () => {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Helper to clear URLs from memory
  const revokeUrls = (items: ImagePreview[]) => {
    items.forEach((item) => {
      if (item.src.startsWith("blob:")) {
        URL.revokeObjectURL(item.src);
      }
    });
  };

  const openFilePicker = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        { name: "Images", extensions: ["jpg", "png", "webp", "jpeg", "svg"] },
      ],
    });

    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];

      setLoading(true);
      try {
        const newItems = await Promise.all(
          paths.map(async (path) => {
            const bytes = await readFile(path);
            const blob = new Blob([bytes]);
            const src = URL.createObjectURL(blob);
            return {
              path,
              src,
              name: path.split(/[\\/]/).pop() || "image",
            };
          }),
        );

        // Append to existing array
        setPreviews((prev) => [...prev, ...newItems]);
      } catch (err) {
        console.error("Failed to read files:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAll = () => {
    revokeUrls(previews);
    setPreviews([]);
  };

  const removeImage = (index: number) => {
    const itemToRemove = previews[index];
    URL.revokeObjectURL(itemToRemove.src);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (previews.length === 0) return;

    // We no longer call 'await save()' here because the Rust backend
    // now handles the dialog via app.dialog().file().save_file()

    setLoading(true);
    try {
      let result: string;

      if (previews.length === 1) {
        // Rust expects: input_path: String, file_name: String
        result = await invoke("image_to_pdf", {
          inputPath: previews[0].path,
          fileName: previews[0].name,
        });
      } else {
        // Rust expects: input_paths: Vec<String>, file_name: String
        result = await invoke("convert_images_to_pdf", {
          inputPaths: previews.map((p) => p.path),
          fileName: "merged_images.pdf", // Default name for the dialog
        });
      }

      message(result); // This will show the "Success: PDF created..." message from Rust
      clearAll();
    } catch (e) {
      // If the user cancels the dialog, Rust returns "Save cancelled" as an Err
      if (e !== "Save cancelled") {
        message("Error: " + e);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => revokeUrls(previews);
  }, [previews]);

  const tool = toolData.tools.find((t) => t.id === "image-to-pdf");

  return (
    <div className="w-full h-full lg:px-50 lg:py-10 p-10">
      {loading && <Loader label="Processing Images..." />}

      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <ToolCard hide={true} {...tool!} />

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={openFilePicker}
            className="bg-secondary p-4 rounded-xl border border-border font-semibold hover:bg-secondary/80 transition-all"
          >
            Add Images
          </button>
          <button
            onClick={clearAll}
            disabled={previews.length === 0}
            className="border border-red-300 rounded-xl text-red-500 font-semibold disabled:opacity-30 transition-all"
          >
            Clear All
          </button>
        </div>

        {previews.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 rounded-2xl bg-muted/20 border border-border overflow-y-auto max-h-[50vh]">
              {previews.map((file, i) => (
                <div
                  key={i}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-white shadow-sm"
                >
                  <img
                    src={file.src}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ✕
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[9px] text-white truncate">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConvert}
              className="w-full py-4 bg-warm text-white rounded-2xl font-bold text-xl hover:shadow-lg transition-all active:scale-[0.98]"
            >
              Convert {previews.length} Images to PDF
            </button>
          </div>
        ) : (
          <NoFilesYet />
        )}
      </div>
    </div>
  );
};

export default ImageToPdf;
