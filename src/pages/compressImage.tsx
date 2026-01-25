import { useState } from "react";
import { message, open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { ToolCard } from "../components/ToolCard";
import toolData from "../data/tools.json";
import Loader from "../components/Loading";
import { Tool } from "../types/tools";
import { Upload } from "lucide-react";

const PRESET_SIZES = [
  { label: "50 KB", value: 50 },
  { label: "100 KB", value: 100 },
  { label: "500 KB", value: 500 },
];

const CompressImage = () => {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [originalSizeKb, setOriginalSizeKb] = useState<number>(0);

  /* 🔹 Compression type */
  const [compressionType, setCompressionType] = useState<"lossy" | "lossless">(
    "lossless",
  );

  /* 🔹 Size selection */
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [presetSizeKb, setPresetSizeKb] = useState<number>(50);
  const [customValue, setCustomValue] = useState<number>(750);
  const [customUnit, setCustomUnit] = useState<"KB" | "MB">("KB");

  const tool: Tool | undefined = toolData.tools.find(
    (t) => t.id === "compress-image",
  );
  if (!tool) return null;

  const targetSizeKb =
    compressionType === "lossless"
      ? null
      : mode === "preset"
        ? presetSizeKb
        : customUnit === "MB"
          ? customValue * 1024
          : customValue;

  /* ================= PICK IMAGE ================= */

  const handlePickImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "tiff", "gif"],
        },
      ],
    });

    if (typeof selected === "string") {
      setImagePath(selected);
      const bytes = await readFile(selected);
      setOriginalSizeKb(Math.round(bytes.length / 1024));
      setPreviewUrl(URL.createObjectURL(new Blob([bytes])));
    }
  };

  /* ================= COMPRESS ================= */

  const handleCompress = async () => {
    if (!imagePath) return;

    if (
      compressionType === "lossy" &&
      targetSizeKb !== null &&
      targetSizeKb >= originalSizeKb
    ) {
      message("Target size must be smaller than the original image size.", {
        title: "Invalid compression size",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<string>("compress_image", {
        inputPath: imagePath,
        targetSize: targetSizeKb,
        mode: compressionType,
      });
      message(result, { title: "Success" });
    } catch (err) {
      message(String(err), { title: "Compression failed" });
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="w-full h-full lg:px-50 lg:py-20 p-10">
      {loading && <Loader label="Compressing Image..." />}

      <div className="flex flex-col items-center gap-8">
        <ToolCard hide {...tool} />
        {!previewUrl ? (
          <button
            onClick={handlePickImage}
            className="w-full max-w-2xl aspect-video border-2 border-dashed border-gray-200 rounded-3xl
              flex flex-col items-center justify-center gap-4 hover:border-blue-400
              hover:bg-blue-50/50 transition-all group"
          >
            <div className="p-4 bg-gray-100 rounded-full group-hover:bg-blue-100">
              <Upload />
            </div>
            <span className="font-semibold text-gray-500">
              Click to select an image
            </span>
          </button>
        ) : (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-3xl shadow-sm">
            {/* Preview */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-gray-700">Preview</h3>
              <div className="rounded-2xl overflow-hidden border bg-gray-50 aspect-square flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setImagePath(null);
                }}
                className="text-sm text-red-500 font-medium hover:underline"
              >
                Remove image
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-6">
              <h3 className="font-bold text-gray-700">Compression Settings</h3>

              {/* Compression Type */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={compressionType === "lossy"}
                    onChange={() => setCompressionType("lossy")}
                    className="accent-blue-600 mt-1"
                  />
                  <div>
                    <p className="font-medium">Smart (Lossy)</p>
                    <p className="text-xs text-gray-500">
                      Smaller size with minimal quality loss
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={compressionType === "lossless"}
                    onChange={() => setCompressionType("lossless")}
                    className="accent-blue-600 mt-1"
                  />
                  <div>
                    <p className="font-medium">Lossless</p>
                    <p className="text-xs text-gray-500">
                      Preserves colors & quality (size reduction limited)
                    </p>
                  </div>
                </label>
              </div>

              {/* Size Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-gray-50 p-4 border">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Original Size
                  </p>
                  <p className="font-bold">
                    {(originalSizeKb / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 border">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Target Size
                  </p>
                  <p className="font-bold text-blue-600">
                    {targetSizeKb
                      ? `${(targetSizeKb / 1024).toFixed(2)} MB`
                      : "Auto"}
                  </p>
                </div>
              </div>

              {/* Target Size */}
              {compressionType === "lossy" && (
                <div className="space-y-3">
                  {PRESET_SIZES.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer
                        ${
                          mode === "preset" && presetSizeKb === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      <input
                        type="radio"
                        checked={
                          mode === "preset" && presetSizeKb === opt.value
                        }
                        onChange={() => {
                          setMode("preset");
                          setPresetSizeKb(opt.value);
                        }}
                        className="accent-blue-600"
                      />
                      <span className="font-medium">{opt.label}</span>
                    </label>
                  ))}

                  <label
                    className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer
                      ${
                        mode === "custom"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={mode === "custom"}
                        onChange={() => setMode("custom")}
                        className="accent-blue-600"
                      />
                      <span className="font-medium">Custom size</span>
                    </div>

                    {mode === "custom" && (
                      <div className="flex gap-3">
                        <input
                          type="number"
                          min={10}
                          max={originalSizeKb - 1}
                          value={customValue}
                          onChange={(e) =>
                            setCustomValue(Number(e.target.value))
                          }
                          className="flex-1 rounded-lg border px-3 py-2"
                        />
                        <select
                          value={customUnit}
                          onChange={(e) =>
                            setCustomUnit(e.target.value as "KB" | "MB")
                          }
                          className="rounded-lg border px-3 py-2"
                        >
                          <option value="KB">KB</option>
                          <option value="MB">MB</option>
                        </select>
                      </div>
                    )}
                  </label>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Image format will be preserved. Final size may vary slightly.
              </p>

              <button
                onClick={handleCompress}
                className="mt-auto w-full py-4 bg-gray-900 text-white font-bold rounded-2xl
                  hover:bg-gray-800 transition-all"
              >
                Compress & Save Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompressImage;
