use crate::services::pdf::{
    compress, conversion, merge, protect, rotate, MergeInstruction, MergePageInstruction,
    OutputFormat, PdfResult, RotatePageInstructions,
};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Emitter as _;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn pdf_to_img(
    app: tauri::AppHandle,
    input_path: String,
    format: OutputFormat,
) -> Result<(), String> {
    let input_path_clone = input_path.clone();
    app.dialog().file().pick_folder(move |folder| {
        let base_output_dir = match folder {
            Some(path) => match path.into_path() {
                Ok(p) => p,
                Err(_) => return,
            },
            _none => return,
        };

        tauri::async_runtime::spawn_blocking(move || {
            let input = std::path::Path::new(&input_path_clone);

            let stem = match input.file_stem() {
                Some(s) => s.to_string_lossy().to_string(),
                _none => return,
            };

            let output_dir: PathBuf = base_output_dir.join(stem);

            if let Err(_e) = fs::create_dir_all(&output_dir) {
                return;
            }
            match conversion::pdf_to_img(&app, input_path, &output_dir, format) {
                Ok(msg) => {
                    let _ = app.emit("pdf-to-img", msg);
                }
                Err(e) => {
                    let _ = app.emit("pdf-to-img-err", e.to_string());
                }
            }
        });
    });
    Ok(())
}

#[tauri::command]
pub fn image_to_pdf(
    app: tauri::AppHandle,
    input_path: String,
    file_name: String,
) -> Result<(), String> {
    let app_clone = app.clone();
    let base_name = Path::new(&file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    app.dialog()
        .file()
        .set_file_name(base_name)
        .add_filter("PDF", &["pdf"][..])
        .save_file(move |file| {
            let save_path: PathBuf = match file {
                Some(path) => match path.into_path() {
                    Ok(p) => p,
                    Err(_) => {
                        let _ = app_clone.emit("img-to-pdf-error", "Invalid save path");
                        return;
                    }
                },
                _name => {
                    let _ = app_clone.emit("img-to-pdf-cancelled", "Save cancelled");
                    return;
                }
            };

            tauri::async_runtime::spawn_blocking(move || {
                let input = Path::new(&input_path);

                match conversion::img_to_pdf(input, &save_path) {
                    Ok(_) => {
                        let _ = app_clone.emit(
                            "img-to-pdf-done",
                            format!("Image converted to PDF: {}", save_path.display()),
                        );
                    }
                    Err(e) => {
                        let _ = app_clone.emit("img-to-pdf-error", e.to_string());
                    }
                }
            });
        });

    // Command returns immediately (as designed)
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
    user_password: String,
    owner_password: String,
) -> Result<String, String> {
    println!("{}", input_path);
    protect::protect_pdf(app, input_path, user_password, owner_password)
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
