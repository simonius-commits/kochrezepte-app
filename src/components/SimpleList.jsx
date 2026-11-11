// items: [{ id, title, meta, thumbnail?: ReactNode, extra?: ReactNode, onClick? }]
export default function SimpleList({ items }) {
  return (
    <div className="simple-list">
      {items.map((item) => (
        <div
          key={item.id}
          className={`simple-list-row${item.onClick ? " simple-list-row-clickable" : ""}`}
          onClick={item.onClick}
          role={item.onClick ? "button" : undefined}
          tabIndex={item.onClick ? 0 : undefined}
        >
          {item.thumbnail && <div className="simple-list-thumb-wrap">{item.thumbnail}</div>}
          <span className="simple-list-title">{item.title}</span>
          {item.extra}
          {item.meta && <span className="simple-list-meta">{item.meta}</span>}
        </div>
      ))}
    </div>
  );
}
