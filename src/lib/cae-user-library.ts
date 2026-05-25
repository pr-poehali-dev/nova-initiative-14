/**
 * Пользовательская библиотека сечений и материалов в localStorage.
 * Сохраняет вручную созданные параметрические сечения (прямоугольник, круг, профтруба)
 * и пользовательские материалы, чтобы при следующем открытии каталога они были доступны
 * без повторного ввода.
 *
 * Ключи в localStorage:
 *   cae:user_sections  — массив SectionCatalogEntry с category="custom_*"
 *   cae:user_materials — массив MaterialCatalogEntry с category="custom"
 *
 * Хранилище — per-user-per-browser. При смене устройства/браузера данные не переносятся.
 * При желании можно вынести в БД per-user (отдельная таблица cae_user_library) — это M5.4.
 */
import type { Section, Material } from "@/lib/cae-model";
import type { SectionCatalogEntry, MaterialCatalogEntry } from "@/lib/cae-catalog";

const SECTIONS_KEY = "cae:user_sections";
const MATERIALS_KEY = "cae:user_materials";
const MAX_ENTRIES = 50; // защита от бесконечного роста

// ============ Сечения ============

export function loadUserSections(): SectionCatalogEntry[] {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((s) => s && typeof s === "object" && s.id && s.A);
  } catch {
    return [];
  }
}

function saveUserSections(list: SectionCatalogEntry[]) {
  try {
    const trimmed = list.slice(-MAX_ENTRIES);
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage может быть отключён в private mode — молча игнорируем */
  }
}

/**
 * Сохранить пользовательское сечение. Дедупликация по id:
 * если сечение с таким id уже есть — обновляем; иначе добавляем в конец.
 */
export function saveUserSection(section: SectionCatalogEntry | Section): void {
  // Сохраняем только параметрические/пользовательские (не каталожные ГОСТ)
  const cat = (section as SectionCatalogEntry).category || "";
  const isGost = cat === "i_8239" || cat === "u_8240" || cat === "l_8509" || cat === "pipe_round";
  if (isGost) return;

  const entry: SectionCatalogEntry = {
    ...(section as SectionCatalogEntry),
    type: (section as SectionCatalogEntry).type || "custom",
    category: cat || "custom",
  };

  const existing = loadUserSections();
  const idx = existing.findIndex((s) => s.id === entry.id);
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  saveUserSections(existing);
}

export function removeUserSection(id: string): void {
  saveUserSections(loadUserSections().filter((s) => s.id !== id));
}

export function clearUserSections(): void {
  try {
    localStorage.removeItem(SECTIONS_KEY);
  } catch {
    /* ignore */
  }
}

// ============ Материалы ============

export function loadUserMaterials(): MaterialCatalogEntry[] {
  try {
    const raw = localStorage.getItem(MATERIALS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((m) => m && typeof m === "object" && m.id && m.E);
  } catch {
    return [];
  }
}

function saveUserMaterials(list: MaterialCatalogEntry[]) {
  try {
    const trimmed = list.slice(-MAX_ENTRIES);
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function saveUserMaterial(material: MaterialCatalogEntry | Material): void {
  // Сохраняем только если это НЕ из каталога ГОСТ (у пользовательских id начинается с "custom_mat_")
  const id = material.id || "";
  const cat = (material as MaterialCatalogEntry).category || "";
  const isGost = cat === "steel" || cat === "cast_iron" || cat === "aluminium" || cat === "alloy";
  // Пользовательские могут не иметь category — считаем их custom
  if (isGost && !id.startsWith("custom_mat_")) return;

  const entry: MaterialCatalogEntry = {
    ...(material as MaterialCatalogEntry),
    category: "custom",
  };

  const existing = loadUserMaterials();
  const idx = existing.findIndex((m) => m.id === entry.id);
  if (idx >= 0) {
    existing[idx] = entry;
  } else {
    existing.push(entry);
  }
  saveUserMaterials(existing);
}

export function removeUserMaterial(id: string): void {
  saveUserMaterials(loadUserMaterials().filter((m) => m.id !== id));
}

export function clearUserMaterials(): void {
  try {
    localStorage.removeItem(MATERIALS_KEY);
  } catch {
    /* ignore */
  }
}
