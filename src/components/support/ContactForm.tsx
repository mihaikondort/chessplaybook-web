/**
 * The contact form (#43). It replaces a `mailto:` link that did nothing on a device
 * with no mail app, and which no real message ever came through (#41).
 *
 * Honest states only: "sent" is shown when the server answered that it stored the
 * message, and a failure keeps the text in the box and offers the address instead.
 * The page, browser and screen size go with the message, and the form says so.
 */
import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthContext';
import { logGA4Event, SUPPORT_SURFACES, type SupportSurface } from '@/services/analytics';
import { sendSupportMessage, SupportApiError, type SupportCategory } from '@/services/supportApi';

const TOPICS: Array<{ value: SupportCategory; label: string }> = [
  { value: 'problem', label: 'Something is not working' },
  { value: 'game_data', label: 'Game data' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Something else' },
];

/** Mirrors MESSAGE_MAX in backend/src/services/support/supportMessages.ts. */
export const MESSAGE_MAX = 5000;

const ADDRESS = 'contact@chessplaybook.com';

/** Where the visitor was before /contact: `?from=` from an entry point, else a same-site referrer. */
function originPage(fromParam: string | null): string | null {
  if (fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//')) return fromParam.slice(0, 300);
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.origin === window.location.origin && referrer.pathname !== '/contact') {
      return `${referrer.pathname}${referrer.search}`.slice(0, 300);
    }
  } catch {
    // An unreadable referrer is just an unknown page.
  }
  return null;
}

type Status =
  | { kind: 'editing' }
  | { kind: 'sending' }
  | { kind: 'sent'; withEmail: boolean }
  | { kind: 'failed'; text: string };

function failureText(error: unknown): string {
  if (error instanceof SupportApiError) {
    if (error.reason === 'invalid' && error.message) return error.message;
    if (error.reason === 'rate_limited' && error.message) return error.message;
    if (error.reason === 'rate_limited') {
      return `You have sent several messages in the last hour. Try again later, or email ${ADDRESS}.`;
    }
  }
  return `Your message did not send. Try again, or email ${ADDRESS}.`;
}

export default function ContactForm() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [category, setCategory] = useState<SupportCategory | ''>(() => {
    const topic = params.get('topic');
    return TOPICS.some(t => t.value === topic) ? (topic as SupportCategory) : '';
  });
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'editing' });
  const [page] = useState(() => originPage(params.get('from')));
  // Which door the visitor came through (#44); a typed-in URL is the page itself.
  const [surface] = useState<SupportSurface>(() => {
    const via = params.get('via');
    return (SUPPORT_SURFACES as readonly string[]).includes(via ?? '') ? (via as SupportSurface) : 'contact_page';
  });
  const ids = { topic: useId(), message: useId(), email: useId(), note: useId(), status: useId() };

  // A signed-in visitor can be answered at their account address; fill it in once.
  useEffect(() => {
    if (user?.email) setEmail(current => current || user.email);
  }, [user?.email]);

  const sending = status.kind === 'sending';
  const tooLong = message.length > MESSAGE_MAX;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!category) {
      setStatus({ kind: 'failed', text: 'Choose what your message is about.' });
      return;
    }
    if (!message.trim()) {
      setStatus({ kind: 'failed', text: 'Write a message first.' });
      return;
    }
    setStatus({ kind: 'sending' });
    const trimmedEmail = email.trim();
    try {
      await sendSupportMessage({
        category,
        message,
        email: trimmedEmail || null,
        page,
        // Reported, never used for layout: the screen size goes into the message only.
        viewport: `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
        website,
      });
      logGA4Event({ name: 'contact_form_submitted', params: { category, has_email: Boolean(trimmedEmail), surface } });
      setStatus({ kind: 'sent', withEmail: Boolean(trimmedEmail) });
      setMessage('');
    } catch (error) {
      const reason = error instanceof SupportApiError ? error.reason : 'network';
      logGA4Event({ name: 'contact_form_failed', params: { reason } });
      setStatus({ kind: 'failed', text: failureText(error) });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div role="status" className="space-y-3">
        <p className="text-lg font-semibold text-foreground">Message sent. Thank you.</p>
        <p className="text-muted-foreground">
          {status.withEmail ? 'We will reply to the email you gave.' : 'You left no email, so we cannot reply to this one.'}
        </p>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setStatus({ kind: 'editing' })}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={ids.note}>
      <div className="space-y-2">
        <Label htmlFor={ids.topic} className="text-foreground">What is it about?</Label>
        <Select value={category} onValueChange={value => setCategory(value as SupportCategory)} disabled={sending}>
          <SelectTrigger id={ids.topic} className="min-h-11">
            <SelectValue placeholder="Choose a topic" />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map(topic => (
              <SelectItem key={topic.value} value={topic.value}>{topic.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.message} className="text-foreground">Message</Label>
        <Textarea
          id={ids.message}
          value={message}
          onChange={event => setMessage(event.target.value)}
          rows={7}
          disabled={sending}
          aria-invalid={tooLong || undefined}
          placeholder={category === 'problem' ? 'What happened, and what did you expect?' : 'Write your message here.'}
          className="text-base"
        />
        {tooLong && (
          <p className="text-sm text-destructive">
            {message.length} of {MESSAGE_MAX} characters. Please shorten it.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.email} className="text-foreground">Your email (optional)</Label>
        <Input
          id={ids.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          disabled={sending}
          className="min-h-11 text-base"
        />
        <p className="text-sm text-muted-foreground">Add it if you want a reply.</p>
      </div>

      {/* The honeypot: hidden from people and from screen readers, filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
        </label>
      </div>

      <p id={ids.note} className="text-sm text-muted-foreground">
        We also send the page you came from, your browser and your screen size, to help us find a problem.
      </p>

      <div id={ids.status} role="alert" aria-live="assertive" className="min-h-6 text-sm text-destructive">
        {status.kind === 'failed' ? status.text : ''}
      </div>

      <Button type="submit" className="min-h-11 px-6" disabled={sending || tooLong}>
        {sending ? 'Sending...' : 'Send message'}
      </Button>
    </form>
  );
}
