import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "About this build",
  description:
    "What this project is, how it is structured, and which Next.js 16 features each part demonstrates.",
};

const curriculum = [
  { title: "Project Setup & Architecture", status: "done" },
  { title: "Routing (App Router)", status: "done" },
  { title: "Pages Router", status: "done" },
  { title: "Server & Client Components", status: "done" },
  { title: "Cache Components & Caching (v16)", status: "done" },
  { title: "Data Fetching & Mutations", status: "done" },
  { title: "Styling & UI", status: "done" },
  { title: "Performance Optimization", status: "done" },
  { title: "Turbopack (v16 Default)", status: "done" },
  { title: "Proxy, Security & Middleware", status: "done" },
  { title: "SEO & Metadata", status: "done" },
  { title: "AI & Agent Integration (v16)", status: "done" },
  { title: "Hands-On Implementation", status: "next" },
] as const;

const toneFor = {
  done: "success",
  next: "brand",
  planned: "neutral",
} as const;

export default function AboutPage() {
  return (
    <Container>
      <div className="max-w-2xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          About this build
        </h1>
        <p className="mt-3 leading-relaxed text-content-muted">
          A storefront used as a working reference for Next.js 16. Each topic
          below adds a real feature to this same app rather than an isolated
          demo, so the pieces have to coexist the way they would in production.
        </p>

        <h2 className="mt-10 text-xl font-semibold tracking-tight text-content">
          Curriculum
        </h2>
        <ul className="mt-4 flex flex-col gap-2">
          {curriculum.map((topic, index) => (
            <li
              key={topic.title}
              className="flex items-center justify-between gap-4 border-b border-line pb-2 text-sm"
            >
              <span className="text-content">
                <span className="mr-2 text-content-muted tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {topic.title}
              </span>
              <Badge tone={toneFor[topic.status]}>{topic.status}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
