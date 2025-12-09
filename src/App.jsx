import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:5000/todos'

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

  // 할일 목록 조회
  const fetchTodos = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(API_BASE_URL)
      if (!response.ok) {
        throw new Error('할일 목록을 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setTodos(data)
    } catch (err) {
      setError(err.message)
      console.error('할일 조회 에러:', err)
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
        requestBody.deadline = newDeadline
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
      setTodos([todo, ...todos])
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
      setTodos(todos.map(todo => todo._id === id ? updatedTodo : todo))
      setEditingId(null)
      setEditingText('')
      setEditingDeadline('')
    } catch (err) {
      setError(err.message)
      console.error('할일 수정 에러:', err)
    }
  }

  // 마감 일시 포맷팅
  const formatDeadline = (deadline) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
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
      setTodos(todos.map(todo => todo._id === id ? updatedTodo : todo))
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

      setTodos(todos.filter(todo => todo._id !== id))
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
        ) : todos.length === 0 ? (
          <div className="empty-state">할일이 없습니다. 새로운 할일을 추가해보세요!</div>
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => (
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
