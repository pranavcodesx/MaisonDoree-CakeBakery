import CakeImage from './CakeImage.jsx';
import Icon from './Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import { fmtPrice, weightLabel } from '../lib/format.js';
import { baseWeight } from '../lib/constants.js';

export function addCakeToCart(cart, cake, opts = {}) {
  cart.add({
    kind: 'catalog', cakeId: cake._id, weight: opts.weight || baseWeight(cake), flavor: opts.flavor || cake.flavor, qty: opts.qty || 1,
    message: opts.message || '', candle: opts.candle, knife: opts.knife, photoUrl: opts.photoUrl,
    snap: { name: cake.name, images: cake.images, category: cake.category, theme: cake.theme },
  });
}

export default function ProductCard({ cake, idx = 0 }) {
  const cart = useCart(); const { openProduct } = useUI(); const toast = useToast(); const wish = useWishlist();
  const isWish = wish.has(cake._id);
  const off = cake.was ? Math.round((1 - cake.price / cake.was) * 100) : 0;
  return (
    <div className="prod-card">
      <div className="prod-media" onClick={() => openProduct(cake)}>
        <CakeImage cake={cake} variant={idx % 3} />
        <div className="prod-badges">
          {cake.tags?.includes('bestseller') && <span className="badge gold">Bestseller</span>}
          {cake.tags?.includes('new') && <span className="badge sage">New</span>}
          {off > 0 && <span className="badge terracotta">{off}% OFF</span>}
        </div>
        <div className="prod-actions">
          <button className={isWish ? 'active' : ''} title="Wishlist" onClick={e => { e.stopPropagation(); wish.toggle(cake._id); }}>
            <Icon name={isWish ? 'heart-fill' : 'heart'} />
          </button>
        </div>
        <div className="prod-qv">Quick View</div>
      </div>
      <div className="prod-body">
        <div className="prod-cat">{cake.category}</div>
        <div className="prod-name" onClick={() => openProduct(cake)}>{cake.name}</div>
        <div className="prod-meta">
          {cake.reviewCount > 0
            ? <><span className="rate"><Icon name="star" /> {cake.rating}</span><span className="dot" /><span>{cake.reviewCount} reviews</span></>
            : <span>No reviews yet</span>}
          <span className="dot" /><span>{weightLabel(cake.weightG)}</span>
          <span className={`egg-badge ${cake.egg ? 'egg' : ''}`} title={cake.egg ? 'Contains egg' : 'Eggless'} />
        </div>
        <div className="prod-foot">
          <div className="prod-price"><span className="now">{fmtPrice(cake.price)}</span>{cake.was && <span className="was">{fmtPrice(cake.was)}</span>}</div>
          <button className="prod-add" title="Add to cart" onClick={e => { e.stopPropagation(); addCakeToCart(cart, cake); toast(`${cake.name} added to cart`, 'success'); }}>
            <Icon name="plus" />
          </button>
        </div>
      </div>
    </div>
  );
}
