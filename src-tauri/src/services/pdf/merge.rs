use image::GenericImageView;
use lopdf::{dictionary, Document, Object, Stream};

use std::collections::HashMap;
use tauri_plugin_dialog::DialogExt;

#[derive(serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MergePageInstruction {
    pub sourcepdfid: String,
    pub source_page_number: u32,
}

#[derive(serde::Deserialize)]
pub struct MergeInstruction {
    #[serde(rename = "fileId")]
    file_id: String,
    #[serde(rename = "pageNumber")]
    page_number: u32,
    kind: String,
}

pub async fn merge_pdfs(
    app: tauri::AppHandle,
    instructions: Vec<MergePageInstruction>,
    file_map: HashMap<String, String>,
) -> Result<String, String> {
    let mut parts = Vec::new();

    for (_pdf_id, filepath) in &file_map {
        if let Some(stem) = std::path::Path::new(filepath)
            .file_stem()
            .and_then(|s| s.to_str())
        {
            parts.push(stem.to_string());
        }
    }
    let merged_name = if parts.is_empty() {
        "slice-pdf-merged.pdf".to_string()
    } else {
        format!("slice-pdf-merged-{}.pdf", parts.join("-"))
    };
    let file_path = app
        .dialog()
        .file()
        .set_file_name(merged_name)
        .add_filter("PDF", &["pdf"][..])
        .blocking_save_file();

    let save_path = match file_path {
        Some(path) => path.into_path().map_err(|_| "Invalid path")?,
        _none => return Ok("Merge Cancelled".to_string()),
    };
    let save_path_for_closure = save_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut target_doc = Document::with_version("1.7");
        let mut max_id = 1;

        let mut sources = HashMap::new();
        for (pdf_id, filepath) in &file_map {
            let mut doc = Document::load(filepath)
                .map_err(|e| format!("Failed to load {}: {e}", filepath))?;
            doc.renumber_objects_with(max_id);
            max_id = doc.max_id + 1;
            let pages = doc.get_pages();
            sources.insert(pdf_id.clone(), (doc, pages));
        }

        // Collect page IDs in order and copy all objects
        let mut page_ids_to_include = Vec::new();
        for instr in &instructions {
            if let Some((source_doc, page_map)) = sources.get(&instr.sourcepdfid) {
                if let Some(&page_id) = page_map.get(&instr.source_page_number) {
                    // Copy all objects from this source document
                    for (&id, obj) in &source_doc.objects {
                        if !target_doc.objects.contains_key(&id) {
                            target_doc.objects.insert(id, obj.clone());
                        }
                    }
                    page_ids_to_include.push(page_id);
                }
            }
        }

        let pages_id = target_doc.new_object_id();

        if page_ids_to_include.is_empty() {
            return Err("No pages selected for merge".to_string());
        }

        let mut final_kids = Vec::new();
        for &page_id in &page_ids_to_include {
            if let Ok(page_dict) = target_doc
                .get_object_mut(page_id)
                .and_then(|o| o.as_dict_mut())
            {
                page_dict.set("Parent", pages_id);
                final_kids.push(Object::Reference(page_id));
            }
        }

        // Insert Pages dictionary
        let pages_dict = dictionary! {
            "Type" => "Pages",
            "Count" => final_kids.len() as i64,
            "Kids" => final_kids,
        };
        target_doc
            .objects
            .insert(pages_id, Object::Dictionary(pages_dict));

        // Create Catalog
        let catalog_id = target_doc.new_object_id();
        let catalog = dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        };
        target_doc
            .objects
            .insert(catalog_id, Object::Dictionary(catalog));

        // Set trailer and max_id
        target_doc.trailer.set("Root", catalog_id);
        target_doc.max_id = max_id;

        // Save
        target_doc.compress();
        target_doc
            .save(&save_path_for_closure)
            .map_err(|e| format!("Failed to save PDF: {e}"))?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(format!("PDF merged successfully at {:?}", save_path))
}

pub async fn merge_all(
    app: tauri::AppHandle,
    instructions: Vec<MergeInstruction>,
    file_map: HashMap<String, String>,
) -> Result<(), String> {
    let mut parts = Vec::new();
    for (_pdf_id, filepath) in &file_map {
        if let Some(stem) = std::path::Path::new(filepath)
            .file_stem()
            .and_then(|s| s.to_str())
        {
            parts.push(stem.to_string());
        }
    }
    let merged_name = if parts.is_empty() {
        "slice-pdf-merged.pdf".to_string()
    } else {
        format!("slice-pdf-merged-{}.pdf", parts.join("-"))
    };

    let save_path = app
        .dialog()
        .file()
        .set_file_name(merged_name)
        .blocking_save_file()
        .ok_or("Save cancelled")?
        .into_path()
        .map_err(|_| "Invalid Path")?;

    tauri::async_runtime::spawn_blocking(move || {
        let mut target_doc = Document::with_version("1.7");
        let mut max_id = 1;
        let mut source_docs: HashMap<String, Document> = HashMap::new();
        let mut final_page_ids = Vec::new();

        // Process all instructions in order
        for (_index, instr) in instructions.iter().enumerate() {
            let path = file_map.get(&instr.file_id).ok_or("File not found")?;

            if instr.kind == "pdf" {
                // Load or get cached PDF document
                if !source_docs.contains_key(path) {
                    let mut d = Document::load(path).map_err(|e| e.to_string())?;
                    d.renumber_objects_with(max_id);
                    max_id = d.max_id + 1;
                    source_docs.insert(path.clone(), d);
                }

                let doc = source_docs.get(path).unwrap();
                let pages = doc.get_pages();

                // Get page ID - pages are 1-indexed in lopdf
                let &source_page_id = pages.get(&instr.page_number).ok_or_else(|| {
                    format!(
                        "Page {} not found in PDF (has {} pages)",
                        instr.page_number,
                        pages.len()
                    )
                })?;

                // Copy all objects from this source document
                for (&id, obj) in &doc.objects {
                    if !target_doc.objects.contains_key(&id) {
                        target_doc.objects.insert(id, obj.clone());
                    }
                }

                // Store the page ID in order
                final_page_ids.push(source_page_id);
            } else {
                println!("DEBUG: Creating image page...");
                // Handle Image -> New PDF Page
                let img = image::open(path).map_err(|e| e.to_string())?;

                // Standard PDF page sizes (in points: 1 point = 1/72 inch)
                const A4_WIDTH: f32 = 595.0; // 8.27 inches
                const A4_HEIGHT: f32 = 842.0; // 11.69 inches
                const MAX_DPI: f32 = 150.0; // Maximum DPI for embedded images

                let (orig_width, orig_height) = img.dimensions();

                // Calculate target dimensions to fit A4 while maintaining aspect ratio
                let img_aspect = orig_width as f32 / orig_height as f32;
                let page_aspect = A4_WIDTH / A4_HEIGHT;

                let (page_width, page_height) = if img_aspect > page_aspect {
                    // Image is wider - fit to width
                    (A4_WIDTH, A4_WIDTH / img_aspect)
                } else {
                    // Image is taller - fit to height
                    (A4_HEIGHT * img_aspect, A4_HEIGHT)
                };

                // Calculate optimal image resolution (max 150 DPI to reduce file size)
                let target_width = ((page_width / 72.0) * MAX_DPI) as u32;
                let target_height = ((page_height / 72.0) * MAX_DPI) as u32;

                // Resize image if it's too large
                let img = if orig_width > target_width || orig_height > target_height {
                    img.resize(
                        target_width,
                        target_height,
                        image::imageops::FilterType::Lanczos3,
                    )
                } else {
                    img
                };

                let img_rgb = img.to_rgb8();
                let (final_width, final_height) = img_rgb.dimensions();

                // Compress image data using flate2
                use flate2::write::ZlibEncoder;
                use flate2::Compression;
                use std::io::Write;

                let raw_data = img_rgb.into_raw();
                let mut encoder = ZlibEncoder::new(Vec::new(), Compression::best());
                encoder.write_all(&raw_data).map_err(|e| e.to_string())?;
                let compressed_data = encoder.finish().map_err(|e| e.to_string())?;

                // Create image XObject with proper ID from max_id
                let img_obj_id = (max_id, 0);
                max_id += 1;
                let stream = Stream::new(
                    dictionary! {
                        "Type" => "XObject",
                        "Subtype" => "Image",
                        "Width" => final_width as i64,
                        "Height" => final_height as i64,
                        "ColorSpace" => "DeviceRGB",
                        "BitsPerComponent" => 8,
                        "Filter" => "FlateDecode",
                    },
                    compressed_data,
                );
                target_doc
                    .objects
                    .insert(img_obj_id, Object::Stream(stream));

                // Create content stream
                let content = format!("q {} 0 0 {} 0 0 cm /Im1 Do Q", page_width, page_height);
                let content_obj_id = (max_id, 0);
                max_id += 1;
                target_doc.objects.insert(
                    content_obj_id,
                    Object::Stream(Stream::new(dictionary! {}, content.into_bytes())),
                );

                // Create Page object with A4-based dimensions
                let page_obj_id = (max_id, 0);
                max_id += 1;
                let page_dict = dictionary! {
                    "Type" => "Page",
                    "Contents" => content_obj_id,
                    "MediaBox" => vec![0.into(), 0.into(), page_width.into(), page_height.into()],
                    "Resources" => dictionary! {
                        "XObject" => dictionary! { "Im1" => img_obj_id }
                    },
                };
                target_doc
                    .objects
                    .insert(page_obj_id, Object::Dictionary(page_dict));

                // Store the page ID in order
                final_page_ids.push(page_obj_id);
            }
        }

        // Create Pages Root with proper ID
        let pages_id = (max_id, 0);
        max_id += 1;

        // Update Parent references for all pages
        for &page_id in &final_page_ids {
            if let Ok(page_dict) = target_doc
                .get_object_mut(page_id)
                .and_then(|o| o.as_dict_mut())
            {
                page_dict.set("Parent", pages_id);
            }
        }

        // Insert the Pages dictionary
        let pages_dict = dictionary! {
            "Type" => "Pages",
            "Count" => final_page_ids.len() as i64,
            "Kids" => final_page_ids
                .into_iter()
                .map(Object::Reference)
                .collect::<Vec<_>>(),
        };
        target_doc
            .objects
            .insert(pages_id, Object::Dictionary(pages_dict));

        // Create Catalog
        let catalog_id = target_doc.new_object_id();
        let catalog = dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        };
        target_doc
            .objects
            .insert(catalog_id, Object::Dictionary(catalog));

        // Set trailer and max_id
        target_doc.trailer.set("Root", catalog_id);
        target_doc.max_id = max_id;

        // Save
        target_doc.compress();
        target_doc.save(save_path).map_err(|e| e.to_string())?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
