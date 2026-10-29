export default function NotFound() {
  return (
<section className="page active" data-page="404">
  <div className="page-404">
    <div className="big404">404</div>
    <svg viewBox="0 0 120 120" fill="none">
      <ellipse cx="60" cy="100" rx="42" ry="8" fill="rgba(43,24,16,.08)"/>
      <path d="M25 70a35 35 0 0 1 70 0z" fill="#F0D9C4"/>
      <rect x="25" y="70" width="70" height="18" rx="6" fill="#E9C7A6"/>
      <path d="M40 62c3-3 5-3 8 0M55 58c3-3 5-3 8 0M70 62c3-3 5-3 8 0" stroke="#7A4B32" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
    <h2 className="h-section">This slice went missing.</h2>
    <p className="lede" style={{margin: "12px 0 26px"}}>The page you're looking for isn't on the menu. Let's get you back to something sweeter.</p>
    <button className="btn btn-primary" data-nav="home">Back to Home</button>
  </div>
</section>

  );
}
