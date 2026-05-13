import { useState } from 'react';

const PALETTE = ['#a855f7', '#22d3ee', '#34d399', '#f472b6', '#fbbf24', '#fb923c', '#60a5fa', '#f87171'];

function nameColor(name) {
  if (!name) return PALETTE[0];
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

export { nameColor };

export default function UserAvatar({ name, avatarUrl, size = 28, className = '', title: titleProp }) {
  const [imgError, setImgError] = useState(false);
  const color = nameColor(name);
  const style = { width: size, height: size, minWidth: size, minHeight: size };
  const titleAttr = titleProp ?? name;

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={titleAttr}
        className={`rounded-full object-cover shrink-0 avatar-in ${className}`}
        style={style}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 select-none avatar-in ${className}`}
      style={{
        ...style,
        background: `${color}22`,
        color,
        border: `1px solid ${color}40`,
        fontSize: Math.max(Math.round(size * 0.37), 8),
      }}
      title={titleAttr}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}
