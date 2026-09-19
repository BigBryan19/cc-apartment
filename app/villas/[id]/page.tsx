// app/villas/[id]/page.tsx
import { villasData } from "../../lib/data";
import VillaClient from "./VillaClient";

export function generateStaticParams() {
  return villasData.map((villa) => ({
    id: villa.id.toString(),
  }));
}

export default function VillaDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <VillaClient params={params} />;
}
