import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import Home from "./pages/Home.jsx";
import InformationPage from "./pages/InformationPage.jsx";
import { content } from "./content.js";
import { applyLanguage } from "./language.js";
import "./App.css";

export default function App({ initialLanguage = "en" }) {
  const [language, setLanguage] = useState(initialLanguage);
  const text = content[language];
  const changeLanguage = (next) => {
    applyLanguage(next, { persist: true });
    setLanguage(next);
  };
  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        {text.skip}
      </a>
      <Navigation
        text={text.nav}
        language={language}
        onLanguageChange={changeLanguage}
      />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              text={text}
              language={language}
              onLanguageChange={changeLanguage}
            />
          }
        />
        {["privacy", "terms", "about"].map((page) => (
          <Route key={page} path={`/${page}`} element={<InformationPage page={page} text={text} language={language} />} />
        ))}
        <Route path="/delete-account" element={<InformationPage page="deletion" text={text} language={language} />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
