/**
 * /credits names the design v2 homepage's pictures only while that homepage is on (redesign plan C7): the AI
 * image and its maker, the stated changes to the portraits, and Anand's different photo. With the switch off the
 * page is today's (Credits.today.test.tsx).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import Credits from './Credits';

vi.mock('@/design/designFlags', () => ({ DESIGN_V2_LIVE: true, HOME_V2_LIVE: true }));

describe('/credits with the v2 homepage on', () => {
  it('credits the AI homepage image, the portrait changes and Anand 2016', () => {
    render(<HelmetProvider><MemoryRouter><Credits /></MemoryRouter></HelmetProvider>);
    expect(screen.getByText('Homepage Image')).toBeTruthy();
    expect(screen.getByText(/AI image that our co-founder made with ChatGPT/)).toBeTruthy();
    expect(screen.getByText(/tone them\s+sepia/)).toBeTruthy();
    expect(screen.getByText(/Anand \(homepage\), 2016/)).toBeTruthy();
    expect(screen.getByText('Photo: Wolfgang Jekel')).toBeTruthy();
  });
});
