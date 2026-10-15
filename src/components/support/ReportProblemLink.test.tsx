import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { contactHref } from './ReportProblemLink';

describe('contactHref (#44)', () => {
  it('chooses the topic, records the page and the door', () => {
    const url = new URL(contactHref('load_error', '/champions/carlsen/games?eco=B90'), 'https://x');
    expect(url.pathname).toBe('/contact');
    expect(url.searchParams.get('topic')).toBe('problem');
    expect(url.searchParams.get('from')).toBe('/champions/carlsen/games?eco=B90');
    expect(url.searchParams.get('via')).toBe('load_error');
  });

  it('leaves the topic open for a general door, and never records /contact as the page', () => {
    const url = new URL(contactHref('account_menu', '/contact', null), 'https://x');
    expect(url.searchParams.has('topic')).toBe(false);
    expect(url.searchParams.has('from')).toBe(false);
    expect(url.searchParams.get('via')).toBe('account_menu');
  });
});

describe('the app-wide error screen (#44)', () => {
  it('offers a way to tell us, as a plain link that works outside the router', () => {
    const Broken = () => { throw new Error('boom'); };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    quiet.mockRestore();
    const link = screen.getByRole('link', { name: 'Tell us what happened' });
    const url = new URL(link.getAttribute('href') ?? '', 'https://x');
    expect(url.pathname).toBe('/contact');
    expect(url.searchParams.get('via')).toBe('error_boundary');
    expect(url.searchParams.get('topic')).toBe('problem');
  });
});
