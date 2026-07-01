import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from 'react-i18next';
import "./Section1.css";
import statsService from "../../../services/statsService";

const Section1 = () => {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  const [stats, setStats] = useState({
    topics: '...',
    lecturers: '...',
    students: '...',
  });

  const [identity, setIdentity] = useState(() => {
    const saved = localStorage.getItem('setting_identity');
    return saved ? JSON.parse(saved) : {
      description: 'Nền tảng quản lý nghiên cứu khoa học dành cho sinh viên và giảng viên — từ ý tưởng đến đề tài hoàn chỉnh.',
    };
  });

  //  Ưu tiên localStorage, fallback về API
  useEffect(() => {
  const savedStats = localStorage.getItem('setting_stats');
  if (savedStats) {
    const parsed = JSON.parse(savedStats);
    setStats({
      topics: parsed.topics,
      lecturers: parsed.lecturers,
      students: parsed.students,
    });
    return;
  }
  statsService.getPublicStats()
    .then(data => setStats({
      topics: `${data.topics}+`,
      lecturers: `${data.lecturers}+`,
      students: `${data.students}+`,
    }))
    .catch(() => setStats({ topics: 'N+', lecturers: 'N+', students: 'N+' }));
}, []);

  //  Lắng nghe cả stats lẫn identity khi admin save
  useEffect(() => {
    const handleUpdate = () => {
      const savedStats = localStorage.getItem('setting_stats');
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        setStats({
          topics: parsed.topics,
          lecturers: parsed.lecturers,
          students: parsed.students,
        });
      }
      const savedIdentity = localStorage.getItem('setting_identity');
      if (savedIdentity) setIdentity(JSON.parse(savedIdentity));
    };
    window.addEventListener('settings_updated', handleUpdate);
    return () => window.removeEventListener('settings_updated', handleUpdate);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToContent = () => {
    const el = document.getElementById("feature-cards");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToFooter = () => {
    const footer = document.getElementById("footer-section");
    if (footer) footer.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero-section-container noise-texture">
      <div className="mesh-circle mesh-top-right"></div>
      <div className="mesh-circle mesh-bottom-left"></div>
      <div className="grid-overlay"></div>

      <div className="hero-content-wrapper">
        <div className={`hero-badge ${loaded ? "fade-in-up" : "hidden-state"}`}>
          <span className="badge-dot" />
          {t('home.badge')}
        </div>

        <h1 className={`hero-main-title ${loaded ? "fade-in-up delay-1" : "hidden-state"}`}>
          {t('home.title')} <br />
          <span className="gradient-text">{t('home.titleHighlight')}</span> <br />
          {t('home.titleEnd')}
        </h1>

        <p className={`hero-subtitle ${loaded ? "fade-in-up delay-2" : "hidden-state"}`}>
          {identity.description}
        </p>

        <div className={`hero-cta-group ${loaded ? "fade-in-up delay-3" : "hidden-state"}`}>
          <button onClick={scrollToContent} className="btn-primary">
            {t('home.explore')}
            <ChevronDown size={16} />
          </button>
          <button onClick={scrollToFooter} className="btn-secondary">
            {t('home.learnMore')}
          </button>
        </div>

        <div className={`hero-stats-bar ${loaded ? "fade-in-up delay-4" : "hidden-state"}`}>
          {[
            { value: stats.topics, label: t('home.topics') },
            { value: stats.lecturers, label: t('home.lecturers') },
            { value: stats.students, label: t('home.students') },
          ].map((stat, i) => (
            <div key={i} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={scrollToContent} className="scroll-indicator-btn">
        <span className="scroll-text">{t('home.scrollDown')}</span>
        <div className="scroll-arrow-box">
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </button>
    </section>
  );
};

export default Section1;