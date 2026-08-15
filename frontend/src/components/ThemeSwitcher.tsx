import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="theme-switcher">
      <button
        className="theme-switcher-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Changer de couleur"
        style={{ background: theme.accentCoral, color: theme.buttonText }}
      >
        🎨
      </button>
      {open && (
        <div className="theme-switcher-panel">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`theme-swatch ${t.id === theme.id ? 'is-active' : ''}`}
              style={{ background: t.bg, border: `2px solid ${t.text}` }}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              aria-label={t.label}
              title={t.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
