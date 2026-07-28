import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, User, Calendar } from 'lucide-react';
import topicService from '../../../services/topicService';
import './Section3.css';

const Section3 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const sectionRef = useRef(null);

  // Load 6 ý tưởng mới nhất từ API
  useEffect(() => {
    topicService.getIdeas()
      .then(data => {
        setIdeas((data || []).slice(0, 6));
        setVisible(true);
      })
      .catch(() => setIdeas([]));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [ideas.length]);

  if (ideas.length === 0) return null;

  return (
    <section className="section3-container" ref={sectionRef}>
      <div className="section3-content">

        <div className="section3-header">
          <div className="section3-badge">
            <span className="badge-dot-orange" />
            <span className="badge-text-orange">{t('home.sectionWaiting.badge')}</span>
          </div>
          <div className="header-main-row">
            <h2 className="section3-main-title">{t('home.sectionWaiting.title')}</h2>
            <button className="btn-xem-tat-ca" onClick={() => navigate('/danh-sach-de-tai')}>
              {t('home.sectionWaiting.viewAll')} ➔
            </button>
          </div>
          <p className="section3-desc">
            {t('home.sectionWaiting.desc')}
          </p>
        </div>

        <div className="section3-grid">
          {ideas.map((item, index) => (
            <div
              key={item.id}
              className={`home-card-ytuong ${visible ? 'fade-in-up' : ''}`}
              style={{ transitionDelay: `${index * 0.1}s` }}
              onClick={() => navigate('/danh-sach-de-tai')}
            >
              <div className="card-ytuong-body">
                <div className="card-top-row">
                  <div className="star-icon-box">
                    <Star size={14} fill="#be1e2d" color="#be1e2d" />
                  </div>
                  <h3 className="card-ytuong-title">{item.topicName}</h3>
                </div>

                <div className="card-info-group">
                  <p className="info-label">{t('home.sectionWaiting.submitter')}</p>
                  <div className="info-item">
                    <User size={14} color="#888" />
                    <span>{item.submitter?.fullName || '—'}</span>
                  </div>
                  <div className="info-item">
                    <Calendar size={14} color="#888" />
                    <span>{item.year}</span>
                  </div>
                </div>

                <div className="card-status-box">
                  <span className="dot-status" />
                  {t('home.sectionWaiting.pendingAssign')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section3;
