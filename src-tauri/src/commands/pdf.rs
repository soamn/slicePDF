use crate::services::pdf::{
    compress, merge, protect, rotate, MergeInstruction, MergePageInstruction, PdfResult,
    RotatePageInstructions,
};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn pick_output_folder(
    app: tauri::AppHandle,
    file_name: String,
) -> Result<Option<String>, String> {
    let stem = std::path::Path::new(&file_name)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "output".to_string());

    // In Tauri v2, we can use blocking_pick_folder for simplicity in async commands
    let folder = app.dialog().file().blocking_pick_folder();

    if let Some(path_buf) = folder {
        let final_path = path_buf.into_path().map_err(|e| e.to_string())?.join(stem);
        fs::create_dir_all(&final_path).map_err(|e| e.to_string())?;
        return Ok(Some(final_path.to_string_lossy().to_string()));
    }

    Ok(None)
}

#[tauri::command]
pub async fn save_rendered_page(
    buffer: Vec<u8>,
    page_index: usize,
    output_dir: String,
    extension: String,
) -> Result<(), String> {
    let file_path = PathBuf::from(output_dir).join(format!("page-{}.{}", page_index, extension));

    fs::write(file_path, buffer).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn merge_pdf(
    app: tauri::AppHandle,
    instructions: Vec<MergePageInstruction>,
    file_map: HashMap<String, String>,
) -> Result<String, String> {
    merge::merge_pdfs(app, instructions, file_map).await
}

#[tauri::command]
pub async fn merge_all(
    app: tauri::AppHandle,
    instructions: Vec<MergeInstruction>,
    file_map: HashMap<String, String>,
) -> Result<String, String> {
    merge::merge_all(app, instructions, file_map)
        .await
        .map(|_| "Merged Successfully".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn compress_pdf(app: tauri::AppHandle, input_path: String) -> Result<String, String> {
    compress::compress_pdf(app, input_path)
        .await
        .map(|_| "PDF pages compressed Successfully".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rotate_pdf_pages(
    app: tauri::AppHandle,
    instructions: Vec<RotatePageInstructions>,
) -> Result<String, String> {
    rotate::rotate_pdf(app, instructions)
        .await
        .map(|_| "PDF pages rotated Successfully".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn protect_pdf(
    app: tauri::AppHandle,
    input_path: String,
    password: String,

) -> Result<String, String> {
    protect::protect_pdf(app, input_path, password)
        .await
        .map(|_| "PDF Encrypted Successfully".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn decrypt_pdf(
    app: tauri::AppHandle,
    input_path: String,
    password: String,
    temp: bool,
) -> Result<PdfResult, String> {
    protect::decrypt_pdf_service(app, input_path, password, temp)
        .await
        .map_err(|e| e.to_string())
}
