/**
 * Client half: one button in the sidebar footer + a small slider popover.
 * It only changes the window's alpha through the Host half; it restyles nothing.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ui-transparency',
  factory(require) {
    const React = require('react');

    const ROUTE = '/dsh-ui-transparency/alpha';
    const STORAGE_KEY = 'dsh-ui-transparency:level';
    const MAX_LEVEL = 90;

    function readLevel() {
      try {
        const value = Number(window.localStorage.getItem(STORAGE_KEY));
        if (!Number.isFinite(value)) return 0;
        return Math.min(MAX_LEVEL, Math.max(0, value));
      } catch {
        return 0;
      }
    }

    function saveLevel(level) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(level));
      } catch {
        /* private mode: keep the in-memory value */
      }
    }

    function sendLevel(level) {
      const alpha = Math.round(255 * (1 - level / 100));
      window
        .fetch(ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ alpha }),
        })
        .catch(() => {});
    }

    const buttonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      padding: 0,
      border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,0.24))',
      borderRadius: 8,
      background: 'transparent',
      color: 'var(--dsw-alias-label-secondary, inherit)',
      cursor: 'pointer',
    };

    function Transparency() {
      const [open, setOpen] = React.useState(false);
      const [level, setLevel] = React.useState(readLevel);
      const [anchor, setAnchor] = React.useState(null);
      const buttonRef = React.useRef(null);
      const panelRef = React.useRef(null);

      React.useEffect(() => {
        const saved = readLevel();
        if (saved > 0) sendLevel(saved);
      }, []);

      React.useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          if (buttonRef.current?.contains(event.target)) return;
          if (panelRef.current?.contains(event.target)) return;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('mousedown', onPointerDown);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);

      const toggle = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          setAnchor({
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 208)),
            bottom: Math.max(8, window.innerHeight - rect.top + 8),
          });
        }
        setOpen((value) => !value);
      };

      const commit = (next) => {
        setLevel(next);
        saveLevel(next);
        sendLevel(next);
      };

      const panel = open && anchor
        ? React.createElement(
            'div',
            {
              ref: panelRef,
              style: {
                position: 'fixed',
                left: anchor.left + 'px',
                bottom: anchor.bottom + 'px',
                width: 200,
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,0.24))',
                background: 'var(--dsw-alias-bg-layer-1, #ffffff)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                zIndex: 2147483000,
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 12,
                  color: 'var(--dsw-alias-label-secondary, inherit)',
                },
              },
              React.createElement('span', null, '窗口透明'),
              React.createElement('span', null, level + '%'),
            ),
            React.createElement('input', {
              type: 'range',
              min: 0,
              max: MAX_LEVEL,
              step: 1,
              value: level,
              'aria-label': '窗口透明度',
              onChange: (event) => commit(Number(event.target.value)),
              style: { width: '100%', accentColor: 'var(--dsw-alias-brand-primary, #4d6bfe)' },
            }),
          )
        : null;

      return React.createElement(
        'div',
        { style: { position: 'relative', display: 'inline-flex' } },
        React.createElement(
          'button',
          {
            ref: buttonRef,
            type: 'button',
            onClick: toggle,
            title: '窗口透明度',
            'aria-label': '窗口透明度',
            'aria-expanded': open,
            style: buttonStyle,
          },
          React.createElement(
            'svg',
            { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
            React.createElement('circle', {
              cx: 8,
              cy: 8,
              r: 6.2,
              stroke: 'currentColor',
              strokeWidth: 1.4,
            }),
            React.createElement('path', { d: 'M8 1.8A6.2 6.2 0 0 1 8 14.2Z', fill: 'currentColor' }),
          ),
        ),
        panel,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'ui-transparency', order: 10, label: '窗口透明度' },
            Transparency,
          ),
        );
      },
    };
  },
});
