// Предохранитель: если экран упал, остальное приложение продолжает работать.
import { Component, type ReactNode } from "react";
import { Home, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  name: string;
  /** Поменялся (другая вкладка) — ошибка сбрасывается сама. */
  resetKey?: string;
  /** Куда уйти с упавшего экрана, чтобы не попадать на него снова. */
  back?: { label: string; onClick: () => void };
  /** Внутри экрана: без отступов экрана. */
  inner?: boolean;
}

export class Guard extends Component<Props, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`Экран «${this.props.name}» упал:`, error);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: undefined });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { back } = this.props;
    return (
      <div className={this.props.inner ? "guard-inner" : "screen"}>
        <div className="empty">
          <div className="empty-icon">
            <RotateCcw size={30} />
          </div>
          <div className="empty-title">Этот экран споткнулся</div>
          <div className="empty-text">Остальное работает как обычно. Можно открыть его заново или уйти отсюда.</div>
          <div className="guard-actions">
            <button className="btn primary" onClick={() => this.setState({ error: undefined })}>
              Открыть заново
            </button>
            {back && (
              <button
                className="btn"
                onClick={() => {
                  back.onClick();
                  this.setState({ error: undefined });
                }}
              >
                <Home size={16} /> {back.label}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
