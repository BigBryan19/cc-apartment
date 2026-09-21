// app/components/guides/GuideProse.tsx
// ---------------------------------------------------------------------------
// Renders guide body copy.
//
// Paragraphs may contain `[label](/href)` links. These are parsed into real
// React elements — nothing is passed to dangerouslySetInnerHTML, so even if a
// guide is ever authored by someone else there is no injection surface here.
// Bold uses `**like this**`.
// ---------------------------------------------------------------------------

import React from "react";
import Link from "next/link";

const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  TOKEN.lastIndex = 0;

  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[3] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-[var(--color-ink)]">
          {match[3]}
        </strong>,
      );
    } else {
      const label = match[1];
      const rawHref = match[2];

      // Internal links go through next/link for prefetching; external ones get
      // the usual safe attributes.
      nodes.push(
        /^https?:\/\//i.test(rawHref) ? (
          <a
            key={`${keyPrefix}-l${i}`}
            href={rawHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--color-line)] underline-offset-2 transition-colors hover:decoration-[var(--color-ink)]"
          >
            {label}
          </a>
        ) : (
          <Link
            key={`${keyPrefix}-l${i}`}
            href={rawHref}
            className="underline decoration-[var(--color-line)] underline-offset-2 transition-colors hover:decoration-[var(--color-ink)]"
          >
            {label}
          </Link>
        ),
      );
    }

    lastIndex = match.index + match[0].length;
    i += 1;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

export default function GuideProse({ text, id }: { text: string; id: string }) {
  return <>{renderInline(text, id)}</>;
}
