use lopdf::Document;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize)]
pub enum PdfResult {
    Message { message: String },
    TempPath { path: String },
}

pub async fn protect_pdf(
    app: AppHandle,
    input_path: String,
    password: String,
) -> Result<String, String> {
    if !std::path::Path::new(&input_path).exists() {
        return Err(format!("Input file not found at: {}", input_path));
    }

    let file_path = app
        .dialog()
        .file()
        .set_file_name("protected.pdf")
        .add_filter("PDF", &["pdf"][..])
        .blocking_save_file();

    let save_path = match file_path {
        Some(path) => path.into_path().map_err(|_| "Invalid path")?,
        _ => return Err("Cancelled".into()),
    };

    let save_path_str = save_path.to_string_lossy().to_string();
    let sidecar_name = "resources/binaries/qpdf";

    let sidecar = app.shell()
        .sidecar(sidecar_name)
        .map_err(|e| {
            let err = format!("[ERROR] Sidecar 'qpdf' not found in bundle. Check tauri.conf.json and binary names. Error: {}", e);
            println!("{}", err);
            err
        })?;

    let output = sidecar
        .args([
            "--encrypt",
            &password,
            &password,
            "256",
            "--",
            &input_path,
            &save_path_str,
        ])
        .output()
        .await
        .map_err(|e| format!("[ERROR] Failed to execute qpdf: {}", e))?;

    // 3. Detailed Status Check
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        println!("[DEBUG] QPDF Stderr: {}", stderr);
        println!("[DEBUG] QPDF Stdout: {}", stdout);
        return Err(format!(
            "QPDF Error (Code {:?}): {}",
            output.status.code(),
            stderr
        ));
    }

    Ok("PDF encrypted successfully".to_string())
}

pub async fn decrypt_pdf_service(
    app: AppHandle,
    input_path: String,
    password: String,
    temp: bool,
) -> Result<PdfResult, String> {
    let save_path: PathBuf = if temp {
        let mut path = app.path().temp_dir().map_err(|_| "Temp dir error")?;
        path.push("slice_pdf_decrypted.pdf");
        path
    } else {
        app.dialog()
            .file()
            .set_file_name("slice_pdf_decrypted.pdf")
            .add_filter("PDF", &["pdf"][..])
            .blocking_save_file()
            .ok_or("Save cancelled")?
            .into_path()
            .map_err(|_| "Invalid path")?
    };

    let save_path_str = save_path.to_string_lossy().to_string();

    // Use Sidecar for Decryption
    let output = app
        .shell()
        .sidecar("resources/binaries/qpdf")
        .map_err(|e| e.to_string())?
        .args([
            format!("--password={}", password),
            "--decrypt".to_string(),
            input_path,
            save_path_str.clone(),
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("invalid password") {
            return Err("Invalid password".into());
        }
        return Err(stderr.to_string());
    }

    // 🔥 VERIFY using lopdf (Optional but safe)
    let decrypted =
        Document::load(&save_path_str).map_err(|_| "Failed to read decrypted output")?;

    if decrypted.is_encrypted() {
        let _ = std::fs::remove_file(&save_path_str);
        return Err("File is still encrypted".into());
    }

    if temp {
        Ok(PdfResult::TempPath {
            path: save_path_str,
        })
    } else {
        Ok(PdfResult::Message {
            message: "PDF decrypted successfully".into(),
        })
    }
}
