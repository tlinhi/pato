import { useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import posthog from 'posthog-js'
import RestaurantCard from '../components/RestaurantCard'
import useStore from '../store'
import './SearchPage.css'

const PAGE_SIZE = 24

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const province = searchParams.get('province') || ''
  const district = searchParams.get('district') || ''
  const price = searchParams.get('price') || ''
  const cuisine = searchParams.get('cuisine') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const { restaurants, loaded } = useStore()

  const results = useMemo(() => {
    let list = restaurants
    if (q.trim()) {
      const lower = q.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(lower) ||
        r.address.toLowerCase().includes(lower) ||
        r.cuisine_all?.some(c => c.toLowerCase().includes(lower))
      )
    }
    if (province) list = list.filter(r => r.address?.includes(province))
    if (district) list = list.filter(r => r.address?.includes(district))
    if (price) list = list.filter(r => r.price_range === price)
    if (cuisine) list = list.filter(r => r.cuisine_all?.includes(cuisine))
    return list
  }, [q, province, district, price, cuisine, restaurants])

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeFilters = [
    q && `"${q}"`,
    cuisine,
    district || province,
    price && `Mức giá ${price}`,
  ].filter(Boolean)

  useEffect(() => {
    if (!loaded) return
    posthog.capture('search', {
      query: q,
      province,
      district,
      price,
      cuisine,
      result_count: results.length,
    })
  }, [q, province, district, price, cuisine, loaded, results.length])

  function goToPage(n) {
    const p = new URLSearchParams(searchParams)
    if (n === 1) p.delete('page')
    else p.set('page', String(n))
    setSearchParams(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="search-page">
      <div className="wrapper">
        <div className="inner">
          <h1 className="search-h1">
            {activeFilters.length > 0
              ? `Kết quả tìm kiếm: ${activeFilters.join(', ')}`
              : 'Tất cả nhà hàng'}
          </h1>
          <p className="search-count">
            {!loaded ? 'Đang tải...' : `${results.length} kết quả`}
          </p>
          <div className="search-grid">
            {pageItems.map(r => (
              <RestaurantCard key={r.handle} restaurant={r} section="search_results" />
            ))}
          </div>
          {loaded && results.length === 0 && (
            <div className="no-results">
              <p>Không tìm thấy nhà hàng phù hợp{q ? ` với "${q}"` : ''}</p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </button>
              {buildPageNumbers(currentPage, totalPages).map((n, i) =>
                n === '...' ? (
                  <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                ) : (
                  <button
                    key={n}
                    className={`pagination-btn${n === currentPage ? ' active' : ''}`}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                className="pagination-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
