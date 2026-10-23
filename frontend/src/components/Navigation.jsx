import { useEffect, useRef, useState } from "react";
import { Globe2, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import Brand from "./Brand.jsx";

export function NavigationItems({ text, onNavigate }) {
  return (
    <>
      <NavLink to="/" end className="nav-link" onClick={onNavigate}>
        {text.home}
      </NavLink>
      {["privacy", "terms", "about"].map((key) => (
        <NavLink key={key} to={`/${key}`} className="nav-link" onClick={onNavigate}>
          {text[key]}
        </NavLink>
      ))}
    </>
  );
}

export default function Navigation({ text, language, onLanguageChange }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null),
    headerRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const outside = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpen(false);
    };
    const viewport = window.matchMedia("(min-width: 1024px)");
    const desktop = (event) => {
      if (event.matches) setOpen(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    viewport.addEventListener("change", desktop);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      viewport.removeEventListener("change", desktop);
    };
  }, [open]);
  const changeLanguage = () => {
    setOpen(false);
    onLanguageChange(language === "en" ? "ar" : "en");
  };
  return (
    <header className="site-header" ref={headerRef}>
      <div className="page-container header-inner">
        <Brand
          onClick={() => {
            setOpen(false);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        />
        <nav className="desktop-nav" aria-label={text.label}>
          <NavigationItems text={text} />
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="language-toggle"
            onClick={changeLanguage}
            aria-label={text.language}
          >
            <Globe2 size={17} strokeWidth={1.7} aria-hidden="true" />
            <span lang={language === "en" ? "ar" : "en"}>
              {language === "en" ? "العربية" : "English"}
            </span>
          </button>
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-label={open ? text.close : text.open}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav page-container"
          aria-label={text.label}
        >
          <NavigationItems text={text} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </header>
  );
}
