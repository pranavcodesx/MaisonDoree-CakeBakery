export default function Icon({ name, size, style, className = '' }) {
  const s = size ? { width: size, height: size, ...style } : style;
  return <svg className={`icon ${className}`} style={s} aria-hidden="true"><use href={`#ic-${name}`} /></svg>;
}
