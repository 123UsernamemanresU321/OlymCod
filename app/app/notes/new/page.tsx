import { NoteForm } from "@/components/notes/NoteForm";

export const dynamic = "force-dynamic";

export default function NewNotePage() {
  return <NoteForm mode="create" />;
}
