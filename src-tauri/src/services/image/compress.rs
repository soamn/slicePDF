use image::{GenericImageView, ImageFormat};
use std::path::Path;

pub fn resize_image_service(
    input_path: &str,
    output_path: &Path,
    width: Option<u32>,
    height: Option<u32>,
    percentage: Option<f32>,
) -> Result<(), String> {
    let img = image::open(input_path).map_err(|e| format!("Failed to open image: {}", e))?;

    let (orig_w, orig_h) = img.dimensions();

    let (new_w, new_h) = if let Some(p) = percentage {
        let factor = p / 100.0;
        (
            (orig_w as f32 * factor) as u32,
            (orig_h as f32 * factor) as u32,
        )
    } else {
        match (width, height) {
            (Some(w), Some(h)) => (w, h),
            (Some(w), _none) => {
                let h = (w as f32 * orig_h as f32 / orig_w as f32) as u32;
                (w, h)
            }
            (_none, Some(h)) => {
                let w = (h as f32 * orig_w as f32 / orig_h as f32) as u32;
                (w, h)
            }
            (_none, _) => (orig_w, orig_h),
        }
    };

    let resized = img.resize_exact(new_w, new_h, image::imageops::FilterType::Lanczos3);

    let format = output_path
        .extension()
        .and_then(|e| e.to_str())
        .and_then(ImageFormat::from_extension)
        .ok_or("Unsupported or missing image format")?;

    resized
        .save_with_format(output_path, format)
        .map_err(|e| format!("Failed to save resized image: {}", e))?;

    Ok(())
}
