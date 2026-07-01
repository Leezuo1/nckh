import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './NotFound.css'

const NotFound = () => {
  const { t } = useTranslation()

  return (
    <div className="notfound-wrap">
      <div className="notfound-code">{t('notFound.code')}</div>
      <h1 className="notfound-title">{t('notFound.title')}</h1>
      <p className="notfound-desc">{t('notFound.desc')}</p>
      <Link to="/" className="notfound-btn">
        ← {t('notFound.backHome')}
      </Link>
    </div>
  )
}

export default NotFound
