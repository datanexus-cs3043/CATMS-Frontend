import React, { useCallback, useEffect, useRef, useState } from 'react';

// Every photo placed in src/assets is picked up automatically (template art is skipped).
const photoModules = import.meta.glob('../assets/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const IGNORED = ['hero.png'];

export const clinicPhotos: string[] = Object.entries(photoModules)
  .filter(([path]) => !IGNORED.some(name => path.endsWith(`/${name}`)))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

/** Pick specific photos from src/assets by file name, in the order given. */
export const photosByName = (names: string[]): string[] =>
  names
    .map(name => Object.entries(photoModules).find(([path]) => path.endsWith(`/${name}`))?.[1])
    .filter((url): url is string => !!url);

export interface Slide {
  eyebrow: string;
  title: string;
  body?: string;
}

interface HeroSliderProps {
    slides: Slide[];
    actions?: React.ReactNode;
    interval?: number;
    className?: string;

    // pauses while the pointer is over the slider (off for full-screen backdrops)
    pauseOnHover?: boolean;
    // photos in stc/assets to use for slides.
    photos?: string[];
}
export const HeroSlider: React.FC<HeroSliderProps> = ({ slides, actions, interval = 6000, className = 'hero-slider', pauseOnHover = true, photos = clinicPhotos }) => {
  // Show at least one slide per photo, and never fewer than the text slides.
  const count = Math.max(slides.length, photos.length, 1);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const t = window.setTimeout(() => go(index + 1), interval);
    return () => window.clearTimeout(t);
  }, [index, paused, count, interval, go]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };

  const slide = slides[index % slides.length];

  return (
    <section
      className={`${className}${paused ? ' paused' : ''}`}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKey}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="MedSync highlights"
    >
      {Array.from({ length: count }).map((_, i) => {
        const photo = photos.length ? photos[i % photos.length] : null;
        return (
          <div key={i} className={`hero-slide${photo ? '' : ' pattern'}${i === index ? ' active' : ''}`} aria-hidden={i !== index}>
            {photo && <img src={photo} alt="" loading={i === 0 ? 'eager' : 'lazy'} />}
          </div>
        );
      })}
      <div className="hero-overlay" />

      <div className="hero-content" key={index} style={{ animation: 'fadeIn 0.6s ease' }} aria-live="polite">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h2>{slide.title}</h2>
        {slide.body && <p>{slide.body}</p>}
        {actions && <div className="hero-actions">{actions}</div>}
      </div>

      {count > 1 && (
        <div className="hero-caption">
          <div className="hero-dots">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                className={`hero-dot${i === index ? ' active' : ''}${i < index ? ' done' : ''}`}
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}`}
              >
                <span key={i === index ? `a${index}` : i} style={{ animationDuration: `${interval}ms` }} />
              </button>
            ))}
          </div>
          <div className="hero-arrows">
            <button className="hero-arrow" onClick={() => go(index - 1)} aria-label="Previous slide">Prev</button>
            <button className="hero-arrow" onClick={() => go(index + 1)} aria-label="Next slide">Next</button>
          </div>
        </div>
      )}
    </section>
  );
};