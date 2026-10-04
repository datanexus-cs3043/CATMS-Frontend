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


