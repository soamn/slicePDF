use lopdf::Document;
use serde::Serialize;
use std::process::Command;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
pub enum PdfResult {
    Message { message: String },
    TempPath { path: String },
}

pub async fn protect_pdf(
    app: tauri::AppHandle,
    input_path: String,
    user_password: String,
    owner_password: String,
) -> Result<String, String> {
    println!("{}", input_path);
    let file_path = app
        .dialog()
        .file()
        .set_file_name("encrypted_by_slicePDF.pdf")
        .add_filter("PDF", &["pdf"][..])
        .blocking_save_file();

    let save_path = match file_path {
        Some(path) => path.into_path().map_err(|_| "Invalid path")?,
        _none => return Err("Cancelled".into()),
    };

    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = qpdf_command(&app)?;

        cmd.args([
            "--encrypt",
            &user_password,
            &owner_password,
            "256",
            "--",
            &input_path,
            save_path.to_str().ok_or("Invalid output path")?,
        ]);

        let status = cmd.status().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("qpdf encryption failed".into());
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok("PDF encrypted successfully".to_string())
}

pub async fn decrypt_pdf_service(
    app: tauri::AppHandle,
    input_path: String,
    password: String,
    temp: bool,
) -> Result<PdfResult, String> {
    let save_path: std::path::PathBuf = if temp {
        let mut path = app
            .path()
            .temp_dir()
            .map_err(|_| "Failed to resolve temp dir")?;

        path.push("slice_pdf_decrypted.pdf");
        path
    } else {
        let file_path = app
            .dialog()
            .file()
            .set_file_name("slice_pdf_decrypted.pdf")
            .add_filter("PDF", &["pdf"][..])
            .blocking_save_file();

        match file_path {
            Some(path) => path.into_path().map_err(|_| "Invalid path")?,
            _ => return Err("Save cancelled".into()),
        }
    };

    let save_path_str = save_path.to_string_lossy().to_string();
    let input_clone = input_path.clone();
    let save_clone = save_path_str.clone();
    let password_clone = password.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = qpdf_command(&app)?;

        let output = cmd
            .arg(format!("--password={}", password_clone))
            .arg("--decrypt")
            .arg(&input_clone)
            .arg(&save_clone)
            .output()
            .map_err(|e| e.to_string())?;

        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("invalid password") {
            return Err("Invalid password".into());
        }

        // 🔥 VERIFY using lopdf
        let decrypted =
            Document::load(&save_clone).map_err(|_| "Failed to read decrypted output")?;

        if decrypted.is_encrypted() {
            let _ = std::fs::remove_file(&save_clone);
            return Err("Invalid password".into());
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    if temp {
        Ok(PdfResult::TempPath {
            path: save_path_str,
        })
    } else {
        Ok(PdfResult::Message {
            message: "PDF decrypted successfully".to_string(),
        })
    }
}

fn qpdf_command(app: &AppHandle) -> Result<Command, String> {
    let os = std::env::consts::OS;

    let relative_path = match os {
        "linux" => "binaries/linux/qpdf",
        "windows" => "binaries/windows/qpdf.exe",
        "macos" => "binaries/macos/qpdf",
        _ => return Err("Unsupported OS".into()),
    };

    // Use the v2 PathResolver via the Manager trait
    let qpdf_path = app
        .path()
        .resolve(relative_path, BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve qpdf resource: {e}"))?;

    if !qpdf_path.exists() {
        return Err(format!("Bundled qpdf not found at {:?}", qpdf_path));
    }

    Ok(Command::new(qpdf_path))
}
