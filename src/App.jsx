import { useState, useEffect } from 'react'
import './App.css'

// 환경 변수에서 API URL 가져오기
const envUrl = import.meta.env.VITE_API_BASE_URL
const isProduction = import.meta.env.PROD

// API URL 구성 함수 (런타임에 실행)
function getApiBaseUrl() {
  if (envUrl && envUrl.trim() !== '') {
    // 환경 변수가 있으면 사용
    let cleanUrl = envUrl.trim()
    
    // 끝의 슬래시 제거
    cleanUrl = cleanUrl.replace(/\/+$/, '')
    
    // /todos가 없으면 추가
    if (!cleanUrl.endsWith('/todos')) {
      return `${cleanUrl}/todos`
    } else {
      return cleanUrl
    }
  } else if (isProduction) {
    console.error('프로덕션 환경에서 VITE_API_BASE_URL 환경 변수가 설정되지 않았습니다!')
    return ''
  } else {
    return 'http://localhost:5000/todos'
  }
}

const API_BASE_URL = getApiBaseUrl()

// 디버깅 로그
console.log('=== API URL 설정 ===')
console.log('환경 변수 VITE_API_BASE_URL:', envUrl)
console.log('프로덕션 모드:', isProduction)
console.log('최종 API_BASE_URL:', API_BASE_URL)
console.log('==================')

function App() {
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [editingDeadline, setEditingDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // todos를 항상 배열로 보장하는 헬퍼
  const safeTodos = Array.isArray(todos) ? todos : []

  // 할일 목록 조회
  const fetchTodos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // API_BASE_URL이 없으면 에러 표시
      if (!API_BASE_URL) {
        setError('백엔드 서버 URL이 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.')
        setLoading(false)
        return
      }
      
      // URL이 /todos로 끝나지 않으면 추가
      let finalUrl = API_BASE_URL
      if (!finalUrl.endsWith('/todos')) {
        finalUrl = finalUrl.replace(/\/+$/, '') + '/todos'
      }
      
      console.log('API 호출 시작:', finalUrl)
      console.log('원본 API_BASE_URL:', API_BASE_URL)
      const response = await fetch(finalUrl)
      
      console.log('응답 상태:', response.status, response.statusText)
      console.log('응답 헤더:', response.headers.get('content-type'))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('응답 에러 내용:', errorText)
        throw new Error(`할일 목록을 불러오는데 실패했습니다. (${response.status})`)
      }
      
      const data = await response.json()
      console.log('API 응답 데이터:', data)
      console.log('데이터 타입:', typeof data)
      console.log('배열 여부:', Array.isArray(data))
      
      // 배열인지 확인하고, 배열이 아니면 빈 배열로 설정
      if (Array.isArray(data)) {
        setTodos(data)
        setError(null) // 성공 시 에러 메시지 제거
      } else {
        console.warn('API 응답이 배열이 아닙니다:', data)
        // 백엔드가 다른 형식으로 응답할 수 있으므로, 에러 메시지를 더 자세히 표시
        setTodos([])
        setError(`서버 응답 형식이 올바르지 않습니다. (받은 데이터: ${JSON.stringify(data).substring(0, 100)})`)
      }
    } catch (err) {
      // 에러가 발생해도 화면이 사라지지 않도록 빈 배열로 설정
      setTodos([])
      const errorMessage = err.message || '할일 목록을 불러오는데 실패했습니다. 백엔드 서버를 확인해주세요.'
      setError(errorMessage)
      console.error('할일 조회 에러:', err)
      console.error('API_BASE_URL:', API_BASE_URL)
      
      // 네트워크 에러인지 확인
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 할일 추가
  const handleAddTodo = async (e) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    try {
      setError(null)
      const requestBody = { title: newTodo.trim() }
      if (newDeadline) {
        // datetime-local은 로컬 시간이므로, UTC로 변환하지 않고 그대로 전송
        // 백엔드에서 로컬 시간으로 저장하도록 함
        requestBody.deadline = newDeadline
        console.log('할일 추가 - 전송할 deadline:', newDeadline)
      }

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '할일 추가에 실패했습니다.')
      }

      const todo = await response.json()
      // 배열인지 확인
      if (Array.isArray(todos)) {
        setTodos([todo, ...todos])
      } else {
        setTodos([todo])
      }
      setNewTodo('')
      setNewDeadline('')
    } catch (err) {
      setError(err.message)
      console.error('할일 추가 에러:', err)
    }
  }

  // 할일 수정 시작
  const startEditing = (id, title, deadline) => {
    setEditingId(id)
    setEditingText(title)
    // deadline이 있으면 datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    if (deadline) {
      const deadlineDate = new Date(deadline)
      const year = deadlineDate.getFullYear()
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0')
      const day = String(deadlineDate.getDate()).padStart(2, '0')
      const hours = String(deadlineDate.getHours()).padStart(2, '0')
      const minutes = String(deadlineDate.getMinutes()).padStart(2, '0')
      setEditingDeadline(`${year}-${month}-${day}T${hours}:${minutes}`)
    } else {
      setEditingDeadline('')
    }
  }

  // 할일 수정 취소
  const cancelEditing = () => {
    setEditingId(null)
    setEditingText('')
    setEditingDeadline('')
  }

  // 할일 수정 완료
  const handleUpdateTodo = async (id) => {
    if (!editingText.trim()) {
      cancelEditing()
      return
    }

    try {
      setError(null)
      const requestBody = { title: editingText.trim() }
      if (editingDeadline) {
        requestBody.deadline = editingDeadline
      }

      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '할일 수정에 실패했습니다.')
      }

      const updatedTodo = await response.json()
      if (Array.isArray(todos)) {
        setTodos(todos.map(todo => todo._id === id ? updatedTodo : todo))
      } else {
        setTodos([updatedTodo])
      }
      setEditingId(null)
      setEditingText('')
      setEditingDeadline('')
    } catch (err) {
      setError(err.message)
      console.error('할일 수정 에러:', err)
    }
  }

  // 마감 일시 포맷팅 (로컬 시간대로 표시)
  const formatDeadline = (deadline) => {
    if (!deadline) return null
    
    // 디버깅: 백엔드에서 받은 원본 값 확인
    console.log('formatDeadline - 원본 deadline:', deadline, '타입:', typeof deadline)
    
    let date
    try {
      // 백엔드에서 받은 날짜 처리
      if (typeof deadline === 'string') {
        // ISO 8601 형식인지 확인
        if (deadline.includes('T')) {
          // UTC 표시(Z)가 있으면 UTC로 해석 후 로컬 시간으로 변환
          if (deadline.includes('Z') || deadline.match(/[+-]\d{2}:\d{2}$/)) {
            // UTC 또는 시간대 정보가 있으면 그대로 파싱 (자동으로 로컬 시간으로 변환됨)
            date = new Date(deadline)
          } else {
            // 시간대 정보가 없는 경우 (YYYY-MM-DDTHH:mm 형식)
            // 백엔드에서 로컬 시간으로 저장했다고 가정하고, 그대로 로컬 시간으로 해석
            // 하지만 new Date()는 시간대 정보가 없으면 로컬 시간으로 해석하므로 문제 없음
            date = new Date(deadline)
          }
        } else {
          // 날짜만 있는 경우
          date = new Date(deadline)
        }
      } else if (deadline instanceof Date) {
        date = deadline
      } else {
        // 다른 형식 (예: 타임스탬프)
        date = new Date(deadline)
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.error('유효하지 않은 날짜:', deadline)
        return '날짜 형식 오류'
      }
      
      console.log('formatDeadline - 파싱된 날짜 UTC:', date.toISOString())
      console.log('formatDeadline - 파싱된 날짜 로컬:', date.toString())
      console.log('formatDeadline - 로컬 시간대 오프셋:', date.getTimezoneOffset(), '분')
    } catch (error) {
      console.error('날짜 파싱 에러:', error, deadline)
      return '날짜 파싱 오류'
    }
    
    // 로컬 시간대로 포맷팅
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    const formatted = `${year}-${month}-${day} ${hours}:${minutes}`
    console.log('formatDeadline - 최종 포맷된 날짜:', formatted)
    return formatted
  }

  // 마감 일시가 지났는지 확인
  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  // 할일 완료 처리
  const handleToggleComplete = async (id, currentCompleted) => {
    try {
      setError(null)
      // 해당 할일 찾기
      const todo = todos.find(t => t._id === id)
      if (!todo) {
        throw new Error('할일을 찾을 수 없습니다.')
      }

      // 백엔드가 title을 필수로 요구하므로 title도 함께 전송
      const requestBody = {
        title: todo.title,
        completed: !currentCompleted
      }
      
      // deadline이 있으면 함께 전송
      if (todo.deadline) {
        requestBody.deadline = todo.deadline
      }

      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '할일 완료 상태 변경에 실패했습니다.')
      }

      const updatedTodo = await response.json()
      if (Array.isArray(todos)) {
        setTodos(todos.map(todo => todo._id === id ? updatedTodo : todo))
      } else {
        setTodos([updatedTodo])
      }
    } catch (err) {
      setError(err.message)
      console.error('할일 완료 상태 변경 에러:', err)
    }
  }

  // 현재 시간 포맷팅
  const formatCurrentTime = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // 낮/밤 판단 (6시 ~ 18시: 낮, 그 외: 밤)
  const isDayTime = () => {
    const hour = currentTime.getHours()
    return hour >= 6 && hour < 18
  }

  // 할일이 완료되었거나 기한이 마감되었는지 확인
  const isTodoInactive = (todo) => {
    return todo.completed || isDeadlinePassed(todo.deadline)
  }

  // 마감까지 남은 시간 계산
  const getTimeRemaining = (deadline) => {
    if (!deadline) return null
    
    try {
      const now = currentTime
      const deadlineDate = new Date(deadline)
      
      // 유효한 날짜인지 확인
      if (isNaN(deadlineDate.getTime())) {
        console.error('Invalid deadline date:', deadline)
        return null
      }
      
      const diff = deadlineDate - now

      if (diff <= 0) return '기한 만료' // 이미 지남

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        return `${days}일 ${hours}시간 남음`
      } else if (hours > 0) {
        return `${hours}시간 ${minutes}분 남음`
      } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초 남음`
      } else {
        return `${seconds}초 남음`
      }
    } catch (error) {
      console.error('Error calculating time remaining:', error, deadline)
      return null
    }
  }

  // 할일 삭제
  const handleDeleteTodo = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '할일 삭제에 실패했습니다.')
      }

      if (Array.isArray(todos)) {
        setTodos(todos.filter(todo => todo._id !== id))
      } else {
        setTodos([])
      }
    } catch (err) {
      setError(err.message)
      console.error('할일 삭제 에러:', err)
    }
  }

  return (
    <div className={`app ${isDayTime() ? 'day' : 'night'}`}>
      <div className="forest-background">
        <div className="sky">
          {!isDayTime() && (
            <>
              <div className="star star1"></div>
              <div className="star star2"></div>
              <div className="star star3"></div>
              <div className="star star4"></div>
              <div className="star star5"></div>
              <div className="star star6"></div>
            </>
          )}
        </div>
        {/* 나무 잎 상단 띠 */}
        <div className="tree-canopy"></div>
        <div className="trees">
          <div className="tree tree1">
            {!isDayTime() && <div className="vine"></div>}
          </div>
          <div className="tree tree2">
            {!isDayTime() && <div className="vine"></div>}
          </div>
          <div className="tree tree3">
            {!isDayTime() && <div className="vine"></div>}
          </div>
          <div className="tree tree4">
            {!isDayTime() && <div className="vine"></div>}
          </div>
          <div className="tree tree5">
            {!isDayTime() && <div className="vine"></div>}
          </div>
        </div>
        <div className="ground">
          <div className="rock rock1"></div>
          <div className="rock rock2"></div>
          <div className="rock rock3"></div>
          <div className="mushroom mushroom1"></div>
          <div className="mushroom mushroom2"></div>
          <div className="mushroom mushroom3"></div>
        </div>
      </div>
      <div className="container">
        <h1>할일 관리</h1>
        
        {/* 현재 날짜와 시간 */}
        <div className="current-time">
          {formatCurrentTime(currentTime)}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* 할일 추가 폼 */}
        <form onSubmit={handleAddTodo} className="todo-form">
          <div className="form-inputs">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="새 할일을 입력하세요..."
              className="todo-input"
            />
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="deadline-input"
            />
          </div>
          <button type="submit" className="add-button">
            추가
          </button>
        </form>

        {/* 할일 목록 */}
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : safeTodos.length === 0 ? (
          <div className="empty-state">할일이 없습니다. 새로운 할일을 추가해보세요!</div>
        ) : (
          <ul className="todo-list">
            {safeTodos.map((todo) => (
              <li key={todo._id} className="todo-item">
                {editingId === todo._id ? (
                  <div className="edit-mode">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateTodo(todo._id)
                        } else if (e.key === 'Escape') {
                          cancelEditing()
                        }
                      }}
                      className="edit-input"
                      autoFocus
                    />
                    <input
                      type="datetime-local"
                      value={editingDeadline}
                      onChange={(e) => setEditingDeadline(e.target.value)}
                      className="edit-deadline-input"
                    />
                    <div className="edit-buttons">
                      <button
                        onClick={() => handleUpdateTodo(todo._id)}
                        className="save-button"
                      >
                        저장
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="cancel-button"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`todo-content ${isTodoInactive(todo) ? 'todo-inactive' : ''}`}>
                    <div className="todo-info">
                      <div className="todo-title-wrapper">
                        <span className="todo-title">{todo.title}</span>
                        {isDeadlinePassed(todo.deadline) && !todo.completed && (
                          <span className="expired-badge">
                            기한 만료 😢
                          </span>
                        )}
                      </div>
                      {todo.deadline && (
                        <>
                          <span className={`todo-deadline ${isDeadlinePassed(todo.deadline) ? 'deadline-passed' : ''}`}>
                            마감: {formatDeadline(todo.deadline)}
                            {isDeadlinePassed(todo.deadline) && ' (지남)'}
                          </span>
                          {!todo.completed && getTimeRemaining(todo.deadline) && (
                            <span className="time-remaining">
                              {getTimeRemaining(todo.deadline)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="todo-actions">
                      <button
                        onClick={() => handleToggleComplete(todo._id, todo.completed)}
                        className={`complete-button ${todo.completed ? 'completed' : ''}`}
                      >
                        {todo.completed ? '완료됨' : '완료'}
                      </button>
                      <button
                        onClick={() => startEditing(todo._id, todo.title, todo.deadline)}
                        className="edit-button"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo._id)}
                        className="delete-button"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
