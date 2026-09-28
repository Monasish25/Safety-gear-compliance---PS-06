export default function PtzConsole({ onZoom, onClose }) {
  return <div className="ptz-console glass-surface"><div><b>PTZ CONSOLE</b><button type="button" onClick={onClose}>×</button></div><section><button type="button" aria-label="Pan up">↑</button><button type="button" aria-label="Pan left">←</button><button type="button" aria-label="Pan down">↓</button><button type="button" aria-label="Pan right">→</button></section><footer><button type="button" onClick={() => onZoom(-.1)}>−</button><span>OPTICAL ZOOM</span><button type="button" onClick={() => onZoom(.1)}>+</button></footer></div>
}
