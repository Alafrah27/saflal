import { Link } from "react-router-dom";

export default function Brand({ onClick }) {
  return (
    <Link to="/" className="brand" onClick={onClick} aria-label="Saflal">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M7 7h12a7 7 0 0 1 0 14h-5l-7 5V7Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M12 12h9M12 16h6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span dir="ltr" lang="en">
        Saflal<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
