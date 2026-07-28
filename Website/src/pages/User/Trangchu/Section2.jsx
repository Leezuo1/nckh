import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRightIcon, ListIcon, UsersIcon, LightbulbIcon, BookmarkIcon } from "lucide-react";
import "./Section2.css";

function FeatureCard({ feature, index, visible }) {
  const navigate = useNavigate();

  return (
    <div
      className={`feature-card-item ${visible ? "visible" : ""}`}
      style={{ transitionDelay: `${index * 0.15}s` }}
    >
      <div className={`icon-wrapper ${feature.color}`}>
        <div className={`icon-main ${feature.iconBg}`}>
          {feature.icon}
        </div>
      </div>
      <div className="card-body">
        <h3 className="card-title">{feature.title}</h3>
        <p className="card-desc">{feature.description}</p>
      </div>
      <button onClick={() => navigate(feature.href)} className="card-cta">
        {feature.cta}
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Section2() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  // Override mô tả từ admin Setting (localStorage) nếu có
  const savedNav = (() => {
    try { return JSON.parse(localStorage.getItem('setting_nav') || 'null'); }
    catch { return null; }
  })();

  const features = [
    {
      id: "topics",
      icon: <ListIcon className="w-6 h-6" />,
      color: "bg-blue-500-10",
      iconBg: "bg-blue-500",
      title: t('home.sectionFeatures.card1Title'),
      description: savedNav?.topicList || t('home.sectionFeatures.card1Desc'),
      cta: t('home.sectionFeatures.card1Cta'),
      href: "/danh-sach-de-tai",
    },
    {
      id: "lecturers",
      icon: <UsersIcon className="w-6 h-6" />,
      color: "bg-emerald-500-10",
      iconBg: "bg-emerald-500",
      title: t('home.sectionFeatures.card2Title'),
      description: savedNav?.ideaList || t('home.sectionFeatures.card2Desc'),
      cta: t('home.sectionFeatures.card2Cta'),
      href: "/danh-sach-de-tai",
    },
    {
      id: "register",
      icon: <LightbulbIcon className="w-6 h-6" />,
      color: "bg-amber-500-10",
      iconBg: "bg-amber-500",
      title: t('home.sectionFeatures.card3Title'),
      description: savedNav?.register || t('home.sectionFeatures.card3Desc'),
      cta: t('home.sectionFeatures.card3Cta'),
      href: "/dang-ky-y-tuong",
    },
    {
      id: "my-topics",
      icon: <BookmarkIcon className="w-6 h-6" />,
      color: "bg-purple-500-10",
      iconBg: "bg-purple-500",
      title: t('home.sectionFeatures.card4Title'),
      description: t('home.sectionFeatures.card4Desc'),
      cta: t('home.sectionFeatures.card4Cta'),
      href: "/de-tai-cua-toi",
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="feature-cards" ref={sectionRef} className="section2-container">
      <div className="section2-content">
        <div className="section2-header">
          <div className="section2-badge">
            <span className="badge-dot-red" />
            <span className="badge-text-red">{t('home.sectionFeatures.badge')}</span>
          </div>
          <h2 className="section2-title">{t('home.sectionFeatures.title')}</h2>
          <p className="section2-subtitle">
            {t('home.sectionFeatures.subtitle')}
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, i) => (
            <FeatureCard key={feature.id} feature={feature} index={i} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}
