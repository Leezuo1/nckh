import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ style = {} }) => {
  const { i18n } = useTranslation();

  const toggleLang = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLang}
      title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        color: 'white',
        padding: '6px 12px',
        borderRadius: 20,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        ...style,
      }}
    >
      {i18n.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
    </button>
  );
};

export default LanguageSwitcher;
