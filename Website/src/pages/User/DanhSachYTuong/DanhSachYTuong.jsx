import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DanhSachYTuongContent from './DanhSachYTuongContent'
import SearchBarGroup from '../../../components/Common/SearchBarGroup'

const DanhSachYTuong = () => {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showBatchDropdown, setShowBatchDropdown] = useState(false)

  const yearRef = useRef(null)
  const batchRef = useRef(null)

  const yearOptions = ['2024-2025', '2025-2026', '2026-2027']
  const batchOptions = ['K27', 'K28', 'K29', 'K30']

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) setShowYearDropdown(false)
      if (batchRef.current && !batchRef.current.contains(e.target)) setShowBatchDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectYear = (year) => {
    setSelectedYear(year)
    setShowYearDropdown(false)
  }

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch)
    setShowBatchDropdown(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SearchBarGroup
        title={t('ideaList.title')}
        placeholder={t('ideaList.searchPlaceholder')}
        searchText={searchText}
        onSearch={(val) => setSearchText(val)}
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
      <DanhSachYTuongContent
        searchTerm={searchText}
        filterNam={selectedYear || 'Năm'}
        filterKhoa={selectedBatch || 'Khóa'}
      />
    </div>
  )
}

export default DanhSachYTuong