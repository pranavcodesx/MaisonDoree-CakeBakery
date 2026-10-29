import mongoose from 'mongoose';

// Newsletter sign-ups and contact-form messages, so nothing typed on the site is lost.
const subscriberSchema = new mongoose.Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true } }, { timestamps: true });
export const Subscriber = mongoose.model('Subscriber', subscriberSchema);

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 20 },
  subject: { type: String, trim: true, maxlength: 80 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  handled: { type: Boolean, default: false },
}, { timestamps: true });
export const Message = mongoose.model('Message', messageSchema);
