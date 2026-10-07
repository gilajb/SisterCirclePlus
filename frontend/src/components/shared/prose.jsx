/** Building blocks for long-form text pages (terms, privacy). */

export function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-heading mb-3 text-lg font-bold">{title}</h2>
      <div className="text-body text-sm leading-[1.7]">{children}</div>
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
    <th className="text-muted-foreground border-b px-2.5 py-2 text-left font-bold">{children}</th>
  );
}

export function Td({ children }) {
  return <td className="text-body border-b px-2.5 py-2">{children}</td>;
}
