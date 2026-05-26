/**
 * Шаблоны типовых задач CAE для быстрого старта пользователя.
 * Каждый шаблон возвращает готовую FrameModel: узлы, элементы, опоры, нагрузки.
 *
 * Используется на странице создания проекта и в галерее «Примеры».
 * Превью — обычный SVG path d-атрибут, рендерится миниатюрой.
 */
import type { FrameModel } from "@/lib/cae-model";
import type { FrameTemplate } from "./cae-catalog-types";
import { MATERIAL_CATALOG } from "./cae-materials";
import { I_BEAMS_8239 } from "./cae-sections";

const DEFAULT_MAT = MATERIAL_CATALOG.find((m) => m.id === "steel_st3")!;
const DEFAULT_SEC = I_BEAMS_8239.find((s) => s.id === "I20")!;

function emptyBase(): FrameModel {
  return {
    meta: { dim: "2d" },
    materials: [{ ...DEFAULT_MAT }],
    sections: [{ ...DEFAULT_SEC }],
    nodes: [],
    elements: [],
    boundary_conditions: [],
    loads: [],
    analysis_options: { diagram_subdivisions: 20 },
  };
}

export const FRAME_TEMPLATES: FrameTemplate[] = [
  {
    id: "empty",
    name: "Пустой проект",
    description: "Начать с нуля. Только сетка и оси координат.",
    preview: "M10,30 L70,30 M10,30 L10,5",
    build: () => emptyBase(),
  },
  {
    id: "cantilever",
    name: "Консольная балка",
    description: "Защемлённый левый край, точечная сила P=1000 Н на свободном конце. L=2 м.",
    preview: "M5,15 L5,35 L8,38 L11,35 L8,32 L5,35 M5,25 L65,25 M65,20 L65,30 M65,30 L60,28 M65,30 L60,32",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [2, 0, 0] },
      ],
      elements: [{ id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id }],
      boundary_conditions: [{ id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] }],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n2", force: [0, -1000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "simply_supported",
    name: "Балка на двух опорах",
    description: "Шарнир и каток. Сосредоточенная сила в середине, P=2000 Н, L=4 м.",
    preview: "M5,25 L65,25 M5,28 L5,35 L8,35 M2,38 L8,38 M62,28 L62,35 L65,35 M59,38 L65,38 M35,15 L35,25 L32,22 M35,25 L38,22",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [2, 0, 0] },
        { id: "n3", coords: [4, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n3", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n2", force: [0, -2000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "udl_beam",
    name: "Балка с распределённой нагрузкой",
    description: "Шарнир и каток. Равномерная q=1000 Н/м по всей длине L=6 м.",
    preview: "M5,25 L65,25 M5,18 L65,18 M5,18 L5,25 M15,18 L15,25 M25,18 L25,25 M35,18 L35,25 M45,18 L45,25 M55,18 L55,25 M65,18 L65,25 M5,25 L5,35 L8,35 M62,25 L62,35 L65,35",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [6, 0, 0] },
      ],
      elements: [{ id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id }],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "distributed_uniform", element_id: "e1", load_local_per_length: [0, -1000, 0] }],
    }),
  },
  {
    id: "overhang",
    name: "Балка с консолью",
    description: "Шарнир + каток с консолью на правом конце. Сила P=3000 Н на консоли.",
    preview: "M5,25 L65,25 M5,28 L5,35 L8,35 M45,28 L45,35 L48,35 M65,15 L65,25 L62,22 M65,25 L68,22",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [4, 0, 0] },
        { id: "n3", coords: [6, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -3000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "portal_frame",
    name: "П-образная рама",
    description: "Портальная рама: 2 защемлённых стойки 3 м + ригель 4 м. Горизонтальная сила 2000 Н сверху.",
    preview: "M15,40 L15,10 L55,10 L55,40 M15,40 L18,42 M55,40 L52,42 M55,40 L58,42 M15,10 L5,10 L8,8 M5,10 L8,12",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [0, 3, 0] },
        { id: "n3", coords: [4, 3, 0] },
        { id: "n4", coords: [4, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e3", node_start: "n3", node_end: "n4", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
        { id: "bc2", node_id: "n4", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n2", force: [2000, 0, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "l_frame",
    name: "Г-образная рама",
    description: "Стойка 3 м + ригель 3 м. Защемление снизу, сила 1500 Н на свободном конце.",
    preview: "M15,40 L15,10 L55,10 M15,40 L18,42 M15,40 L12,42 M55,10 L55,5 L52,8 M55,5 L58,8",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [0, 3, 0] },
        { id: "n3", coords: [3, 3, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -1500, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "truss_simple",
    name: "Простая ферма (треугольник)",
    description: "Двухопорная ферма из 3 стержней. Сила в верхнем узле 5000 Н.",
    preview: "M5,40 L65,40 L35,10 L5,40 M5,40 L8,42 M62,40 L65,42 M35,10 L32,8 M35,10 L38,8",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [4, 0, 0] },
        { id: "n3", coords: [2, 2, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n1", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e3", node_start: "n3", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -5000, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "portal_pitched",
    name: "Двускатная рама (треугольный ригель)",
    description: "2 стойки 4 м + наклонный ригель с коньком на высоте 5 м. Снеговая 800 Н в коньке.",
    preview: "M15,40 L15,15 L35,5 L55,15 L55,40 M15,40 L12,42 M15,40 L18,42 M55,40 L52,42 M55,40 L58,42 M35,5 L32,2 M35,5 L38,2",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [0, 4, 0] },
        { id: "n3", coords: [3, 5, 0] },
        { id: "n4", coords: [6, 4, 0] },
        { id: "n5", coords: [6, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e3", node_start: "n3", node_end: "n4", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e4", node_start: "n4", node_end: "n5", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
        { id: "bc2", node_id: "n5", type: "fixed", constrained_dofs: ["ux", "uy", "rz"] },
      ],
      loads: [{ id: "L1", type: "nodal_force", node_id: "n3", force: [0, -800, 0], moment: [0, 0, 0] }],
    }),
  },
  {
    id: "two_span_continuous",
    name: "Двухпролётная неразрезная балка",
    description: "3 опоры (шарнир + 2 катка), 2 пролёта по 4 м, равномерная нагрузка q=1500 Н/м.",
    preview: "M5,25 L65,25 M5,18 L65,18 M5,18 L5,25 M15,18 L15,25 M25,18 L25,25 M35,18 L35,25 M45,18 L45,25 M55,18 L55,25 M65,18 L65,25 M5,25 L5,35 L8,35 M35,25 L35,35 L38,35 M62,25 L62,35 L65,35",
    build: () => ({
      ...emptyBase(),
      nodes: [
        { id: "n1", coords: [0, 0, 0] },
        { id: "n2", coords: [4, 0, 0] },
        { id: "n3", coords: [8, 0, 0] },
      ],
      elements: [
        { id: "e1", node_start: "n1", node_end: "n2", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
        { id: "e2", node_start: "n2", node_end: "n3", material_id: DEFAULT_MAT.id, section_id: DEFAULT_SEC.id },
      ],
      boundary_conditions: [
        { id: "bc1", node_id: "n1", type: "pinned", constrained_dofs: ["ux", "uy"] },
        { id: "bc2", node_id: "n2", type: "roller_y", constrained_dofs: ["uy"] },
        { id: "bc3", node_id: "n3", type: "roller_y", constrained_dofs: ["uy"] },
      ],
      loads: [
        { id: "L1", type: "distributed_uniform", element_id: "e1", load_local_per_length: [0, -1500, 0] },
        { id: "L2", type: "distributed_uniform", element_id: "e2", load_local_per_length: [0, -1500, 0] },
      ],
    }),
  },
];
