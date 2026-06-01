export default function TableSkeleton({ cols = 6, rows = 10 }) {
  return (
    <div className="skeleton-wrapper">
      <div className="skeleton-toolbar">
        <div className="skel skel-search" />
        <div className="skel skel-btn" />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skel skel-th" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "row-even" : "row-odd"}>
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci}><div className="skel skel-td" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}