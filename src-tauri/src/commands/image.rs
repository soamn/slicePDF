use crate::services::image as image_service;
use caesium::parameters::{CSParameters, ChromaSubsampling};
use caesium::{compress, compress_to_size};
use std::path::Path;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn resize_image(
    app: tauri::AppHandle,
    input_path: String,
    width: Option<u32>,
    height: Option<u32>,
    percentage: Option<f32>,
) -> Result<(), String> {
    let input = Path::new(&input_path);

    let ext = input
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("Invalid input image")?;

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid input image")?;

    let save_path = app
        .dialog()
        .file()
        .set_file_name(format!("{}_resized_by_slicePDF.{}", stem, ext))
        .add_filter("Image", &[ext][..])
        .blocking_save_file();

    let output_path = match save_path {
        Some(path) => path.into_path().map_err(|_| "Invalid path")?,
        _none => return Err("Cancelled".into()),
    };

    tauri::async_runtime::spawn_blocking(move || {
        image_service::resize_image_service(&input_path, &output_path, width, height, percentage)
            .map_err(|e| e.to_string())?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(())
}
#[tauri::command]
pub async fn compress_image(
    app: tauri::AppHandle,
    input_path: String,
    target_size: Option<usize>,
    mode: String, // "lossy" | "lossless"
) -> Result<String, String> {
    let mut params = CSParameters::new();

    // ---- Quality presets (safe defaults) ----
    params.jpeg.quality = 75;
    params.jpeg.chroma_subsampling = ChromaSubsampling::CS420;
    params.jpeg.optimize = true;
    params.jpeg.progressive = true;
    params.jpeg.preserve_icc = true;

    params.webp.lossless = mode == "lossless";
    params.webp.quality = if mode == "lossy" { 90 } else { 100 };

    let input = Path::new(&input_path);

    let ext = input
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("Invalid input image")?;

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid input image")?;
    // ---- Ask save location ----
    let save_path = app
        .dialog()
        .file()
        .set_file_name(format!("{}_compressed_by_slicePDF.{}", stem, ext))
        .blocking_save_file()
        .ok_or("Cancelled")?
        .into_path()
        .map_err(|_| "Invalid path")?;

    let output = save_path.to_str().ok_or("Invalid output path")?.to_string();

    // ---- Compression ----
    let result = match mode.as_str() {
        "lossy" => {
            let size = target_size.ok_or("Target size required for lossy mode")?;
            compress_to_size(input_path.clone(), output.clone(), &mut params, size, true)
        }
        "lossless" => compress(input_path.clone(), output.clone(), &params),
        _ => return Err("Invalid compression mode".to_string()),
    };

    result.map_err(|e| format!("Compression failed: {}", e))?;

    Ok(format!("Image compressed successfully:\n{}", output))
}
