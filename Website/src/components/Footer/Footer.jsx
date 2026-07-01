import React from 'react';
import { useTranslation } from 'react-i18next';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer id="footer-section" className="vung-chan-trang-tong">
      <div className="dom-sang-chuyen-dong"></div>
      <div className="lop-hat-sieu-sang"></div>

      <div className="khung-chan-trang-noi-dung">
        {/* COT 1 */}
        <div className="cot-trai-cung">
          <div className="cum-logo-chan-trang">
            <div className="hop-bieu-tuong">🔥</div>
            <span className="chu-logo-nckh">
              NCKH <span className="chu-quan-ly">Management</span>
            </span>
          </div>
          <p className="doan-van-mo-ta">
            {t('footer.platform')}
          </p>
          <div className="nhom-nut-xa-hoi">
            <a href="mailto:thuan@vanlanguni.vn" className="nut-mang-xa-hoi" title="Email">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </a>
            <a href="#!" className="nut-mang-xa-hoi" title="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* COT 2 */}
        <div className="cot-lien-ket">
          <h4 className="tieu-de-cot-chan">{t('footer.quickLinks')}</h4>
          <ul className="danh-sach-link">
            <li><a href="/">{t('footer.home')}</a></li>
            <li><a href="/danh-sach-de-tai">{t('footer.topicList')}</a></li>
            <li><a href="#!">{t('footer.lecturerList')}</a></li>
            <li><a href="/dang-ky-y-tuong">{t('footer.registerIdea')}</a></li>
            <li><a href="/de-tai-cua-toi">{t('footer.myTopics')}</a></li>
          </ul>
        </div>

        {/* COT 3 */}
        <div className="cot-lien-ket">
          <h4 className="tieu-de-cot-chan">{t('footer.support')}</h4>
          <ul className="danh-sach-link">
            <li><a href="#!">{t('footer.guide')}</a></li>
            <li><a href="#!">{t('footer.faq')}</a></li>
            <li><a href="#!">{t('footer.privacy')}</a></li>
            <li><a href="#!">{t('footer.terms')}</a></li>
            <li><a href="#!">{t('footer.contact')}</a></li>
          </ul>
        </div>

        {/* COT 4 */}
        <div className="cot-lien-ket">
          <h4 className="tieu-de-cot-chan">{t('footer.connect')}</h4>
          <ul className="danh-sach-link">
            <li><a href="https://online.vlu.edu.vn/" target="_blank" rel="noreferrer">{t('footer.studentPortal')}</a></li>
            <li><a href="https://elearning.vlu.edu.vn/" target="_blank" rel="noreferrer">{t('footer.eLearning')}</a></li>
            <li><a href="#!">{t('footer.portal')}</a></li>
          </ul>
        </div>
      </div>

      <div className="vung-ban-quyen-cuoi">
        <div className="duong-ke-ngang-mo"></div>
        <p className="van-ban-copyright">
          © 2026 NCKH Management. {t('footer.developedBy')} .
        </p>
      </div>
    </footer>
  );
};

export default Footer;
