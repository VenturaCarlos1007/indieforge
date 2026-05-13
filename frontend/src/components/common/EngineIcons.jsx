import { Sparkles } from 'lucide-react';

const LOGOS = {
  unity:  'https://i.ibb.co/8g9Wv36d/Unity-Logo.png',
  unreal: 'https://i.ibb.co/0pvbtpKQ/Unreal-Engine-Logo.png',
  godot:  'https://i.ibb.co/QvQrHsgQ/Godot-Engine-Logo.png',
  roblox: 'https://cdn.simpleicons.org/roblox/E2231A',
};

export function EngineImg({ engine = 'custom', size = 24, style = {}, className = '' }) {
  if (!LOGOS[engine]) {
    return <Sparkles size={size} style={{ color: '#A855F7', ...style }} className={className} />;
  }
  return (
    <img
      src={LOGOS[engine]}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{ objectFit: 'contain', ...style }}
      className={className}
    />
  );
}
