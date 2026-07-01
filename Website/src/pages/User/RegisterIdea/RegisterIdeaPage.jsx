import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import IdeaCard from '../../../components/IdeaCard/IdeaCard'
import Pagination from '../../../components/Common/Pagination'
import SearchBarGroup from '../../../components/Common/SearchBarGroup'
import RegisterModal from '../../../components/RegisterModal/RegisterModal'
import Toast from '../../../components/Common/Toast'
import topicService from '../../../services/topicService'
import authService from '../../../services/authService'
import { mapIdeaToCard } from '../../../utils/mappers'
import './RegisterIdeaPage.css'

const ITEMS_PER_PAGE = 6

const RegisterIdeaPage = () => {
  const { t } = useTranslation()
  const [ideaList, setIdeaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasActiveTopic, setHasActiveTopic] = useState(false) //  Check đề tài active

  const currentUser = authService.getCurrentUser()
  const isStudent = currentUser?.role === 'Student'

  useEffect(() => {
    topicService.getIdeas({ onlyPendingApproval: true })
      .then(data => setIdeaList(data.map(mapIdeaToCard)))
      .catch(err => console.error('Loi tai y tuong:', err))
      .finally(() => setLoading(false))
  }, [])

  //  Nếu là SV, check xem có đề tài đang active không
  useEffect(() => {
    if (!isStudent) return;
    topicService.getMyTopics()
      .then(data => {
        const ACTIVE_STATUSES = ['Pending', 'WaitingToStart', 'InProgress', 'Reporting', 'Editing'];
        const active = (data || []).some(t => ACTIVE_STATUSES.includes(t.status));
        setHasActiveTopic(active);
      })
      .catch(() => setHasActiveTopic(false));
  }, [isStudent]);

  const [currentPage, setCurrentPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showBatchDropdown, setShowBatchDropdown] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const yearRef = useRef(null)
  const batchRef = useRef(null)

  const getYear = (date) => date.split('/')[2]

  const yearOptions = [...new Set(ideaList.map(item => getYear(item.date)))].sort().reverse()
  const batchOptions = [...new Set(ideaList.map(item => item.batch))].sort().reverse()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) setShowYearDropdown(false)
      if (batchRef.current && !batchRef.current.contains(e.target)) setShowBatchDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredData = ideaList.filter(item => {
    const matchSearch =
      item.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.poster.toLowerCase().includes(searchText.toLowerCase())
    const matchYear = selectedYear ? getYear(item.date) === selectedYear : true
    const matchBatch = selectedBatch ? item.batch === selectedBatch : true
    return matchSearch && matchYear && matchBatch
  })

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const currentData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSearch = (val) => { setSearchText(val); setCurrentPage(1) }
  const handleSelectYear = (year) => { setSelectedYear(year); setShowYearDropdown(false); setCurrentPage(1) }
  const handleSelectBatch = (batch) => { setSelectedBatch(batch); setShowBatchDropdown(false); setCurrentPage(1) }

  const handleRegisterSuccess = (newIdea) => {
    setIdeaList(prev => [newIdea, ...prev])
    setCurrentPage(1)
    setShowToast(true)
  }

  //  SV có đề tài active → disable nút
  const isRegisterDisabled = isStudent && hasActiveTopic

  return (
    <div className="register-page">
      <SearchBarGroup
        title={t('register.title')}
        placeholder={t('register.searchPlaceholder')}
        searchText={searchText}
        onSearch={handleSearch}
        selectedYear={selectedYear}
        selectedBatch={selectedBatch}
        yearOptions={yearOptions}
        batchOptions={batchOptions}
        onSelectYear={handleSelectYear}
        onSelectBatch={handleSelectBatch}
        showYearDropdown={showYearDropdown}
        showBatchDropdown={showBatchDropdown}
        setShowYearDropdown={setShowYearDropdown}
        setShowBatchDropdown={setShowBatchDropdown}
        yearRef={yearRef}
        batchRef={batchRef}
      >
        {/* Nút bị mờ + tooltip nếu SV đang có đề tài */}
        <div
          title={isRegisterDisabled ? 'Bạn đang có đề tài chưa hoàn thành, không thể đăng ký mới' : ''}
          style={{ display: 'inline-block' }}
        >
          <button
            className="btn-register"
            onClick={() => !isRegisterDisabled && setShowModal(true)}
            disabled={isRegisterDisabled}
            style={isRegisterDisabled ? {
              opacity: 0.4,
              cursor: 'not-allowed',
              pointerEvents: 'none',
            } : {}}
          >
            ⊕ {t('register.btnRegister')}
          </button>
        </div>
      </SearchBarGroup>

      <div className="white-box">
        {/* Banner cảnh báo nếu SV đang có đề tài */}
        {isRegisterDisabled && (
          <div style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            fontSize: 14,
            color: '#856404',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            ⚠️ Bạn đang có đề tài chưa hoàn thành. Vui lòng hoàn thành đề tài hiện tại trước khi đăng ký mới.
          </div>
        )}

        <div className="idea-grid">
          {loading ? (
            <div className="no-results">{t('common.loading')}</div>
          ) : currentData.length > 0 ? (
            currentData.map(item => (
              <IdeaCard
                key={item.id}
                title={item.title}
                dept={item.dept}
                date={item.date}
                poster={item.poster}
                role={item.role}
                status={item.status}
              />
            ))
          ) : (
            <div className="no-results">{t('common.noResults')}</div>
          )}
        </div>

        {filteredData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>

      {showModal && (
        <RegisterModal
          onClose={() => setShowModal(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}

      {showToast && (
        <Toast
          message={t('register.regSuccess')}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}

export default RegisterIdeaPage