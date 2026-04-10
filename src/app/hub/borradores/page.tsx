import { redirect } from "next/navigation";

export default function HubDraftsPage() {
  redirect("/hub?panel=drafts");
}
