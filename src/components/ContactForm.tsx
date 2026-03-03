import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const inputClasses =
  'w-full px-4 py-3 bg-white border border-[var(--sol-sage)] text-[var(--sol-charcoal)] placeholder:text-[var(--sol-sage)] focus:outline-none focus:border-[var(--sol-caramel)] transition-colors font-serif text-base';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(e.currentTarget),
      });
      const body = await res.json();
      if (res.ok) {
        setStatus('sent');
        (e.target as HTMLFormElement).reset();
      } else {
        setErrorMsg(body.error ?? 'Something went wrong.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-center font-serif text-lg" style={{ color: 'var(--sol-forest)' }}>
        Thank you — I'll be in touch soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-lg mx-auto">
      {status === 'error' && (
        <p className="text-sm font-sans" style={{ color: 'var(--sol-blush)' }}>{errorMsg}</p>
      )}

      {/* honeypot */}
      <input name="website" type="text" tabIndex={-1} className="hidden" autoComplete="off" />

      <label className="flex flex-col gap-1">
        <span className="font-sans text-xs tracking-widest uppercase text-[var(--sol-charcoal)]">Name</span>
        <input name="name" type="text" required autoComplete="name" className={inputClasses} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-sans text-xs tracking-widest uppercase text-[var(--sol-charcoal)]">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputClasses} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-sans text-xs tracking-widest uppercase text-[var(--sol-charcoal)]">Message</span>
        <textarea name="message" required rows={6} className={inputClasses + ' resize-y'} />
      </label>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="self-start font-sans text-xs tracking-widest uppercase px-8 py-3 bg-[var(--sol-caramel)] text-[var(--sol-cream)] hover:bg-[var(--sol-forest)] transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {status === 'sending' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
