import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { ToolCard } from "../components/ToolCard";
import toolData from "../data/tools.json";
import Loader from "../components/Loading";
import { Tool } from "../types/tools";
import { Upload } from "lucide-react";

const ResizeImage = () => {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    percentage: 50,
  });
  const [mode, setMode] = useState<"dimensions" | "percentage">("percentage");

  const id = "resize-image";
  const tool: Tool | undefined = toolData.tools.find((t) => t.id === id);

  const handlePickImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });

    if (selected && typeof selected === "string") {
      setImagePath(selected);
      const bytes = await readFile(selected);
      const url = URL.createObjectURL(new Blob([bytes]));
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setDimensions((prev) => ({
          ...prev,
          width: img.width,
          height: img.height,
        }));
      };
      img.src = url;
    }
  };

  const handleResize = async () => {
    if (!imagePath) return;
    setLoading(true);
    try {
      await invoke("resize_image", {
        inputPath: imagePath,
        width: mode === "dimensions" ? dimensions.width : null,
        height: mode === "dimensions" ? dimensions.height : null,
        percentage: mode === "percentage" ? dimensions.percentage : null,
      });
      alert("Image resized successfully!");
    } catch (error) {
      alert("Error resizing image: " + error);
    } finally {
      setLoading(false);
    }
  };

  if (!tool) return null;

  return (
    <div className="w-full h-full lg:px-50 lg:py-20 p-10">
      {loading && <Loader label="Resizing Image..." />}

      <div className="flex flex-col items-center gap-8 ">
        <ToolCard hide={true} {...tool} />

        {!previewUrl ? (
          <button
            onClick={handlePickImage}
            className="w-full max-w-2xl aspect-video  border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-4
             hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
          >
            <div className="p-4 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors">
              <span className="text-2xl">
                <Upload />
              </span>
            </div>
            <span className="font-semibold text-gray-500">
              Click to select an image
            </span>
          </button>
        ) : (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            {/* Preview */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-gray-700">Preview</h3>
              <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="To resize"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-sm text-red-500 font-medium hover:underline "
              >
                Remove image
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-6">
              <h3 className="font-bold text-gray-700">Resize Settings</h3>

              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "percentage" ? "bg-white shadow-sm" : "text-gray-500"}`}
                  onClick={() => setMode("percentage")}
                >
                  Percentage
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "dimensions" ? "bg-white shadow-sm" : "text-gray-500"}`}
                  onClick={() => setMode("dimensions")}
                >
                  Dimensions
                </button>
              </div>

              {mode === "percentage" ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">
                      Scale percentage
                    </span>
                    <span className="text-blue-600 font-bold">
                      {dimensions.percentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={dimensions.percentage}
                    onChange={(e) =>
                      setDimensions({
                        ...dimensions,
                        percentage: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={dimensions.width}
                      onChange={(e) =>
                        setDimensions({
                          ...dimensions,
                          width: parseInt(e.target.value),
                        })
                      }
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={dimensions.height}
                      onChange={(e) =>
                        setDimensions({
                          ...dimensions,
                          height: parseInt(e.target.value),
                        })
                      }
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleResize}
                className="mt-auto w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200"
              >
                Resize & Save Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResizeImage;
