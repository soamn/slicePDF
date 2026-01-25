use image::ImageFormat;
use pdf_converter::PdfConverter;
use pdfium_render::prelude::*;
use std::path::Path;
use tauri::path::BaseDirectory;
use tauri::AppHandle;
use tauri::Manager;

#[derive(serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Png,
    Jpg,
    Webp,
}

pub fn pdf_to_img(
    app: &AppHandle,
    input_path: String,
    output_dir: &Path,
    format: OutputFormat,
) -> Result<String, Box<dyn std::error::Error>> {
    let os = std::env::consts::OS;

    let relative_path = match os {
        "linux" => "binaries/linux/libpdfium.so",
        "windows" => "binaries/windows/pdfium.dll",
        "macos" => "binaries/macos/libpdfium.dylib",
        _ => return Err("Unsupported OS".into()),
    };

    let lib_path = app
        .path()
        .resolve(relative_path, BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve pdfium resource: {e}"))?;

    if !lib_path.exists() {
        return Err(format!("PDFium library not found at {:?}", lib_path).into());
    }
    let bindings =
        Pdfium::bind_to_library(&lib_path).map_err(|e| format!("Failed to bind pdfium: {e:?}"))?;

    let pdfium = Pdfium::new(bindings);

    let document = pdfium.load_pdf_from_file(&input_path, None)?;

    let (image_format, ext) = map_format(format);

    let render_config = PdfRenderConfig::new()
        .set_target_width(2000)
        .set_maximum_height(2000)
        .rotate_if_landscape(PdfPageRenderRotation::Degrees90, true);

    for (index, page) in document.pages().iter().enumerate() {
        let output_path = output_dir.join(format!("page-{}.{}", index + 1, ext));

        page.render_with_config(&render_config)?
            .as_image()
            .into_rgb8()
            .save_with_format(&output_path, image_format)
            .map_err(|_| PdfiumError::ImageError)?;
    }

    Ok(format!(
        "PDF converted successfully and saved at {}",
        output_dir.display()
    ))
}

pub fn img_to_pdf(input_path: &Path, save_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let converter = PdfConverter::new();
    let output_pdf = if save_path.extension().and_then(|e| e.to_str()) == Some("pdf") {
        save_path.to_path_buf()
    } else {
        save_path.with_extension("pdf")
    };
    converter.convert_image_to_pdf(input_path, &output_pdf)?;

    if !output_pdf.exists() {
        return Err("PDF was not created by converter".into());
    }

    Ok(())
}

fn map_format(format: OutputFormat) -> (ImageFormat, &'static str) {
    match format {
        OutputFormat::Png => (ImageFormat::Png, "png"),
        OutputFormat::Jpg => (ImageFormat::Jpeg, "jpg"),
        OutputFormat::Webp => (ImageFormat::WebP, "webp"),
    }
}
