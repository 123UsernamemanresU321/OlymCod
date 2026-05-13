interface DiagramGalleryProps {
  diagrams: Array<{ path: string; signedUrl: string }>;
}

export function DiagramGallery({ diagrams }: DiagramGalleryProps) {
  if (!diagrams.length) return null;

  return (
    <section className="rounded-lg border border-[#c3c6d0] bg-[#f9f9f9]">
      <div className="border-b border-[#c3c6d0] p-4">
        <h2 className="text-lg font-semibold text-[#1a1c1c]">Geometry Diagrams</h2>
      </div>
      <div className="grid gap-4 p-4">
        {diagrams.map((diagram) => (
          <figure key={diagram.path} className="rounded border border-[#c3c6d0] bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={diagram.signedUrl}
              alt="Geometry diagram"
              className="h-64 w-full object-contain"
            />
            <figcaption className="mt-2 truncate text-xs text-[#43474f]">
              {diagram.path.split("/").pop()}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
