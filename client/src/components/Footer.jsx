import NewsletterForm from './NewsletterForm.jsx';
import Icon from './Icon.jsx';

export default function Footer() {
  return (
    <footer>
      <div className="container footer-top">
        <div>
          <div className="footer-logo">Maison <span style={{ color: 'var(--gold-400)' }}>Dorée</span></div>
          <p style={{ padding: 0, marginBottom: 14 }}>Cakes baked to order, delivered with care — an atelier for life's sweetest moments.</p>
          <div className="footer-social">
            <a href="#" aria-label="Instagram"><Icon name="instagram" /></a><a href="#" aria-label="Facebook"><Icon name="facebook" /></a>
            <a href="#" aria-label="X"><Icon name="x-logo" /></a><a href="#" aria-label="YouTube"><Icon name="youtube" /></a>
          </div>
        </div>
        <div><h5>Quick Links</h5>
          <a href="/" data-nav="home">Home</a><a href="/" data-nav="shop">Cakes</a><a href="/" data-nav="builder">Custom Cake</a><a href="/" data-nav="about">About Us</a>
        </div>
        <div><h5>Support</h5>
          <a href="/" data-nav="contact">Contact Us</a><a href="/" data-nav="home-reviews">Reviews</a><a href="/" data-nav="contact">FAQ</a>
        </div>
        <div><h5>Account</h5>
          <a href="/" data-nav="profile">My Account</a><a href="/" data-nav="profile-wishlist">Wishlist</a><a href="/" data-nav="track">Track Order</a>
        </div>
        <div><h5>Stay Updated</h5>
          <p style={{ padding: '0 0 10px' }}>Offers, new flavors &amp; more.</p>
          <NewsletterForm placeholder="Your email" button="Join" btnClass="btn btn-gold btn-sm" />
        </div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Maison Dorée. All rights reserved.</span></div>
    </footer>
  );
}
