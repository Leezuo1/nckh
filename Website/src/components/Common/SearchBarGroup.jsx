import './SearchBarGroup.css'

const SearchBarGroup = ({
  title,
  placeholder,
  searchText,
  onSearch,
  selectedYear,
  selectedBatch,
  yearOptions,
  batchOptions,
  onSelectYear,
  onSelectBatch,
  showYearDropdown,
  showBatchDropdown,
  setShowYearDropdown,
  setShowBatchDropdown,
  yearRef,
  batchRef,
  children,
}) => {
  return (
    <div className="search-bar-group white-box">
      <div className="toolbar">
        <h1 className="page-title">{title}</h1>

        <input
          className="search-input"
          placeholder={placeholder || 'Tìm kiếm...'}
          value={searchText}
          onChange={(e) => onSearch(e.target.value)}
        />

        {/* Dropdown Năm */}
        <div className="dropdown-wrap" ref={yearRef}>
          <button
            className={`btn-filter ${selectedYear ? 'active' : ''}`}
            onClick={() => setShowYearDropdown(!showYearDropdown)}
          >
            {selectedYear || 'Năm'} ▼
          </button>
          {showYearDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => onSelectYear('')}>Tất cả</div>
              {yearOptions.map(year => (
                <div
                  key={year}
                  className={`dropdown-item ${selectedYear === year ? 'selected' : ''}`}
                  onClick={() => onSelectYear(year)}
                >
                  {year}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Khóa */}
        <div className="dropdown-wrap" ref={batchRef}>
          <button
            className={`btn-filter ${selectedBatch ? 'active' : ''}`}
            onClick={() => setShowBatchDropdown(!showBatchDropdown)}
          >
            {selectedBatch || 'Khóa'} ▼
          </button>
          {showBatchDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => onSelectBatch('')}>Tất cả</div>
              {batchOptions.map(batch => (
                <div
                  key={batch}
                  className={`dropdown-item ${selectedBatch === batch ? 'selected' : ''}`}
                  onClick={() => onSelectBatch(batch)}
                >
                  {batch}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slot cho nút thêm nếu có */}
        {children}
      </div>
    </div>
  )
}

export default SearchBarGroup