import AsyncImg from './AsyncImg.jsx';
import { cakeImage } from '../lib/images.js';

export default function CakeImage({ cake, variant = 0, style }) {
  return (
    <div className="art" style={{ width: '100%', height: '100%', ...style }}>
      <AsyncImg src={cakeImage(cake, cake?.images?.length ? 0 : variant)} alt={cake?.name} fallbackLabel={cake?.name} />
    </div>
  );
}
