import { useState, useEffect } from "react";
import funcUrls from "../../backend/func2url.json";

export interface ContactsData {
  telegram: string;
  telegram_link: string;
  phone: string;
  phone_tel: string;
  working_hours: string;
  working_hours_label: string;
  city: string;
  timezone: string;
  address: string;
  email: string;
  vk: string;
  instagram: string;
}

const FALLBACK: ContactsData = {
  telegram: "@diplom_inzh",
  telegram_link: "https://t.me/diplom_inzh",
  phone: "+7 (343) 200-00-00",
  phone_tel: "tel:+73432000000",
  working_hours: "10:00–20:00",
  working_hours_label: "Ежедневно 10:00–20:00",
  city: "Екатеринбург",
  timezone: "UTC+5",
  address: "Екатеринбург, УрФУ",
  email: "",
  vk: "",
  instagram: "",
};

let cached: ContactsData | null = null;
let fetchPromise: Promise<ContactsData> | null = null;

const fetchContacts = (): Promise<ContactsData> => {
  if (cached) return Promise.resolve(cached);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(funcUrls["get-contacts"])
    .then((r) => r.json())
    .then((data) => {
      const raw = data.contacts || {};
      const result: ContactsData = { ...FALLBACK };
      for (const key of Object.keys(FALLBACK) as (keyof ContactsData)[]) {
        if (raw[key]?.value !== undefined && raw[key].value !== "") {
          result[key] = raw[key].value;
        }
      }
      cached = result;
      return cached;
    })
    .catch(() => {
      fetchPromise = null;
      return FALLBACK;
    });

  return fetchPromise;
};

export default function useContacts() {
  const [contacts, setContacts] = useState<ContactsData>(cached || FALLBACK);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    fetchContacts().then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, []);

  return { contacts, loading };
}
