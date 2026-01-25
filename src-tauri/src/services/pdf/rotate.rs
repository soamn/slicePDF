use lopdf::{Document, Object};
use tauri_plugin_dialog::DialogExt;

#[derive(serde::Deserialize)]
pub struct RotatePageInstructions {
    pub pagenumber: u32,
    pub rotation: i32, // 0, 90, 180, 270
    pub filepath: String,
}

pub async fn rotate_pdf(
    app: tauri::AppHandle,
    instructions: Vec<RotatePageInstructions>,
) -> Result<(), String> {
    if instructions.is_empty() {
        return Err("No instructions provided".into());
    }

    let file_path = app
        .dialog()
        .file()
        .set_file_name("rotated_document_by_slice_PDF.pdf")
        .add_filter("PDF", &["pdf"][..])
        .blocking_save_file();

    let save_path = match file_path {
        Some(path) => path.into_path().map_err(|_| "Invalid path")?,
        _none => return Err("Cancelled".into()),
    };

    tauri::async_runtime::spawn_blocking(move || {
        let primary_path = &instructions[0].filepath;
        let mut doc = Document::load(primary_path).map_err(|e| e.to_string())?;

        // 2. Apply rotations
        for inst in instructions {
            let pages = doc.get_pages();

            if let Some(&page_id) = pages.get(&inst.pagenumber) {
                let page_dict = doc
                    .get_object_mut(page_id)
                    .and_then(Object::as_dict_mut)
                    .map_err(|e| e.to_string())?;

                let current_rotation = page_dict
                    .get(b"Rotate")
                    .and_then(|obj| obj.as_i64())
                    .unwrap_or(0);

                // 2. Calculate new rotation
                let new_rotation = (current_rotation + inst.rotation as i64) % 360;

                // 3. Update the dictionary
                page_dict.set("Rotate", Object::Integer(new_rotation));
            }
        }

        // 3. Save the modified document
        doc.save(save_path).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
