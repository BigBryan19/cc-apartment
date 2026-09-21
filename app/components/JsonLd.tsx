// app/components/JsonLd.tsx
// ---------------------------------------------------------------------------
// Emits schema.org structured data.
//
// A plain <script type="application/ld+json"> is server-rendered by React, so
// crawlers see it in the initial HTML without having to execute any JavaScript.
// The JSON is produced by app/lib/seo.ts.
// ---------------------------------------------------------------------------

import React from "react";

export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Serialised here; the payload is built from our own constants, never
      // from user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
