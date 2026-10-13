import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { longChampionFixture } from '@/features/champions/testFixtures';
import { ChampionGalleryCard, ChampionGalleryCardSkeleton } from './ChampionGalleryCard';

function renderCard() {
  return render(
    <MemoryRouter>
      <ChampionGalleryCard champion={longChampionFixture} />
    </MemoryRouter>,
  );
}

describe('ChampionGalleryCard visual and interaction contract', () => {
  it('uses the Puzzles surface and 6px-radius grammar with responsive portrait-led anatomy', () => {
    const { container } = renderCard();
    const card = container.querySelector('article');
    expect(card).toHaveClass('surface-card', 'rounded-lg', 'overflow-hidden');
    expect(card?.className).toContain('grid-cols-[8rem_minmax(0,1fr)]');
    expect(card?.className).toContain('sm:flex-col');
    expect(screen.getByText(longChampionFixture.biography)).toHaveClass('line-clamp-3');
  });

  it('preserves explicit routes, accessible names and intrinsic lazy portrait dimensions', () => {
    renderCard();
    expect(screen.getByRole('link', { name: `View the Best 100 games by ${longChampionFixture.fullName}` })).toHaveAttribute(
      'href', '/champions/botvinnik/best-games',
    );
    expect(screen.getAllByRole('link', { name: `View all games by ${longChampionFixture.fullName}` })).toHaveLength(2);
    const portrait = document.querySelector('img[src*="Botvinnik"]');
    expect(portrait).toHaveAttribute('loading', 'lazy');
    expect(portrait).toHaveAttribute('width', '512');
    expect(portrait).toHaveAttribute('height', '512');
  });

  it('retains card geometry and displays initials when the portrait fails', () => {
    const { container } = renderCard();
    fireEvent.error(document.querySelector('img[src*="Botvinnik"]')!);
    expect(screen.getByText('MB')).toBeVisible();
    expect(container.querySelector('article')).toHaveClass('min-h-[13rem]');
  });

  it('shows the whole round portrait, centred, with no blurred copy behind it (#68)', () => {
    const { container } = render(
      <MemoryRouter>
        <ChampionGalleryCard champion={longChampionFixture} />
      </MemoryRouter>,
    );
    const portrait = document.querySelector('img[src*="Botvinnik"]');
    expect(portrait).toHaveClass('aspect-square', 'rounded-full', 'object-contain');
    expect(portrait).not.toHaveClass('object-cover');
    expect(container.querySelector('[style*="background-image"]')).toBeNull();
  });

  it('places the country flag beside the champion name instead of over the portrait', () => {
    const { container } = renderCard();
    const heading = screen.getByRole('heading', { name: longChampionFixture.fullName });
    const flag = container.querySelector<HTMLImageElement>('img[src*="flagcdn.com"]');
    const portraitLink = screen.getAllByRole('link', { name: `View all games by ${longChampionFixture.fullName}` })[0];

    expect(heading).toContainElement(flag);
    expect(portraitLink).not.toContainElement(flag);
  });

  it('matches loaded-card outer geometry and disables animation for reduced motion', () => {
    const { container } = render(<ChampionGalleryCardSkeleton />);
    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveClass('surface-card', 'rounded-lg', 'overflow-hidden', 'min-h-[13rem]');
    expect(container.querySelector('.motion-reduce\\:animate-none')).not.toBeNull();
  });
});
