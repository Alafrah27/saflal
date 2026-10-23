export default function PhoneMockup({
  src,
  alt,
  className = "",
  priority = false,
}) {
  return (
    <div className={`phone-mockup ${className}`}>
      <div className="phone-crop">
        <img
          src={src}
          alt={alt}
          width="1920"
          height="1440"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable="false"
        />
      </div>
    </div>
  );
}
