pub mod commands;
pub mod services;

use std::{thread, time::Duration};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::pdf::pdf_to_img,
            commands::pdf::compress_pdf,
            commands::pdf::image_to_pdf,
            commands::pdf::merge_pdf,
            commands::pdf::merge_all,
            commands::pdf::rotate_pdf_pages,
            commands::pdf::protect_pdf,
            commands::pdf::decrypt_pdf,
            commands::image::compress_image,
            commands::image::resize_image
        ])
        .setup(|app| {
            let splash = app
                .get_webview_window("splash")
                .expect("splash window not found");

            let main = app
                .get_webview_window("main")
                .expect("main window not found");

            thread::spawn(move || {
                // replace with real init logic
                thread::sleep(Duration::from_secs(4));

                main.show().unwrap();
                splash.close().unwrap();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
