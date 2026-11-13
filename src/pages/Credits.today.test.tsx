/** With the v2 homepage off, /credits does not name pictures nobody can see (redesign plan C7). */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import Credits from './Credits';
import { HOME_V2_LIVE } from '@/design/designFlags';

describe('/credits with the v2 homepage off', () => {
  it.runIf(!HOME_V2_LIVE)('has no homepage image and no homepage portrait entry', () => {
    render(<HelmetProvider><MemoryRouter><Credits /></MemoryRouter></HelmetProvider>);
    expect(screen.queryByText('Homepage Image')).toBeNull();
    expect(screen.queryByText(/\(homepage\)/)).toBeNull();
  });
});
