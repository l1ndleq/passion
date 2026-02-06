import { redirect } from "next/navigation";

export default function Legacy({ params }: { params: { slug: string } }) {
  redirect(`/products/${params.slug}`);
}
