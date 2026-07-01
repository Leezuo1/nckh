import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, User, GraduationCap, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import topicService from '../../../services/topicService';
import { mapTopicStatus } from '../../../utils/mappers';
import './Section4.css';

const Section4 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState([]);

  // Load đề tài đang/đã làm (status != Pending)
  useEffect(() => {
    topicService.getTopics()
      .then(data => {
        const featured = (data || []).filter(t => t.status !== 'Pending').slice(0, 15);
        setTopics(featured);
        setVisible(true);
      })
      .catch(() => setTopics([]));
  }, []);

  const itemsPerPage = 3;
  const maxIndex = Math.max(0, Math.ceil(topics.length / itemsPerPage) - 1);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  useEffect(() => {
    if (topics.length === 0) return;
    const timer = setInterval(() => nextSlide(), 5000);
    return () => clearInterval(timer);
  }, [nextSlide, topics.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [topics.length]);

  if (topics.length === 0) return null;

  return (
    <section className="section4-container" ref={sectionRef}>
      <div className="section4-content">
        <div className="section4-header">
          <div className="section4-badge">
            <Star size={12} fill="#f59e0b" color="#f59e0b" />
            <span className="badge-text-yellow">{t('home.sectionFeatured.badge')}</span>
          </div>
          <div className="header-flex-row">
            <h2 className="section4-main-title">{t('home.sectionFeatured.title')}</h2>
            <div className="header-controls">
              <button className="btn-xem-tat-ca-link" onClick={() => navigate('/danh-sach-de-tai')}>
                {t('home.sectionFeatured.viewAll')} ➔
              </button>
              <div className="slider-arrows">
                <button className="arrow-btn" onClick={prevSlide}><ChevronLeft size={18} /></button>
                <button className="arrow-btn" onClick={nextSlide}><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="slider-viewport">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {topics.map((item) => {
              const supervisor = item.topicParticipant?.find(p => p.topicParticipantRole === 'Supervisor');
              const leader = item.topicParticipant?.find(p => p.topicParticipantRole === 'Leader');
              const statusKey = item.isLate ? 'Late' : item.status;
              const statusLabel = mapTopicStatus(statusKey);
              const pillClass = item.status === 'Done' ? 'pill-green' : item.isLate ? 'pill-red' : 'pill-yellow';
              return (
                <div key={item.id} className="slider-item">
                  <div
                    className={`home-card-noibat ${visible ? 'fade-in-up' : ''}`}
                    onClick={() => navigate(`/de-tai-cua-toi/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-noibat-body">
                      <div className="card-noibat-top">
                        <div className="star-noibat-icon"><Star size={14} fill="#be1e2d" color="#be1e2d" /></div>
                        <h3 className="card-noibat-title">{item.topicName}</h3>
                      </div>
                      <div className="noibat-info-list">
                        <div className="info-row"><User size={14} /><span>{leader?.user?.fullName || item.submitter?.fullName || '—'}</span></div>
                        <div className="info-row"><GraduationCap size={14} /><span>{supervisor?.user?.fullName || '—'}</span></div>
                        <div className="info-row"><Calendar size={14} /><span>{item.year}</span></div>
                      </div>
                      <div className={`status-pill ${pillClass}`}>
                        <span className="pill-dot" />{statusLabel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="slider-dots">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <span
              key={i}
              className={`dot ${currentIndex === i ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i)}
            ></span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section4;
