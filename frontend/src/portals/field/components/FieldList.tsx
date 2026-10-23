import type { ReactNode } from "react";

interface FieldListProps {
  title: string;
  items: any[];
  render: (item: any, index: number) => ReactNode;
  emptyMessage?: string;
  actionButton?: ReactNode;
}

export function FieldList({
  title,
  items,
  render,
  emptyMessage = "No records are currently assigned to you.",
  actionButton
}: FieldListProps) {
  return (
    <section className="field-page">
      <div className="field-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span>FIELD OPERATIONS</span>
          <h1>{title}</h1>
        </div>
        {actionButton}
      </div>
      <div className="field-list">
        {items && items.length > 0 ? (
          items.map((x: any, i: number) => (
            <article className="field-list-row" key={x.id || i}>
              {render(x, i)}
            </article>
          ))
        ) : (
          <div className="field-empty">{emptyMessage}</div>
        )}
      </div>
    </section>
  );
}
