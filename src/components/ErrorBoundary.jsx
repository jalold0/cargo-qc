import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// ============================================================
// ErrorBoundary — sahifa yoki komponent crash bo'lganda
// foydalanuvchiga oq oyna o'rniga xato'likning aniq nomi va
// stack trace'ini ko'rsatadi.
// ------------------------------------------------------------
// Endi har qanday rendering xatosi (undefined property, null
// reference, missing import) yashirin emas — diagnostika oson.
// ============================================================

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Konsolga ham yozamiz — DEV rejimida tafsilot ko'rinadi
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    const message = error?.message || String(error) || 'Noma\'lum xatolik';
    const stack = error?.stack || '';
    const componentStack = errorInfo?.componentStack || '';

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-lg border border-rose-200 bg-rose-50/40 p-6 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:ring-rose-500/30">
              <AlertTriangle size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-rose-700 dark:text-rose-300">
                Sahifa yuklanishida xato'lik
              </h2>
              <p className="mt-1 text-sm text-rose-600/90 dark:text-rose-400/90">
                Bu sahifa qism yuklanmadi. Sahifa kodi yangilangan yoki ma'lumotda nomatching maydon bo'lishi mumkin.
              </p>

              <div className="mt-4 rounded-md bg-white px-3 py-2 font-mono text-xs text-rose-700 ring-1 ring-rose-200 dark:bg-neutral-900 dark:text-rose-300 dark:ring-rose-500/30">
                {message}
              </div>

              {(stack || componentStack) && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Texnik tafsilot (developer uchun)
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-neutral-900 p-3 text-[11px] leading-5 text-rose-200">
{stack}
{componentStack ? `\n\nComponent stack:${componentStack}` : ''}
                  </pre>
                </details>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
                >
                  <RotateCcw size={14} />
                  Qayta urinish
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700 dark:hover:bg-neutral-700"
                >
                  Sahifani yangilash
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
