// Flow shown to customers on the Track page.
export const FLOW = ['Order Placed', 'Confirmed', 'Baking', 'Decorating', 'Packed', 'Out for Delivery', 'Delivered'];
export const STATUSES = [...FLOW, 'Cancelled'];
export const STATUS_TONE = { 'Order Placed': 'gold', Confirmed: 'blue', Baking: 'blue', Decorating: 'blue', Packed: 'blue', 'Out for Delivery': 'sage', Delivered: 'sage', Cancelled: 'terra' };
export const PAYMENT_LABEL = { cod: 'Pay on delivery', paid: 'Paid', pending: 'Pending', failed: 'Failed', refund_pending: 'Refund due', refunded: 'Refunded' };
export const PAYMENT_TONE = { cod: 'gold', paid: 'sage', pending: 'gray', failed: 'terra', refund_pending: 'terra', refunded: 'blue' };

export const TAGS = [['bestseller', 'Bestseller'], ['new', 'New'], ['trending', 'Trending'], ['seasonal', 'Seasonal'], ['premium', 'Premium']];
export const THEMES = [['chocolate', 'Chocolate'], ['vanilla', 'Vanilla'], ['redvelvet', 'Red velvet'], ['fruit', 'Fruit'], ['pistachio', 'Pistachio'], ['gold', 'Golden'], ['blush', 'Blush pink'], ['caramel', 'Caramel']];
// Same as the website: an occasion's slug is made from its name (Website → Occasions).
export const occasionSlug = name => name.toLowerCase().replace(/'/g, '').replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '');
export const WEIGHTS = [[250, '250 g'], [300, '300 g'], [400, '400 g'], [450, '450 g'], [500, '500 g'], [600, '600 g'], [900, '900 g'], [1000, '1 kg'], [1200, '1.2 kg'], [1500, '1.5 kg'], [2000, '2 kg'], [3000, '3 kg']];
// only these sizes can be bought in several weights; any other size is sold as one fixed pack
export const SIZED = [1000, 1500, 2000, 3000];
export const TOPPER_LABEL = { candles: 'Candles', cherries: 'Cherries', gold: 'Gold leaf', berries: 'Berries', none: 'No topper' };
