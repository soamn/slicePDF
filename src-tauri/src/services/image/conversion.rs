use pdf_converter::PdfConverter;
use std::path::{Path, PathBuf};

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

pub fn images_to_pdf(
    input_paths: &[PathBuf],
    save_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let converter = PdfConverter::new();

    // Ensure we have a .pdf extension
    let mut output_pdf = save_path.to_path_buf();
    if output_pdf.extension().and_then(|e| e.to_str()) != Some("pdf") {
        output_pdf.set_extension("pdf");
    }

    converter.convert_images_to_pdf(input_paths, &output_pdf)?;

    if !output_pdf.exists() {
        return Err("PDF was not created by converter".into());
    }

    Ok(())
}
