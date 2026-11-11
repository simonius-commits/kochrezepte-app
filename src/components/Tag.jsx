export default function Tag({ label, selected = false, onClick }) {
  return (
    <button
      type="button"
      className={`tag${selected ? " selected" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
