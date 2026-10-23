export default function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  id,
}) {
  return (
    <div className={`section-heading${centered ? " heading-centered" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}
