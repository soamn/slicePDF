import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data || "Page not found.";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-backround ">
      <img src="/mascot/sad-en.png" className="max-w-200" alt="sad-en" />
      <h1 className="text-6xl font-bold mb-4">{title}</h1>
      <p className="text-neutral-400 mb-8 text-center max-w-md">{message}</p>
      <Link
        to="/"
        className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition"
      >
        Go Home
      </Link>
    </div>
  );
}
