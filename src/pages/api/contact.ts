import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const data = await request.formData();
  const name = data.get('name')?.toString().trim();
  const email = data.get('email')?.toString().trim();
  const message = data.get('message')?.toString().trim();
  // simple honeypot — bots fill this, humans don't see it
  const honeypot = data.get('website')?.toString();

  if (honeypot) return json({ error: 'rejected' }, 400);
  if (!name || !email || !message) return json({ error: 'All fields required.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email.' }, 400);

  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    // Resend sandbox: use onboarding@resend.dev until you verify a domain
    from: import.meta.env.CONTACT_FROM ?? 'onboarding@resend.dev',
    to: import.meta.env.CONTACT_TO,
    replyTo: email,
    subject: `Sol Photography — message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
  });

  if (error) {
    console.error('Resend error', error);
    return json({ error: 'Failed to send. Please try again.' }, 500);
  }

  return json({ success: true }, 200);
};
