import { redirect } from "next/navigation";

export default function EmbedPage() {
  redirect("/embed/domain?domain=4&tab=keyword");
}
