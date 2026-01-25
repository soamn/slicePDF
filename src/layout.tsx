import { Outlet } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Tooltip } from "react-tooltip";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col ">
      <Header />
      <main className="flex-1">
        <Tooltip id="tooltip" />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
