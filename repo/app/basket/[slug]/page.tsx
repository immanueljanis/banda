import { notFound } from "next/navigation";
import { BASKETS } from "@/lib/mock";
import { BasketDetail } from "@/components/basket-detail";
export function generateStaticParams() {
  return BASKETS.map((b) => ({ slug: b.slug }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const basket = BASKETS.find((b) => b.slug === slug);
  if (!basket) notFound();
  return <BasketDetail basket={basket} />;
}
