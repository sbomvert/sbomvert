'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [form, setForm]       = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<'success' | 'error' | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Request failed');
      setResult('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setResult('error');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'p-3 rounded-input bg-input border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-background text-foreground p-6 rounded-card shadow-xl w-full max-w-md border border-border"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            exit={{ scale: 0.9,    opacity: 0 }}
          >
            <h2 className="text-heading font-bold mb-4">Talk to an expert</h2>

            <div className="flex flex-col gap-3">
              <input    name="name"    placeholder="Your name"       value={form.name}    onChange={handleChange} className={fieldClass} />
              <input    name="email"   placeholder="Your email"      value={form.email}   onChange={handleChange} className={fieldClass} />
              <textarea name="message" placeholder="How can we help?" rows={4} value={form.message} onChange={handleChange} className={fieldClass} />
            </div>

            {result === 'success' && <p className="text-success mt-3 text-body-sm">Message sent!</p>}
            {result === 'error'   && <p className="text-error   mt-3 text-body-sm">Something went wrong.</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-button bg-input text-foreground border border-border hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
