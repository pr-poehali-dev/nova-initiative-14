import { useEffect, useState } from "react";
import funcUrls from "../../backend/func2url.json";

export interface AboutSection {
  id: number;
  title: string;
  body: string;
  sort_order: number;
}

let cached: AboutSection[] | null = null;
let fetchPromise: Promise<AboutSection[]> | null = null;

const fetchAbout = (): Promise<AboutSection[]> => {
  if (cached) return Promise.resolve(cached);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(funcUrls["get-contacts"])
    .then((r) => r.json())
    .then((data) => {
      cached = Array.isArray(data.about) ? data.about : [];
      return cached;
    })
    .catch(() => {
      fetchPromise = null;
      return [];
    });

  return fetchPromise;
};

export default function useAbout() {
  const [sections, setSections] = useState<AboutSection[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    fetchAbout().then((data) => {
      setSections(data);
      setLoading(false);
    });
  }, []);

  return { sections, loading };
}
