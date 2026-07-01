import './Pagination.css'

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = []

    if (totalPages <= 5) {
      // Ít trang thì hiện hết
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    // Luôn hiện trang 1
    pages.push(1)

    // Dấu ... bên trái
    if (currentPage > 3) pages.push('...')

    // Các trang xung quanh trang hiện tại
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)

    // Dấu ... bên phải
    if (currentPage < totalPages - 2) pages.push('...')

    // Luôn hiện trang cuối
    pages.push(totalPages)

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <div className="pagination-inner">
        <button
          className="page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>

        {getPageNumbers().map((page, index) => (
          page === '...'
            ? <span key={index} className="ellipsis">...</span>
            : <button
                key={index}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
        ))}

        <button
          className="page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default Pagination