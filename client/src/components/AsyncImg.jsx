import { useEffect, useState } from 'react';
import { fallbackImageData } from '../lib/images.js';

// Fades in when loaded, and swaps to a branded placeholder if the photo can't load.
export default function AsyncImg({ src, alt = '', fallbackLabel, className = 'async-image', ...rest }) {
  const [st, setSt] = useState('');
  useEffect(() => setSt(''), [src]);
  const failed = st.includes('is-fallback');
  return (
    <img
      {...rest}
      className={`${className} ${st}`.trim()}
      src={failed ? fallbackImageData(fallbackLabel || alt) : src}
      alt={alt} loading="lazy" decoding="async"
      onLoad={() => setSt(s => (s.includes('is-fallback') ? s : 'is-loaded'))}
      onError={() => setSt('is-fallback is-loaded')}
    />
  );
}
