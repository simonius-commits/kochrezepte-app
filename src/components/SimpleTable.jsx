// columns: [{ key, label, width }]
// rows: [{ id, onClick?, [columnKey]: string | ReactNode }]
export default function SimpleTable({ columns, rows }) {
  return (
    <div className="simple-table">
      <div className="simple-table-header">
        {columns.map((col) => (
          <div key={col.key} className="simple-table-cell" style={{ width: col.width }}>
            {col.label}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.id ?? i}
          className={`simple-table-row${row.onClick ? " simple-table-row-clickable" : ""}`}
          onClick={row.onClick}
        >
          {columns.map((col, ci) => (
            <div
              key={col.key}
              className={`simple-table-cell${ci === 0 ? " simple-table-cell-primary" : ""}`}
              style={{ width: col.width }}
            >
              {row[col.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
