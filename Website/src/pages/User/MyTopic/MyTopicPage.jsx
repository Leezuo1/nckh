import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IdeaCard from '../../../components/IdeaCard/IdeaCard'
import Pagination from '../../../components/Common/Pagination'
import SearchBarGroup from '../../../components/Common/SearchBarGroup'
import topicService from '../../../services/topicService'
import { mapTopicToCard, mapIdeaToCard } from '../../../utils/mappers'
import './MyTopicPage.css'

const ITEMS_PER_PAGE = 6

const MyTopicPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [ideaList, setIdeaList] = useState([])       // isAssigned = true
  const [submittedIdeas, setSubmittedIdeas] = useState([]) // isAssigned = false
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showBatchDropdown, setShowBatchDropdown] = useState(false)

  const yearRef = useRef(null)
  const batchRef = useRef(null)

  // Lấy ID user hiện tại để check role Leader
  const currentUserId = JSON.parse(localStorage.getItem('user_info') || 'null')?.id

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await topicService.getMyTopics()
      // "Đề tài của tôi" = đã được duyệt (InProgress/Done/Cancelled)
      setIdeaList(data.filter(t => t.status !== 'Pending').map(t => ({ ...mapTopicToCard(t), _raw: t })))
      // "Ý tưởng chờ duyệt" = status Pending — gồm:
      //  - Mình submit, chưa được Admin duyệt → "Chờ xét duyệt"
      //  - Mình submit, đã được Admin duyệt nhưng chưa ai xin → "Chưa Assign"
      //  - Mình là PendingMember (đã xin assign) → "Chờ Assign"
      setSubmittedIdeas(data.filter(t => t.status === 'Pending').map(t => {
        const isPendingMember = t.submitterId !== currentUserId &&
          t.topicParticipant?.some(p => p.userId === currentUserId && p.topicParticipantRole === 'PendingMember')
        const card = mapIdeaToCard(t)
        let displayStatus = card.status // mặc định "Chờ xét duyệt"
        if (isPendingMember) displayStatus = 'Chờ Assign'
        else if (t.isApproved) displayStatus = 'Chưa Assign'
        return {
          ...card,
          status: displayStatus,
          _raw: t,
        }
      }))
    } catch (err) {
      console.error('Lỗi tải đề tài:', err)
    } finally {
      setLoading(false)
    }
  }

  // Gọi API lấy đề tài + ý tưởng của tôi
  useEffect(() => {
    loadData()
  }, [])

  // Leader chấp nhận / từ chối yêu cầu tham gia
  const handleRespond = async (topicId, userId, accept) => {
    try {
      await topicService.respondAssign(topicId, userId, accept)
      await loadData()
    } catch (err) {
      console.error('Lỗi phản hồi yêu cầu:', err)
      // Toast tự hiện qua axios interceptor
    }
  }

  const getYear = (date) => date ? date.split('/')[2] : ''

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

  const handleSearch = (val) => {
    setSearchText(val)
    setCurrentPage(1)
  }

  const handleSelectYear = (year) => {
    setSelectedYear(year)
    setShowYearDropdown(false)
    setCurrentPage(1)
  }

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch)
    setShowBatchDropdown(false)
    setCurrentPage(1)
  }

  return (
    <div className="my-topic-page">
      {/* Box 1: Thanh công cụ */}
      <SearchBarGroup
        title={t('myTopic.title')}
        placeholder={t('myTopic.searchPlaceholder')}
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
      />

      {/* Box 2: Đề tài đang tham gia */}
      <div className="white-box">
        <div className="idea-grid">
          {loading ? (
            <div className="no-results">{t('common.loading')}</div>
          ) : currentData.length > 0 ? (
            currentData.map(item => {
              const raw = item._raw
              const pendingMembers = raw?.topicParticipant?.filter(
                p => p.topicParticipantRole === 'PendingMember'
              ) || []
              const isLeader = raw?.submitterId === currentUserId

              return (
                <div key={item.id}>
                  <div
                    onClick={() => navigate(`/de-tai-cua-toi/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <IdeaCard
                      title={item.title}
                      dept={item.dept}
                      date={item.date}
                      poster={item.poster}
                      role={item.role}
                      status={item.status}
                      bgImage={item.bgImage}
                    />
                  </div>

                  {/* Hiện nút Chấp nhận/Từ chối nếu là Leader và có người xin join */}
                  {isLeader && pendingMembers.map(p => (
                    <div
                      key={p.userId}
                      style={{ padding: 10, background: '#fff3cd', borderRadius: 8, marginTop: 8 }}
                    >
                      <span style={{ fontSize: 13, lineHeight: '1.4' }}>
                        <b>{p.user?.fullName}</b> {t('myTopic.wantsToJoin')} <b>"{item.title}"</b>
                      </span>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleRespond(raw.id, p.userId, true)}
                          style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                        >
                          {t('topic.accept')}
                        </button>
                        <button
                          onClick={() => handleRespond(raw.id, p.userId, false)}
                          style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                        >
                          {t('topic.reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
          ) : (
            <div className="no-results">{t('myTopic.noTopic')}</div>
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

      {/* Box 3: Ý tưởng đã đăng ký (chờ duyệt) */}
      {!loading && submittedIdeas.length > 0 && (
        <div className="white-box" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: '#444', fontWeight: 600 }}>
            📋 {t('myTopic.submittedIdeas')}
          </h3>
          <div className="idea-grid">
            {submittedIdeas.map(item => (
              <div key={item.id} style={{ cursor: 'default' }}>
                <IdeaCard
                  title={item.title}
                  dept={item.dept}
                  date={item.date}
                  poster={item.poster}
                  role={item.role}
                  status={item.status}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MyTopicPage