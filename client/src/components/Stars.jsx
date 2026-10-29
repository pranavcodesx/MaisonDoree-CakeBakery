import Icon from './Icon.jsx';

export default function Stars({ rating, size = 13 }) {
  return <>{[1, 2, 3, 4, 5].map(i => <Icon key={i} name="star" style={{ width: size, height: size, color: i <= Math.round(rating) ? 'currentColor' : 'var(--line)' }} />)}</>;
}
