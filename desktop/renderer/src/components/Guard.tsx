// Предохранитель: если экран упал, остальное приложение продолжает работать.
import { Component, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";

export class Guard extends Component<{ children: ReactNode; name: string }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`Экран «${this.props.name}» упал:`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen">
        <div className="empty">
          <div className="empty-icon">
            <RotateCcw size={30} />
          </div>
          <div className="empty-title">Этот экран споткнулся</div>
          <div className="empty-text">Остальное работает как обычно. Нажми, чтобы открыть его заново.</div>
          <button className="btn primary" onClick={() => this.setState({ error: undefined })}>
            Открыть заново
          </button>
        </div>
      </div>
    );
  }
}
