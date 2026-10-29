let loading;
// Loads Razorpay's checkout script once, on demand.
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve; s.onerror = () => { loading = null; reject(new Error('Could not load the payment window. Check your connection and try again.')); };
      document.body.appendChild(s);
    });
  }
  return loading;
}
