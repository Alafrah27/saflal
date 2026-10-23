import {
  ArrowUpRight,
  AudioLines,
  ChevronDown,
  Heart,
  Languages,
  MessageCircle,
  Phone,
  PhoneIncoming,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import Brand from "../components/Brand.jsx";
import DownloadButton from "../components/DownloadButton.jsx";
import { NavigationItems } from "../components/Navigation.jsx";
import PhoneMockup from "../components/PhoneMockup.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import chats from "../assets/chats.png";
import incoming from "../assets/incomingcall.png";
import contacts from "../assets/contacts.png";
import history from "../assets/callhistory.png";

const featureIcons = [
  MessageCircle,
  AudioLines,
  Phone,
  Users,
  ShieldCheck,
  Languages,
];
const copyrightYear = new Date().getFullYear();

export default function Home({ text, language, onLanguageChange }) {
  useEffect(() => {
    document.title = text.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", text.metaDescription);
  }, [text]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  return (
    <>
      <main id="main-content" tabIndex={-1}>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="page-container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow">
                <span className="eyebrow-line" />
                {text.hero.eyebrow}
              </p>
              <h1 id="hero-title">
                {text.hero.title}
                <br />
                <span>{text.hero.accent}</span>
              </h1>
              <p className="hero-description">{text.hero.description}</p>
              <div className="hero-actions">
                <DownloadButton text={text.download} id="hero-download-note" />
                <a href="#features" className="explore-link">
                  {text.hero.explore}
                  <ArrowUpRight
                    size={18}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </a>
              </div>
              <div className="hero-details">
                <span>
                  <MessageCircle size={15} aria-hidden="true" />
                  {text.hero.textVoice}
                </span>
                <span>
                  <Phone size={15} aria-hidden="true" />
                  {text.hero.audioCalls}
                </span>
                <span>
                  <Languages size={15} aria-hidden="true" />
                  {text.hero.bilingual}
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="hero-orbit" aria-hidden="true" />
              <div className="hero-disc" aria-hidden="true" />
              <span className="art-spark spark-one" aria-hidden="true">
                ✦
              </span>
              <span className="art-spark spark-two" aria-hidden="true">
                ✧
              </span>
              <PhoneMockup
                src={incoming}
                alt={text.images.incoming}
                className="hero-phone-back"
              />
              <PhoneMockup
                src={chats}
                alt={text.images.chats}
                className="hero-phone-front"
                priority
              />
              <div className="voice-float">
                <span className="voice-float-icon">
                  <AudioLines size={22} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div>
                  <strong>{text.hero.floatTitle}</strong>
                  <span>{text.hero.floatBody}</span>
                </div>
                <div className="mini-wave" aria-hidden="true">
                  {[10, 19, 13, 26, 16, 22, 10].map((height, index) => (
                    <i key={index} style={{ height }} />
                  ))}
                </div>
              </div>
              <div className="call-float" aria-hidden="true">
                <PhoneIncoming size={18} strokeWidth={1.8} />
                <span className="call-status-dot" />
              </div>
            </div>
          </div>
          <div className="page-container hero-bottom">
            <span>{text.hero.detail}</span>
            <a href="#features" aria-label={text.hero.explore}>
              <ChevronDown size={18} aria-hidden="true" />
            </a>
            <span className="hero-bottom-line" />
          </div>
        </section>
        <section
          className="features-section section-space"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="page-container">
            <SectionHeading
              eyebrow={text.features.eyebrow}
              title={text.features.title}
              description={text.features.description}
              centered
              id="features-title"
            />
            <div className="feature-grid grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {text.features.cards.map((card, index) => {
                const Icon = featureIcons[index];
                return (
                  <article className="feature-card" key={index}>
                    <span className="feature-icon">
                      <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section
          className="showcase-section section-space"
          aria-labelledby="showcase-title"
        >
          <div className="page-container">
            <div className="showcase-heading">
              <SectionHeading
                eyebrow={text.showcase.eyebrow}
                title={text.showcase.title}
                id="showcase-title"
              />
              <p className="section-description">{text.showcase.description}</p>
            </div>
            <div className="showcase-grid grid gap-6 lg:grid-cols-2">
              <article className="showcase-card contacts-card">
                <div className="showcase-copy">
                  <span className="showcase-icon">
                    <Users size={22} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <p className="eyebrow">{text.showcase.friendsTag}</p>
                  <h3>{text.showcase.friendsTitle}</h3>
                  <p>{text.showcase.friendsBody}</p>
                </div>
                <div className="contacts-art">
                  <div className="contacts-disc" aria-hidden="true" />
                  <PhoneMockup src={contacts} alt={text.images.contacts} />
                </div>
              </article>
              <article className="showcase-card history-card">
                <div className="showcase-copy">
                  <span className="showcase-icon">
                    <PhoneIncoming
                      size={22}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <p className="eyebrow">{text.showcase.historyTag}</p>
                  <h3>{text.showcase.historyTitle}</h3>
                  <p>{text.showcase.historyBody}</p>
                </div>
                <div className="history-art">
                  <img
                    src={history}
                    alt={text.images.history}
                    width="1920"
                    height="1440"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </article>
            </div>
            <p className="showcase-caption">
              <span />
              {text.showcase.detail}
            </p>
          </div>
        </section>
        <section
          className="steps-section section-space"
          aria-labelledby="steps-title"
        >
          <div className="page-container">
            <SectionHeading
              eyebrow={text.steps.eyebrow}
              title={text.steps.title}
              centered
              id="steps-title"
            />
            <div className="steps-grid grid gap-9 md:grid-cols-3">
              {text.steps.items.map((step, index) => (
                <article className="step-card" key={index}>
                  <div className="step-top">
                    <span className="step-number" dir="ltr">
                      0{index + 1}
                    </span>
                    <span className="step-line" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="closing-section" aria-labelledby="closing-title">
          <div className="page-container">
            <div className="closing-card">
              <div className="closing-rings" aria-hidden="true" />
              <div className="closing-copy">
                <p className="eyebrow">{text.closing.eyebrow}</p>
                <h2 id="closing-title">{text.closing.title}</h2>
                <p>{text.closing.description}</p>
              </div>
              <div className="closing-action">
                <span className="closing-symbol" aria-hidden="true">
                  <MessageCircle size={37} strokeWidth={1.2} />
                  <Heart size={15} fill="currentColor" />
                </span>
                <DownloadButton
                  text={text.download}
                  inverse
                  id="footer-download-note"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="page-container">
          <div className="footer-top">
            <div className="footer-brand">
              <Brand
                onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
              />
              <p>{text.footer.description}</p>
            </div>
            <div className="footer-navigation">
              <h2>{text.footer.navigation}</h2>
              <nav aria-label={text.footer.navigation}>
                <NavigationItems
                  text={text.nav}
                  onNavigate={() =>
                    window.scrollTo({ top: 0, behavior: "instant" })
                  }
                />
              </nav>
            </div>
            <div className="footer-language">
              <h2>{text.footer.language}</h2>
              <div className="footer-language-buttons">
                <button
                  type="button"
                  lang="en"
                  aria-pressed={language === "en"}
                  onClick={() => onLanguageChange("en")}
                >
                  English
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  lang="ar"
                  aria-pressed={language === "ar"}
                  onClick={() => onLanguageChange("ar")}
                >
                  العربية
                </button>
              </div>
              <div className="footer-language-note">
                <Languages size={18} strokeWidth={1.4} aria-hidden="true" />
                <span>{text.hero.bilingual}</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              © {copyrightYear} {text.footer.copyright}
            </p>
            <p>
              {text.footer.made}
              <Heart size={12} aria-hidden="true" />
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
