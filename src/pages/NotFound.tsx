import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import ReportProblemLink from "@/components/support/ReportProblemLink";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page Not Found - Chess Playbook</title>
        <meta name="description" content="The page you are looking for does not exist." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-background flex flex-col">
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="mb-4 text-6xl font-bold font-playfair">404</h1>
            <p className="mb-6 text-xl text-muted-foreground">Page not found</p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Return to Home
            </a>
            <p className="mt-6 text-sm text-muted-foreground">
              Followed a link here? <ReportProblemLink surface="not_found" from={location.pathname} label="Tell us where it was" />
            </p>
          </div>
        </main>
      </div>
    </>
  );
};

export default NotFound;
