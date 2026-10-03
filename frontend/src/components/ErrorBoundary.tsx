import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  info: string | null
}

/**
 * Catches unhandled render errors so the UI doesn't go blank.
 * Shows the error message + stack to aid debugging.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info: info.componentStack ?? null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FFFDF9] p-6">
        <div className="max-w-2xl w-full bg-white border-2 border-red-200 rounded-2xl shadow-cozy p-6">
          <h1 className="text-xl font-bold text-red-700 mb-2">Đã có lỗi xảy ra 🐾</h1>
          <p className="text-sm text-stone-600 mb-4">
            Ứng dụng gặp lỗi khi render. Hãy copy thông tin bên dưới gửi cho dev nhé.
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-3">
            <div className="text-xs font-bold text-stone-500 uppercase mb-1">Error</div>
            <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
              {this.state.error?.name}: {this.state.error?.message}
            </pre>
          </div>
          {this.state.info && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-3 max-h-64 overflow-auto">
              <div className="text-xs font-bold text-stone-500 uppercase mb-1">Stack</div>
              <pre className="text-[11px] text-stone-700 whitespace-pre-wrap">
                {this.state.info}
              </pre>
            </div>
          )}
          <button
            className="mt-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }
}