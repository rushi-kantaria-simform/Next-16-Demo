import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-muted">
      <Container>
        <div className="flex flex-col gap-2 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-content-muted">
            &copy; {siteConfig.name}. A Next.js 16 reference build.
          </p>
          <p className="text-content-muted">
            Next.js 16 &middot; React 19 &middot; Tailwind CSS v4
          </p>
        </div>
      </Container>
    </footer>
  );
}
