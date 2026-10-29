export default function Icon({ name, size, className = '', style }) {
  const s = size ? { width: size, height: size, ...style } : style;
  return <svg className={`icon ${className}`} style={s} aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}
