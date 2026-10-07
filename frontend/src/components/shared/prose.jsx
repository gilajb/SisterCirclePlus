/** Building blocks for long-form text pages (terms, privacy). */

export function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-heading text-lg font-bold">{title}</h2>
      <div className="text-sm leading-[1.7] text-body">{children}</div>
    </section>
  );
}

export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="mt-2 w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children }) {
  return (
    <th className="border-b px-2.5 py-2 text-left font-bold text-muted-foreground">{children}</th>
  );
}

export function Td({ children }) {
  return <td className="border-b px-2.5 py-2 text-body">{children}</td>;
}
