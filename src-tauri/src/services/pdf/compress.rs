use jpeg_encoder::{ColorType, Encoder};
use lopdf::{Document, Object};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

pub async fn compress_pdf(app: AppHandle, input_path: String) -> Result<(), String> {
    // Save dialog FIRST (UI thread)
    let save_path = app
        .dialog()
        .file()
        .set_file_name("compressed_by_slice_pdf.pdf")
        .blocking_save_file()
        .ok_or("Save cancelled")?
        .into_path()
        .map_err(|_| "Invalid path")?;

    // Heavy work off the UI thread
    tauri::async_runtime::spawn_blocking(move || {
        let mut doc = Document::load(&input_path).map_err(|e| format!("Load error: {}", e))?;

        for (_, obj) in doc.objects.iter_mut() {
            let Object::Stream(stream) = obj else {
                continue;
            };

            let data = stream.content.clone();
            let Ok(img) = image::load_from_memory(&data) else {
                continue;
            };

            let resized = img.resize(
                img.width() / 2,
                img.height() / 2,
                image::imageops::FilterType::Lanczos3,
            );

            let mut encoded = Vec::new();
            let encoder = Encoder::new(&mut encoded, 65);

            let rgb = resized.to_rgb8();
            encoder
                .encode(
                    rgb.as_raw(),
                    resized.width() as u16,
                    resized.height() as u16,
                    ColorType::Rgb,
                )
                .ok();

            stream.set_content(encoded);
            stream.dict.set("Filter", "DCTDecode");
            stream.dict.set("ColorSpace", "DeviceRGB");
            stream.dict.set("BitsPerComponent", 8);
            stream.dict.set("Width", resized.width() as i64);
            stream.dict.set("Height", resized.height() as i64);
        }

        doc.compress();
        doc.save(save_path).map_err(|e| e.to_string())?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(())
}
