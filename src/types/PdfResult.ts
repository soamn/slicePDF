export type PdfResult =
  | { Message: { message: string } }
  | { TempPath: { path: string } };
