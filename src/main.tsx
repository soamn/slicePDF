import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";
import PdfToImage from "./pages/PdfToImage";
import ImgToPdf from "./pages/ImgToPdf";
import MergePdf from "./pages/MergePdf";
import MergeImageWithPdf from "./pages/MergeImageWithPdf";
import CompressPdf from "./pages/CompressPdf";
import RotatePdfPages from "./pages/RotatePdfPages";
import { UnlockPdfProvider } from "./contexts/UnlockPdfContext";
import ResizeImage from "./pages/ResizeImage";
import CompressImage from "./pages/compressImage";
import MainLayout from "./layout";
import ErrorPage from "./pages/ErrorPage";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <App />,
        errorElement: <ErrorPage />,
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
      { path: "/pdf-to-image", element: <PdfToImage /> },
      { path: "/image-to-pdf", element: <ImgToPdf /> },
      { path: "/merge-pdf", element: <MergePdf /> },
      { path: "/merge-image-with-pdf", element: <MergeImageWithPdf /> },
      { path: "/compress-pdf", element: <CompressPdf /> },
      { path: "/rotate-pdf", element: <RotatePdfPages /> },
      { path: "/resize-image", element: <ResizeImage /> },
      { path: "/compress-image", element: <CompressImage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UnlockPdfProvider>
      <RouterProvider router={router} />
    </UnlockPdfProvider>
  </React.StrictMode>,
);
