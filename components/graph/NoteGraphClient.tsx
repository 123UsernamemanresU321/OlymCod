"use client";

import {
  Brain,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  Focus,
  GitBranch,
  LocateFixed,
  Maximize2,
  Network,
  Pause,
  Pin,
  Play,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { NOTE_LINK_RELATIONS } from "@/lib/constants/daily";
import {
  CONCEPT_LEVEL_LABELS,
  MATH_TOPICS,
  NOTE_TYPES,
  PROBLEM_DIFFICULTY_LABELS,
  topicIncludes
} from "@/lib/constants/notes";
import { noteTypeDifficultyMeta } from "@/lib/constants/note-formats";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteLink } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export type GraphNote = Pick<
  Note,
  | "id"
  | "user_id"
  | "title"
  | "slug"
  | "topic"
  | "note_type"
  | "difficulty"
  | "description"
  | "tags"
  | "diagram_urls"
  | "recognition_triggers"
  | "false_uses"
  | "visibility"
  | "is_favorite"
  | "is_archived"
  | "created_at"
  | "updated_at"
  | "published_at"
> & {
  body_markdown?: string;
};

interface NoteGraphClientProps {
  notes: GraphNote[];
  links: NoteLink[];
  initialNoteId?: string | null;
}

type GraphMode = "global" | "local";
type LayoutMode = "force" | "topic" | "hierarchy" | "radial" | "grid";
type ClusterMode = "topic" | "type" | "component" | "none";
type ColorMode = "topic" | "type";
type SizeMode = "connections" | "level";
type QualityFilter = "any" | "missing-links" | "missing-metadata" | "strong";

type GraphVector = { x: number; y: number };
type SimNode = GraphVector & {
  id: string;
  note: GraphNote;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
  pinned: boolean;
  depth: number;
};
type SimLink = {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  link: NoteLink;
};
type PhysicsSettings = {
  repulsion: number;
  linkDistance: number;
  collisionRadius: number;
  centering: number;
  labelThreshold: number;
};
type Viewport = { scale: number; x: number; y: number };
type LinkSuggestion = {
  sourceNoteId: string;
  sourceTitle: string;
  targetNoteId: string;
  targetTitle: string;
  relationType: string;
  reason: string;
  confidence: number;
};

const GRAPH_SETTINGS_KEY = "olympiad-codex:graph-settings-v2";
const GRAPH_LAYOUT_KEY = "olympiad-codex:graph-layout-v2";
const GRAPH_SNAPSHOT_KEY = "olympiad-codex:graph-snapshot-v2";
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_PHYSICS: PhysicsSettings = {
  repulsion: 680,
  linkDistance: 142,
  collisionRadius: 22,
  centering: 0.025,
  labelThreshold: 1.3
};

const TOPIC_COLORS: Record<string, string> = {
  "Number Theory": "#2c5282",
  Combinatorics: "#0f766e",
  Algebra: "#1f7a5b",
  Geometry: "#8f1d15",
  Inequalities: "#8a5a00",
  "Formula Bank": "#475569",
  "Problem Patterns": "#6b4a00",
  Inbox: "#64748b",
  Mixed: "#334155"
};

const TYPE_COLORS: Record<string, string> = {
  Theorem: "#2c5282",
  Lemma: "#315f8f",
  Technique: "#0f766e",
  Trick: "#8a5a00",
  Formula: "#475569",
  "Formula Log": "#475569",
  Definition: "#1f7a5b",
  "Problem Pattern": "#0f766e",
  "Past Problem": "#8f1d15",
  "Common Mistake": "#b42318",
  Example: "#3b6f5f",
  Inbox: "#64748b"
};

const RELATION_STYLES: Record<string, { color: string; width: number; dash?: number[]; directional: boolean; label: string }> = {
  prerequisite: { color: "#d14b42", width: 1.8, directional: true, label: "Prerequisite" },
  "used together": { color: "#4a75a8", width: 1.35, directional: false, label: "Used Together" },
  related: { color: "#9aa5b3", width: 0.9, directional: false, label: "Related" },
  "commonly confused": { color: "#c0842d", width: 1.45, dash: [7, 5], directional: false, label: "Commonly Confused" },
  generalization: { color: "#2a8f62", width: 1.55, directional: true, label: "Generalization" },
  "special case": { color: "#2a8f62", width: 1.55, directional: true, label: "Special Case" },
  "stronger version": { color: "#0f766e", width: 1.55, directional: true, label: "Stronger Version" },
  "weaker version": { color: "#0f766e", width: 1.55, directional: true, label: "Weaker Version" },
  "example of": { color: "#64748b", width: 1.1, directional: true, label: "Example Of" }
};

function relationStyle(relation: string) {
  return RELATION_STYLES[relation] ?? { color: "#64748b", width: 1, directional: false, label: relation };
}

function relationMeaning(link: NoteLink, source?: GraphNote, target?: GraphNote) {
  const sourceTitle = source?.title ?? "Source note";
  const targetTitle = target?.title ?? "Target note";
  if (link.relation_type === "prerequisite") return `${targetTitle} is a prerequisite of ${sourceTitle}.`;
  if (link.relation_type === "generalization") return `${targetTitle} is a broader generalization of ${sourceTitle}.`;
  if (link.relation_type === "special case") return `${targetTitle} is a special case of ${sourceTitle}.`;
  if (link.relation_type === "stronger version") return `${targetTitle} is a stronger version related to ${sourceTitle}.`;
  if (link.relation_type === "weaker version") return `${targetTitle} is a weaker version related to ${sourceTitle}.`;
  if (link.relation_type === "commonly confused") return `${sourceTitle} and ${targetTitle} are commonly confused.`;
  if (link.relation_type === "used together") return `${sourceTitle} and ${targetTitle} are often used together.`;
  return `${sourceTitle} is linked to ${targetTitle}.`;
}

function primaryTopic(topic: string) {
  return MATH_TOPICS.find((item) => topicIncludes(topic, item)) ?? topic.split(/[,+/]/)[0]?.trim() ?? "Mixed";
}

function noteColor(note: GraphNote, mode: ColorMode) {
  if (mode === "type") return TYPE_COLORS[note.note_type] ?? "#334155";
  return TOPIC_COLORS[primaryTopic(note.topic)] ?? TOPIC_COLORS.Mixed;
}

function difficultyLabel(note: GraphNote) {
  if (!note.difficulty) return null;
  const meta = noteTypeDifficultyMeta(note.note_type);
  const scale = meta.kind === "problem" ? PROBLEM_DIFFICULTY_LABELS : CONCEPT_LEVEL_LABELS;
  return `${meta.label} ${note.difficulty}: ${scale[note.difficulty] ?? "Unlabeled"}`;
}

function noteHaystack(note: GraphNote) {
  return [
    note.title,
    note.description,
    note.topic,
    note.note_type,
    note.tags.join(" "),
    note.recognition_triggers.join(" "),
    note.false_uses.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function dedupeLinks(links: NoteLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.source_note_id}:${link.target_note_id}:${link.relation_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function degreeCounts(links: NoteLink[]) {
  const counts = new Map<string, { in: number; out: number; total: number }>();
  function ensure(id: string) {
    if (!counts.has(id)) counts.set(id, { in: 0, out: 0, total: 0 });
    return counts.get(id)!;
  }
  for (const link of links) {
    const source = ensure(link.source_note_id);
    const target = ensure(link.target_note_id);
    source.out += 1;
    source.total += 1;
    target.in += 1;
    target.total += 1;
  }
  return counts;
}

function getNeighborhood(seedId: string | null, links: NoteLink[], depth: number) {
  if (!seedId) return new Map<string, number>();
  const included = new Map<string, number>([[seedId, 0]]);
  let frontier = new Set([seedId]);
  for (let step = 1; step <= depth; step += 1) {
    const next = new Set<string>();
    for (const link of links) {
      if (frontier.has(link.source_note_id) && !included.has(link.target_note_id)) next.add(link.target_note_id);
      if (frontier.has(link.target_note_id) && !included.has(link.source_note_id)) next.add(link.source_note_id);
    }
    for (const id of next) included.set(id, step);
    frontier = next;
  }
  return included;
}

function shortestPath(startId: string, endId: string, links: NoteLink[], allowedIds: Set<string>, respectDirection: boolean, allowedRelations: Set<string>) {
  if (!startId || !endId || startId === endId) return startId ? [startId] : [];
  const adjacency = new Map<string, string[]>();
  for (const link of links) {
    if (!allowedIds.has(link.source_note_id) || !allowedIds.has(link.target_note_id)) continue;
    if (allowedRelations.size && !allowedRelations.has(link.relation_type)) continue;
    adjacency.set(link.source_note_id, [...(adjacency.get(link.source_note_id) ?? []), link.target_note_id]);
    if (!respectDirection) {
      adjacency.set(link.target_note_id, [...(adjacency.get(link.target_note_id) ?? []), link.source_note_id]);
    }
  }
  const queue = [startId];
  const previous = new Map<string, string | null>([[startId, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === endId) break;
    for (const next of adjacency.get(current) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }
  if (!previous.has(endId)) return [];
  const path: string[] = [];
  let current: string | null = endId;
  while (current) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }
  return path;
}

function connectedComponents(notes: GraphNote[], links: NoteLink[]) {
  const ids = new Set(notes.map((note) => note.id));
  const adjacency = new Map<string, string[]>();
  for (const note of notes) adjacency.set(note.id, []);
  for (const link of links) {
    if (!ids.has(link.source_note_id) || !ids.has(link.target_note_id)) continue;
    adjacency.get(link.source_note_id)?.push(link.target_note_id);
    adjacency.get(link.target_note_id)?.push(link.source_note_id);
  }
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const note of notes) {
    if (seen.has(note.id)) continue;
    const queue = [note.id];
    const component: string[] = [];
    seen.add(note.id);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components.sort((a, b) => b.length - a.length);
}

function loadPhysicsSettings() {
  if (typeof window === "undefined") return DEFAULT_PHYSICS;
  try {
    return { ...DEFAULT_PHYSICS, ...JSON.parse(window.localStorage.getItem(GRAPH_SETTINGS_KEY) ?? "{}") } as PhysicsSettings;
  } catch {
    return DEFAULT_PHYSICS;
  }
}

function hashToUnit(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash % 1000) / 1000;
}

function initialPosition(note: GraphNote, index: number, count: number) {
  const angle = hashToUnit(note.id) * Math.PI * 2 + (index / Math.max(count, 1)) * 0.4;
  const radius = 170 + hashToUnit(note.title) * 260;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function noteRadius(note: GraphNote, degree: number, sizeMode: SizeMode) {
  if (sizeMode === "level") return Math.max(4.2, Math.min(12, 4.5 + (note.difficulty ?? 2) * 0.7));
  return Math.max(4.5, Math.min(13, 4.8 + Math.sqrt(degree) * 2.1));
}

function targetPosition(note: GraphNote, index: number, notes: GraphNote[], layout: LayoutMode, selectedId: string | null, links: NoteLink[], components: string[][]) {
  if (layout === "grid") {
    const columns = Math.max(1, Math.ceil(Math.sqrt(notes.length)));
    return { x: (index % columns) * 135 - (columns * 135) / 2, y: Math.floor(index / columns) * 108 - 220 };
  }
  if (layout === "topic") {
    const groups = Array.from(new Set(notes.map((item) => primaryTopic(item.topic))));
    const groupIndex = groups.indexOf(primaryTopic(note.topic));
    const centerAngle = (groupIndex / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const centerRadius = Math.max(130, Math.min(360, groups.length * 56));
    const groupNotes = notes.filter((item) => primaryTopic(item.topic) === primaryTopic(note.topic));
    const noteIndex = groupNotes.findIndex((item) => item.id === note.id);
    const angle = (noteIndex / Math.max(groupNotes.length, 1)) * Math.PI * 2;
    const spread = 34 + Math.sqrt(groupNotes.length) * 15;
    return {
      x: Math.cos(centerAngle) * centerRadius + Math.cos(angle) * spread,
      y: Math.sin(centerAngle) * centerRadius + Math.sin(angle) * spread
    };
  }
  if (layout === "hierarchy") {
    const levels = new Map(notes.map((item) => [item.id, 0]));
    for (let iteration = 0; iteration < notes.length; iteration += 1) {
      let changed = false;
      for (const link of links) {
        if (link.relation_type !== "prerequisite") continue;
        const prerequisiteLevel = levels.get(link.target_note_id) ?? 0;
        const dependentLevel = levels.get(link.source_note_id) ?? 0;
        if (dependentLevel <= prerequisiteLevel) {
          levels.set(link.source_note_id, prerequisiteLevel + 1);
          changed = true;
        }
      }
      if (!changed) break;
    }
    const level = levels.get(note.id) ?? 0;
    const group = notes.filter((item) => (levels.get(item.id) ?? 0) === level);
    const groupIndex = group.findIndex((item) => item.id === note.id);
    return { x: level * 210 - 340, y: groupIndex * 82 - (group.length * 82) / 2 };
  }
  if (layout === "radial") {
    if (note.id === selectedId) return { x: 0, y: 0 };
    const depthMap = getNeighborhood(selectedId, links, 3);
    const depth = depthMap.get(note.id) ?? 3;
    const ring = notes.filter((item) => (depthMap.get(item.id) ?? 3) === depth);
    const ringIndex = ring.findIndex((item) => item.id === note.id);
    const angle = (ringIndex / Math.max(ring.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * (depth * 155), y: Math.sin(angle) * (depth * 155) };
  }
  if (components.length > 1) {
    const componentIndex = components.findIndex((component) => component.includes(note.id));
    const angle = (componentIndex / components.length) * Math.PI * 2;
    const radius = Math.min(340, components.length * 44);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }
  return { x: 0, y: 0 };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRelationLabel(relation: string) {
  return relation.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function edgeVisualEndpoints(source: SimNode, target: SimNode, relation: string) {
  // A stored prerequisite edge is dependent -> prerequisite. Draw it as prerequisite -> dependent.
  if (relation === "prerequisite") return { from: target, to: source };
  return { from: source, to: target };
}

export function NoteGraphClient({ notes, links, initialNoteId = null }: NoteGraphClientProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const viewportRef = useRef<Viewport>({ scale: 1, x: 0, y: 0 });
  const mouseRef = useRef<{ draggingId: string | null; panning: boolean; lastX: number; lastY: number }>({ draggingId: null, panning: false, lastX: 0, lastY: 0 });
  const animationRef = useRef<number | null>(null);
  const [graphLinks, setGraphLinks] = useState(() => dedupeLinks(links));
  const [mode, setMode] = useState<GraphMode>(initialNoteId ? "local" : "global");
  const [layout, setLayout] = useState<LayoutMode>(initialNoteId ? "radial" : "force");
  const [clusterMode, setClusterMode] = useState<ClusterMode>("topic");
  const [selectedId, setSelectedId] = useState(initialNoteId ?? notes[0]?.id ?? "");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [hoverId, setHoverId] = useState("");
  const [hoverEdgeId, setHoverEdgeId] = useState("");
  const [localDepth, setLocalDepth] = useState(1);
  const [query, setQuery] = useState("");
  const [showOnlyMatches, setShowOnlyMatches] = useState(false);
  const [fadeNonMatches, setFadeNonMatches] = useState(true);
  const [topic, setTopic] = useState("");
  const [noteType, setNoteType] = useState("");
  const [tag, setTag] = useState("");
  const [relation, setRelation] = useState("");
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(12);
  const [hasTriggersOnly, setHasTriggersOnly] = useState(false);
  const [hasFalseUsesOnly, setHasFalseUsesOnly] = useState(false);
  const [hasDiagramsOnly, setHasDiagramsOnly] = useState(false);
  const [hasRelatedOnly, setHasRelatedOnly] = useState(false);
  const [orphanOnly, setOrphanOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("any");
  const [showArrows, setShowArrows] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [darkCanvas, setDarkCanvas] = useState(true);
  const [colorMode, setColorMode] = useState<ColorMode>("topic");
  const [sizeMode, setSizeMode] = useState<SizeMode>("connections");
  const [physics, setPhysics] = useState<PhysicsSettings>(() => loadPhysicsSettings());
  const [paused, setPaused] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(() => new Set());
  const [linkMode, setLinkMode] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState(initialNoteId ?? "");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkRelation, setLinkRelation] = useState("related");
  const [pathStartId, setPathStartId] = useState("");
  const [pathEndId, setPathEndId] = useState("");
  const [pathRespectDirection, setPathRespectDirection] = useState(false);
  const [pathRelations, setPathRelations] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<LinkSuggestion[]>([]);
  const [possibleNewNotes, setPossibleNewNotes] = useState<Array<{ title: string; reason?: string }>>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 720 });
  const [hasAutoFitted, setHasAutoFitted] = useState(false);
  const [recentCutoff] = useState(() => Date.now() - RECENT_WINDOW_MS);
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const allDegree = useMemo(() => degreeCounts(graphLinks), [graphLinks]);
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((note) => note.tags))).filter(Boolean).sort(), [notes]);
  const orphanIds = useMemo(
    () => new Set(notes.filter((note) => (allDegree.get(note.id)?.total ?? 0) === 0).map((note) => note.id)),
    [allDegree, notes]
  );
  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(notes.filter((note) => noteHaystack(note).includes(q)).map((note) => note.id));
  }, [notes, query]);
  const components = useMemo(() => connectedComponents(notes, graphLinks), [graphLinks, notes]);

  const filteredNotes = useMemo(() => {
    const localDepths = mode === "local" ? getNeighborhood(selectedId || null, graphLinks, localDepth) : null;
    return notes.filter((note) => {
      const degree = allDegree.get(note.id)?.total ?? 0;
      const clusterKey = clusterMode === "type" ? note.note_type : clusterMode === "component" ? `Component ${components.findIndex((group) => group.includes(note.id)) + 1}` : primaryTopic(note.topic);
      if (hiddenIds.has(note.id)) return false;
      if (clusterMode !== "none" && collapsedClusters.has(clusterKey)) return false;
      if (topic && !topicIncludes(note.topic, topic)) return false;
      if (noteType && note.note_type !== noteType) return false;
      if (tag && !note.tags.includes(tag)) return false;
      if (note.difficulty && (note.difficulty < levelMin || note.difficulty > levelMax)) return false;
      if (hasTriggersOnly && !note.recognition_triggers.length) return false;
      if (hasFalseUsesOnly && !note.false_uses.length) return false;
      if (hasDiagramsOnly && !note.diagram_urls.length) return false;
      if (hasRelatedOnly && degree === 0) return false;
      if (orphanOnly && !orphanIds.has(note.id)) return false;
      if (recentOnly && new Date(note.updated_at).getTime() < recentCutoff) return false;
      if (qualityFilter === "missing-links" && degree > 0) return false;
      if (qualityFilter === "missing-metadata" && note.tags.length && note.description && note.difficulty) return false;
      if (qualityFilter === "strong" && (degree < 2 || !note.tags.length || !note.description)) return false;
      if (query.trim() && showOnlyMatches && !searchMatches.has(note.id)) return false;
      if (localDepths && !localDepths.has(note.id)) return false;
      if (relation) {
        const hasRelation = graphLinks.some(
          (link) =>
            link.relation_type === relation &&
            (link.source_note_id === note.id || link.target_note_id === note.id)
        );
        if (!hasRelation) return false;
      }
      return true;
    });
  }, [
    allDegree,
    clusterMode,
    collapsedClusters,
    components,
    graphLinks,
    hasDiagramsOnly,
    hasFalseUsesOnly,
    hasRelatedOnly,
    hasTriggersOnly,
    hiddenIds,
    levelMax,
    levelMin,
    localDepth,
    mode,
    noteType,
    notes,
    orphanIds,
    orphanOnly,
    qualityFilter,
    query,
    recentCutoff,
    recentOnly,
    relation,
    searchMatches,
    selectedId,
    showOnlyMatches,
    tag,
    topic
  ]);
  const visibleIds = useMemo(() => new Set(filteredNotes.map((note) => note.id)), [filteredNotes]);
  const visibleLinks = useMemo(
    () =>
      dedupeLinks(
        graphLinks.filter(
          (link) =>
            visibleIds.has(link.source_note_id) &&
            visibleIds.has(link.target_note_id) &&
            (!relation || link.relation_type === relation)
        )
      ),
    [graphLinks, relation, visibleIds]
  );
  const visibleDegree = useMemo(() => degreeCounts(visibleLinks), [visibleLinks]);
  const visibleSearchResults = useMemo(
    () => filteredNotes.filter((note) => searchMatches.has(note.id)),
    [filteredNotes, searchMatches]
  );
  const selectedNote = notesById.get(selectedId) ?? null;
  const selectedEdge = visibleLinks.find((link) => link.id === selectedEdgeId) ?? graphLinks.find((link) => link.id === selectedEdgeId) ?? null;
  const selectedEdgeSource = selectedEdge ? notesById.get(selectedEdge.source_note_id) : null;
  const selectedEdgeTarget = selectedEdge ? notesById.get(selectedEdge.target_note_id) : null;
  const selectedIncoming = selectedNote ? graphLinks.filter((link) => link.target_note_id === selectedNote.id) : [];
  const selectedOutgoing = selectedNote ? graphLinks.filter((link) => link.source_note_id === selectedNote.id) : [];
  const allowedPathRelations = useMemo(() => new Set(pathRelations), [pathRelations]);
  const pathIds = useMemo(
    () => (pathStartId && pathEndId ? shortestPath(pathStartId, pathEndId, graphLinks, visibleIds, pathRespectDirection, allowedPathRelations) : []),
    [allowedPathRelations, graphLinks, pathEndId, pathRespectDirection, pathStartId, visibleIds]
  );
  const pathNodeIds = useMemo(() => new Set(pathIds), [pathIds]);
  const pathEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (let index = 0; index < pathIds.length - 1; index += 1) {
      keys.add(`${pathIds[index]}:${pathIds[index + 1]}`);
      keys.add(`${pathIds[index + 1]}:${pathIds[index]}`);
    }
    return keys;
  }, [pathIds]);
  const filteredComponents = useMemo(() => connectedComponents(filteredNotes, visibleLinks), [filteredNotes, visibleLinks]);
  const clusters = useMemo(() => {
    const groups = new Map<string, GraphNote[]>();
    for (const note of filteredNotes) {
      const key = clusterMode === "type" ? note.note_type : clusterMode === "component" ? `Component ${filteredComponents.findIndex((group) => group.includes(note.id)) + 1}` : primaryTopic(note.topic);
      groups.set(key, [...(groups.get(key) ?? []), note]);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [clusterMode, filteredComponents, filteredNotes]);
  const health = useMemo(() => {
    const incoming = [...notes].sort((a, b) => (allDegree.get(b.id)?.in ?? 0) - (allDegree.get(a.id)?.in ?? 0)).slice(0, 5);
    const outgoing = [...notes].sort((a, b) => (allDegree.get(b.id)?.out ?? 0) - (allDegree.get(a.id)?.out ?? 0)).slice(0, 5);
    const missingPrerequisites = notes.filter(
      (note) =>
        ["Theorem", "Lemma", "Technique"].includes(note.note_type) &&
        !graphLinks.some((link) => link.source_note_id === note.id && link.relation_type === "prerequisite")
    );
    const duplicates: Array<[GraphNote, GraphNote]> = [];
    for (let i = 0; i < notes.length; i += 1) {
      for (let j = i + 1; j < notes.length; j += 1) {
        const a = notes[i];
        const b = notes[j];
        const titleMatch = a.title.toLowerCase().replace(/[^a-z0-9]/g, "") === b.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        const sharedTags = a.tags.filter((tagItem) => b.tags.includes(tagItem)).length;
        if (titleMatch || (sharedTags >= 2 && a.topic === b.topic)) duplicates.push([a, b]);
      }
    }
    const relatedCount = graphLinks.filter((link) => link.relation_type === "related").length;
    return {
      incoming,
      outgoing,
      missingPrerequisites,
      duplicates: duplicates.slice(0, 5),
      relationImbalance: graphLinks.length >= 6 && relatedCount / graphLinks.length > 0.55,
      noOutgoing: notes.filter((note) => (allDegree.get(note.id)?.out ?? 0) === 0),
      noIncoming: notes.filter((note) => (allDegree.get(note.id)?.in ?? 0) === 0),
      missingMetadata: notes.filter((note) => !note.topic || !note.note_type || !note.difficulty)
    };
  }, [allDegree, graphLinks, notes]);

  useEffect(() => {
    window.localStorage.setItem(GRAPH_SETTINGS_KEY, JSON.stringify(physics));
  }, [physics]);

  useEffect(() => {
    const wrapper = wrapRef.current;
    if (!wrapper) return;
    let animationFrame = 0;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(Math.max(320, entry.contentRect.width));
      const height = Math.floor(Math.max(360, entry.contentRect.height));
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Graph canvas skipped invalid dimensions", { width, height });
        }
        return;
      }
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setCanvasSize((current) => (
          current.width === width && current.height === height ? current : { width, height }
        ));
      });
    });
    observer.observe(wrapper);
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const previous = new Map(nodesRef.current.map((node) => [node.id, node]));
    const localDepths = mode === "local" ? getNeighborhood(selectedId || null, graphLinks, localDepth) : new Map<string, number>();
    const nextNodes = filteredNotes.map((note, index) => {
      const degree = visibleDegree.get(note.id)?.total ?? 0;
      const old = previous.get(note.id);
      const seed = initialPosition(note, index, filteredNotes.length);
      return {
        id: note.id,
        note,
        x: old?.x ?? seed.x,
        y: old?.y ?? seed.y,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        radius: noteRadius(note, degree, sizeMode),
        degree,
        pinned: pinnedIds.has(note.id) || old?.pinned === true,
        depth: mode === "local" ? localDepths.get(note.id) ?? 99 : 0
      };
    });
    nodesRef.current = nextNodes;
    linksRef.current = visibleLinks.map((link) => ({
      id: link.id,
      sourceId: link.source_note_id,
      targetId: link.target_note_id,
      relation: link.relation_type,
      link
    }));
  }, [filteredNotes, graphLinks, localDepth, mode, pinnedIds, selectedId, sizeMode, visibleDegree, visibleLinks]);

  const fitView = useCallback((silent: boolean | unknown = false) => {
    const simNodes = nodesRef.current;
    if (!simNodes.length) return;
    const minX = Math.min(...simNodes.map((node) => node.x));
    const maxX = Math.max(...simNodes.map((node) => node.x));
    const minY = Math.min(...simNodes.map((node) => node.y));
    const maxY = Math.max(...simNodes.map((node) => node.y));
    const graphWidth = Math.max(1, maxX - minX + 120);
    const graphHeight = Math.max(1, maxY - minY + 120);
    viewportRef.current.scale = Math.max(0.3, Math.min(1.8, Math.min(canvasSize.width / graphWidth, canvasSize.height / graphHeight)));
    viewportRef.current.x = -(minX + maxX) / 2;
    viewportRef.current.y = -(minY + maxY) / 2;
    if (silent !== true) {
      setMessage("Graph fitted to view.");
    }
  }, [canvasSize]);

  useEffect(() => {
    if (!hasAutoFitted && canvasSize.width > 0 && canvasSize.height > 0 && nodesRef.current.length > 0) {
      fitView(true);
      setHasAutoFitted(true);
    }
  }, [canvasSize, hasAutoFitted, fitView]);

  const worldToScreen = useCallback((point: GraphVector) => {
    const view = viewportRef.current;
    return {
      x: canvasSize.width / 2 + (point.x + view.x) * view.scale,
      y: canvasSize.height / 2 + (point.y + view.y) * view.scale
    };
  }, [canvasSize.height, canvasSize.width]);

  const screenToWorld = useCallback((point: GraphVector) => {
    const view = viewportRef.current;
    return {
      x: (point.x - canvasSize.width / 2) / view.scale - view.x,
      y: (point.y - canvasSize.height / 2) / view.scale - view.y
    };
  }, [canvasSize.height, canvasSize.width]);

  const tickSimulation = useCallback(() => {
    const simNodes = nodesRef.current;
    const simLinks = linksRef.current;
    if (paused || !simNodes.length) return;
    const nodeMap = new Map(simNodes.map((node) => [node.id, node]));
    const componentGroups = connectedComponents(simNodes.map((node) => node.note), simLinks.map((link) => link.link));
    for (let i = 0; i < simNodes.length; i += 1) {
      for (let j = i + 1; j < simNodes.length; j += 1) {
        const a = simNodes[i];
        const b = simNodes[j];
        const dx = a.x - b.x || 0.01;
        const dy = a.y - b.y || 0.01;
        const distanceSq = Math.max(dx * dx + dy * dy, 40);
        const distance = Math.sqrt(distanceSq);
        const force = physics.repulsion / distanceSq;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        if (!a.pinned) {
          a.vx += fx;
          a.vy += fy;
        }
        if (!b.pinned) {
          b.vx -= fx;
          b.vy -= fy;
        }
        const minDistance = a.radius + b.radius + physics.collisionRadius;
        if (distance < minDistance) {
          const push = (minDistance - distance) * 0.018;
          if (!a.pinned) {
            a.vx += (dx / distance) * push;
            a.vy += (dy / distance) * push;
          }
          if (!b.pinned) {
            b.vx -= (dx / distance) * push;
            b.vy -= (dy / distance) * push;
          }
        }
      }
    }
    for (const link of simLinks) {
      const source = nodeMap.get(link.sourceId);
      const target = nodeMap.get(link.targetId);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const desired = physics.linkDistance * (link.relation === "prerequisite" ? 0.88 : 1);
      const force = (distance - desired) * 0.0048;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      if (!source.pinned) {
        source.vx += fx;
        source.vy += fy;
      }
      if (!target.pinned) {
        target.vx -= fx;
        target.vy -= fy;
      }
    }
    for (let index = 0; index < simNodes.length; index += 1) {
      const node = simNodes[index];
      const target = targetPosition(node.note, index, simNodes.map((item) => item.note), layout, selectedId, simLinks.map((link) => link.link), componentGroups);
      const layoutStrength = layout === "force" ? 0 : layout === "grid" ? 0.055 : 0.022;
      if (!node.pinned) {
        node.vx += (target.x - node.x) * layoutStrength;
        node.vy += (target.y - node.y) * layoutStrength;
        node.vx += -node.x * physics.centering * 0.01;
        node.vy += -node.y * physics.centering * 0.01;
        node.x += node.vx;
        node.y += node.vy;
      }
      node.vx *= 0.84;
      node.vy *= 0.84;
    }
  }, [layout, paused, physics, selectedId]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(canvasSize.width * dpr) || canvas.height !== Math.floor(canvasSize.height * dpr)) {
      canvas.width = Math.floor(canvasSize.width * dpr);
      canvas.height = Math.floor(canvasSize.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const simNodes = nodesRef.current;
    const simLinks = linksRef.current;
    const nodeMap = new Map(simNodes.map((node) => [node.id, node]));
    const background = darkCanvas ? "#0b1120" : "#ffffff";
    context.fillStyle = background;
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    context.save();
    context.globalAlpha = darkCanvas ? 0.16 : 0.22;
    context.strokeStyle = darkCanvas ? "#334155" : "#d5d7de";
    context.lineWidth = 1;
    for (let x = (viewportRef.current.x * viewportRef.current.scale) % 72; x < canvasSize.width; x += 72) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvasSize.height);
      context.stroke();
    }
    for (let y = (viewportRef.current.y * viewportRef.current.scale) % 72; y < canvasSize.height; y += 72) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvasSize.width, y);
      context.stroke();
    }
    context.restore();
    if (clusterMode !== "none" && layout === "topic") {
      for (const [label, clusterNotes] of clusters) {
        const clusterNodes = clusterNotes.map((note) => nodeMap.get(note.id)).filter(Boolean) as SimNode[];
        if (!clusterNodes.length) continue;
        const points = clusterNodes.map((node) => worldToScreen(node));
        const minX = Math.min(...points.map((point) => point.x));
        const maxX = Math.max(...points.map((point) => point.x));
        const minY = Math.min(...points.map((point) => point.y));
        const maxY = Math.max(...points.map((point) => point.y));
        context.save();
        context.fillStyle = darkCanvas ? "rgba(30, 58, 95, 0.13)" : "rgba(239, 246, 255, 0.75)";
        context.strokeStyle = darkCanvas ? "rgba(148, 163, 184, 0.18)" : "rgba(195, 198, 208, 0.55)";
        context.beginPath();
        context.roundRect(minX - 42, minY - 42, maxX - minX + 84, maxY - minY + 84, 28);
        context.fill();
        context.stroke();
        context.fillStyle = darkCanvas ? "#dbeafe" : "#0e3b69";
        context.font = "600 12px ui-sans-serif, system-ui";
        context.fillText(label, minX - 28, minY - 20);
        context.restore();
      }
    }
    for (const graphLink of simLinks) {
      const source = nodeMap.get(graphLink.sourceId);
      const target = nodeMap.get(graphLink.targetId);
      if (!source || !target) continue;
      const style = relationStyle(graphLink.relation);
      const sourcePoint = worldToScreen(source);
      const targetPoint = worldToScreen(target);
      const visual = edgeVisualEndpoints(source, target, graphLink.relation);
      const visualStartPoint = worldToScreen(visual.from);
      const visualEndPoint = worldToScreen(visual.to);
      const pathHighlighted =
        pathEdgeKeys.has(`${source.id}:${target.id}`) ||
        selectedEdgeId === graphLink.id ||
        hoverEdgeId === graphLink.id ||
        selectedId === source.id ||
        selectedId === target.id;
      const dimBySearch = query.trim() && fadeNonMatches && !searchMatches.has(source.id) && !searchMatches.has(target.id);
      context.save();
      context.globalAlpha = dimBySearch ? 0.12 : pathHighlighted ? 0.96 : darkCanvas ? 0.42 : 0.52;
      context.strokeStyle = style.color;
      context.lineWidth = pathHighlighted ? style.width + 1.2 : style.width;
      context.setLineDash(style.dash ?? []);
      context.beginPath();
      context.moveTo(sourcePoint.x, sourcePoint.y);
      context.lineTo(targetPoint.x, targetPoint.y);
      context.stroke();
      context.setLineDash([]);
      if (showArrows && style.directional) {
        const arrowTargetRadius = visual.to.radius * viewportRef.current.scale;
        const angle = Math.atan2(visualEndPoint.y - visualStartPoint.y, visualEndPoint.x - visualStartPoint.x);
        const arrowX = visualEndPoint.x - Math.cos(angle) * (arrowTargetRadius + 7);
        const arrowY = visualEndPoint.y - Math.sin(angle) * (arrowTargetRadius + 7);
        context.beginPath();
        context.moveTo(arrowX, arrowY);
        context.lineTo(arrowX - Math.cos(angle - 0.45) * 9, arrowY - Math.sin(angle - 0.45) * 9);
        context.lineTo(arrowX - Math.cos(angle + 0.45) * 9, arrowY - Math.sin(angle + 0.45) * 9);
        context.closePath();
        context.fillStyle = style.color;
        context.fill();
      }
      if (hoverEdgeId === graphLink.id || selectedEdgeId === graphLink.id) {
        const labelX = (sourcePoint.x + targetPoint.x) / 2;
        const labelY = (sourcePoint.y + targetPoint.y) / 2;
        const label = style.label;
        context.font = "600 11px ui-sans-serif, system-ui";
        const width = context.measureText(label).width + 12;
        context.fillStyle = darkCanvas ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.94)";
        context.beginPath();
        context.roundRect(labelX - width / 2, labelY - 12, width, 20, 6);
        context.fill();
        context.fillStyle = darkCanvas ? "#f8fafc" : "#1a1c1c";
        context.fillText(label, labelX - width / 2 + 6, labelY + 2);
      }
      context.restore();
    }
    for (const node of simNodes) {
      const screen = worldToScreen(node);
      const isSelected = node.id === selectedId;
      const isHovered = node.id === hoverId;
      const isPath = pathNodeIds.has(node.id);
      const isSearch = searchMatches.has(node.id);
      const directNeighbor =
        selectedId &&
        simLinks.some((link) =>
          (link.sourceId === selectedId && link.targetId === node.id) ||
          (link.targetId === selectedId && link.sourceId === node.id)
        );
      const localFade = mode === "local" && node.depth > 1 ? 0.62 : 1;
      const searchFade = query.trim() && fadeNonMatches && !isSearch && !isSelected && !directNeighbor ? 0.18 : 1;
      const radius = node.radius * (isSelected ? 1.75 : isHovered ? 1.35 : isPath ? 1.3 : 1) * viewportRef.current.scale;
      context.save();
      context.globalAlpha = localFade * searchFade;
      if (isSelected || isHovered) {
        context.shadowColor = noteColor(node.note, colorMode);
        context.shadowBlur = isSelected ? 18 : 12;
      }
      context.fillStyle = noteColor(node.note, colorMode);
      context.beginPath();
      context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      if (isSelected || isPath || directNeighbor || node.pinned) {
        context.strokeStyle = node.pinned ? "#facc15" : darkCanvas ? "#f8fafc" : "#0f172a";
        context.lineWidth = isSelected ? 2.2 : 1.4;
        context.stroke();
      }
      if (node.pinned) {
        context.fillStyle = "#facc15";
        context.fillRect(screen.x + radius - 2, screen.y - radius - 2, 5, 5);
      }
      const showLabel =
        isSelected ||
        isHovered ||
        (showLabels &&
          (isPath ||
            directNeighbor ||
            node.degree >= 6 ||
            (viewportRef.current.scale >= physics.labelThreshold && (node.degree >= 2 || simNodes.length < 35))));
      if (showLabel) {
        const title = node.note.title;
        context.font = `${isSelected ? "700" : "600"} 12px ui-sans-serif, system-ui`;
        const maxWidth = isSelected ? 240 : 170;
        const text = context.measureText(title).width > maxWidth ? `${title.slice(0, Math.max(14, Math.floor(maxWidth / 7)))}...` : title;
        const width = Math.min(maxWidth, context.measureText(text).width) + 12;
        const labelX = screen.x + radius + 7;
        const labelY = screen.y - 8;
        context.fillStyle = darkCanvas ? "rgba(15, 23, 42, 0.84)" : "rgba(255, 255, 255, 0.9)";
        context.beginPath();
        context.roundRect(labelX - 4, labelY - 12, width, 22, 6);
        context.fill();
        context.fillStyle = darkCanvas ? "#f8fafc" : "#1a1c1c";
        context.fillText(text, labelX + 2, labelY + 3, maxWidth);
      }
      context.restore();
    }
  }, [
    canvasSize.height,
    canvasSize.width,
    clusters,
    clusterMode,
    colorMode,
    darkCanvas,
    fadeNonMatches,
    hoverEdgeId,
    hoverId,
    layout,
    mode,
    pathEdgeKeys,
    pathNodeIds,
    physics.labelThreshold,
    query,
    searchMatches,
    selectedEdgeId,
    selectedId,
    showArrows,
    showLabels,
    worldToScreen
  ]);

  useEffect(() => {
    function frame() {
      tickSimulation();
      drawGraph();
      animationRef.current = window.requestAnimationFrame(frame);
    }
    animationRef.current = window.requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, [drawGraph, tickSimulation]);

  function hitNode(screenPoint: GraphVector) {
    const candidates = [...nodesRef.current].reverse();
    for (const node of candidates) {
      const point = worldToScreen(node);
      const radius = Math.max(10, node.radius * viewportRef.current.scale + 5);
      if (Math.hypot(screenPoint.x - point.x, screenPoint.y - point.y) <= radius) return node;
    }
    return null;
  }

  function distanceToSegment(point: GraphVector, a: GraphVector, b: GraphVector) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (!lengthSq) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
    return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
  }

  function hitEdge(screenPoint: GraphVector) {
    const nodeMap = new Map(nodesRef.current.map((node) => [node.id, node]));
    for (const edge of linksRef.current) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) continue;
      if (distanceToSegment(screenPoint, worldToScreen(source), worldToScreen(target)) < 7) return edge;
    }
    return null;
  }

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function selectNode(node: SimNode) {
    setSelectedId(node.id);
    setSelectedEdgeId("");
    if (linkMode) {
      if (!linkSourceId || (linkSourceId && linkTargetId)) {
        setLinkSourceId(node.id);
        setLinkTargetId("");
      } else if (node.id !== linkSourceId) {
        setLinkTargetId(node.id);
      }
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    const node = hitNode(point);
    const edge = hitEdge(point);
    setContextMenu(null);
    if (node) {
      selectNode(node);
      if (!linkMode) {
        mouseRef.current = { draggingId: node.id, panning: false, lastX: point.x, lastY: point.y };
        node.pinned = true;
        setPinnedIds((current) => new Set([...current, node.id]));
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (edge) {
      setSelectedEdgeId(edge.id);
      setSelectedId("");
      return;
    }
    setSelectedEdgeId("");
    mouseRef.current = { draggingId: null, panning: true, lastX: point.x, lastY: point.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    const mouse = mouseRef.current;
    if (mouse.draggingId) {
      const node = nodesRef.current.find((item) => item.id === mouse.draggingId);
      if (node) {
        const world = screenToWorld(point);
        node.x = world.x;
        node.y = world.y;
        node.vx = 0;
        node.vy = 0;
      }
      mouse.lastX = point.x;
      mouse.lastY = point.y;
      return;
    }
    if (mouse.panning) {
      viewportRef.current.x += (point.x - mouse.lastX) / viewportRef.current.scale;
      viewportRef.current.y += (point.y - mouse.lastY) / viewportRef.current.scale;
      mouse.lastX = point.x;
      mouse.lastY = point.y;
      return;
    }
    const node = hitNode(point);
    const edge = node ? null : hitEdge(point);
    setHoverId(node?.id ?? "");
    setHoverEdgeId(edge?.id ?? "");
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    mouseRef.current = { draggingId: null, panning: false, lastX: 0, lastY: 0 };
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    viewportRef.current.scale = Math.max(0.28, Math.min(3.2, viewportRef.current.scale * delta));
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const node = hitNode(canvasPoint(event));
    if (node) router.push(`/app/notes/${node.id}`);
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const node = hitNode(canvasPoint(event));
    if (node) {
      setSelectedId(node.id);
      setContextMenu({ id: node.id, x: event.clientX, y: event.clientY });
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.getElementById("graph-search")?.focus();
      }
      if (event.key === "Escape") {
        setSelectedEdgeId("");
        setContextMenu(null);
        setLinkMode(false);
      }
      if (event.key.toLowerCase() === "l") setLinkMode((current) => !current);
      if (event.key.toLowerCase() === "g") fitView();
      if (event.key.toLowerCase() === "r") resetLayout();
      if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
      if (event.key === "Enter" && selectedId) router.push(`/app/notes/${selectedId}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function resetLayout() {
    nodesRef.current = nodesRef.current.map((node, index) => {
      const seed = initialPosition(node.note, index, nodesRef.current.length);
      return { ...node, x: seed.x, y: seed.y, vx: 0, vy: 0, pinned: false };
    });
    setPinnedIds(new Set());
    viewportRef.current = { scale: 1, x: 0, y: 0 };
    setMessage("Layout reset and physics reheated.");
  }

  function centerSelected() {
    const node = nodesRef.current.find((item) => item.id === selectedId);
    if (!node) return;
    viewportRef.current.x = -node.x;
    viewportRef.current.y = -node.y;
    viewportRef.current.scale = Math.max(viewportRef.current.scale, 1.15);
  }

  function saveLayout() {
    window.localStorage.setItem(
      GRAPH_LAYOUT_KEY,
      JSON.stringify(nodesRef.current.map((node) => ({ id: node.id, x: node.x, y: node.y, pinned: node.pinned })))
    );
    setMessage("Current node layout saved locally.");
  }

  function loadLayout() {
    const raw = window.localStorage.getItem(GRAPH_LAYOUT_KEY);
    if (!raw) {
      setMessage("No saved local layout found.");
      return;
    }
    const saved = new Map((JSON.parse(raw) as Array<{ id: string; x: number; y: number; pinned?: boolean }>).map((item) => [item.id, item]));
    nodesRef.current = nodesRef.current.map((node) => {
      const next = saved.get(node.id);
      return next ? { ...node, x: next.x, y: next.y, pinned: Boolean(next.pinned), vx: 0, vy: 0 } : node;
    });
    setPinnedIds(new Set([...saved.values()].filter((item) => item.pinned).map((item) => item.id)));
    setMessage("Local graph layout loaded.");
  }

  function focusNode(noteId: string) {
    setSelectedId(noteId);
    setSelectedEdgeId("");
    setMode("local");
    setLayout("radial");
    setLocalDepth(2);
    setMessage("Focused local graph.");
  }

  function clearFilters() {
    setTopic("");
    setNoteType("");
    setTag("");
    setRelation("");
    setLevelMin(1);
    setLevelMax(12);
    setHasTriggersOnly(false);
    setHasFalseUsesOnly(false);
    setHasDiagramsOnly(false);
    setHasRelatedOnly(false);
    setOrphanOnly(false);
    setRecentOnly(false);
    setQualityFilter("any");
    setHiddenIds(new Set());
    setCollapsedClusters(new Set());
    setQuery("");
    setShowOnlyMatches(false);
    setMessage("Filters cleared.");
  }

  function applyPreset(preset: string) {
    clearFilters();
    if (preset === "geometry") setTopic("Geometry");
    if (preset === "prerequisite") setRelation("prerequisite");
    if (preset === "orphans") setOrphanOnly(true);
    if (preset === "confused") setRelation("commonly confused");
    if (preset === "formula") setTopic("Formula Bank");
    if (preset === "current") {
      setMode("local");
      setLayout("radial");
      setLocalDepth(2);
    }
    setMessage(`${preset.replace(/^\w/, (letter) => letter.toUpperCase())} graph preset loaded.`);
  }

  async function saveGraphLink(sourceId = linkSourceId, targetId = linkTargetId, relationType = linkRelation) {
    if (!sourceId || !targetId || sourceId === targetId) {
      setMessage("Choose two different notes before saving a link.");
      return;
    }
    const source = notesById.get(sourceId);
    const target = notesById.get(targetId);
    if (!source || !target) return;
    if (relationType === "prerequisite" && !window.confirm(`${target.title} is a prerequisite of ${source.title}. Save this directional link?`)) return;
    const existingPair = graphLinks.find((link) => link.source_note_id === sourceId && link.target_note_id === targetId);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be logged in to edit graph links.");
      return;
    }
    if (existingPair) {
      if (existingPair.relation_type === relationType) {
        setMessage("That exact directional link already exists.");
        return;
      }
      if (!window.confirm(`A ${existingPair.relation_type} link already exists between these notes. Update it to ${relationType}?`)) return;
      const { data, error } = await supabase
        .from("note_links")
        .update({ relation_type: relationType })
        .eq("id", existingPair.id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) {
        setMessage(error.message);
        return;
      }
      setGraphLinks((current) => current.map((link) => (link.id === existingPair.id ? (data as NoteLink) : link)));
      setMessage("Existing directional link updated.");
      return;
    }
    const { data, error } = await supabase
      .from("note_links")
      .insert({ user_id: user.id, source_note_id: sourceId, target_note_id: targetId, relation_type: relationType })
      .select("*")
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setGraphLinks((current) => dedupeLinks([...current, data as NoteLink]));
    setLinkTargetId("");
    setMessage("Directional graph link saved.");
  }

  async function updateEdge(link: NoteLink, relationType: string) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("note_links")
      .update({ relation_type: relationType })
      .eq("id", link.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setGraphLinks((current) => current.map((item) => (item.id === link.id ? (data as NoteLink) : item)));
    setMessage("Relation type updated.");
  }

  async function deleteEdge(link: NoteLink) {
    if (!window.confirm("Delete this directional graph link?")) return;
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("note_links").delete().eq("id", link.id).eq("user_id", user.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setGraphLinks((current) => current.filter((item) => item.id !== link.id));
    setSelectedEdgeId("");
    setMessage("Graph link deleted.");
  }

  async function copyText(text: string, success: string) {
    await navigator.clipboard.writeText(text);
    setMessage(success);
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, "olympiad-codex-graph.png");
    });
  }

  function exportSvg() {
    const nodes = nodesRef.current;
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const width = 1600;
    const height = 1000;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="-800 -500 1600 1000">`,
      `<rect x="-800" y="-500" width="1600" height="1000" fill="${darkCanvas ? "#0b1120" : "#ffffff"}"/>`
    ];
    for (const edge of linksRef.current) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) continue;
      const style = relationStyle(edge.relation);
      parts.push(`<line x1="${source.x.toFixed(1)}" y1="${source.y.toFixed(1)}" x2="${target.x.toFixed(1)}" y2="${target.y.toFixed(1)}" stroke="${style.color}" stroke-width="${style.width}"/>`);
    }
    for (const node of nodes) {
      parts.push(`<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.radius.toFixed(1)}" fill="${noteColor(node.note, colorMode)}"/>`);
      if (node.id === selectedId || node.degree >= 2) {
        parts.push(`<text x="${(node.x + node.radius + 6).toFixed(1)}" y="${(node.y + 4).toFixed(1)}" font-size="12" fill="${darkCanvas ? "#f8fafc" : "#1a1c1c"}">${node.note.title.replace(/[&<>]/g, "")}</text>`);
      }
    }
    parts.push("</svg>");
    downloadBlob(new Blob([parts.join("")], { type: "image/svg+xml" }), "olympiad-codex-graph.svg");
  }

  function notesForCluster(cluster?: string) {
    if (!cluster) return filteredNotes;
    return filteredNotes.filter((note) => {
      if (clusterMode === "type") return note.note_type === cluster;
      if (clusterMode === "component") {
        const index = filteredComponents.findIndex((group) => group.includes(note.id));
        return `Component ${index + 1}` === cluster;
      }
      return primaryTopic(note.topic) === cluster;
    });
  }

  function exportJson(cluster?: string) {
    const selectedNotes = notesForCluster(cluster);
    const selectedIds = new Set(selectedNotes.map((note) => note.id));
    const payload = {
      exported_at: new Date().toISOString(),
      mode,
      layout,
      clusterMode,
      filters: { topic, noteType, tag, relation, levelMin, levelMax, orphanOnly, qualityFilter },
      notes: selectedNotes,
      links: visibleLinks.filter((link) => selectedIds.has(link.source_note_id) && selectedIds.has(link.target_note_id))
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "olympiad-codex-graph.json");
  }

  function visibleMarkdown(cluster?: string) {
    const selectedNotes = notesForCluster(cluster);
    return selectedNotes.map((note) => `- [${note.title}](/app/notes/${note.id})`).join("\n");
  }

  function saveSnapshot() {
    const name = window.prompt("Graph snapshot name", "Current graph view");
    if (!name) return;
    window.localStorage.setItem(
      GRAPH_SNAPSHOT_KEY,
      JSON.stringify({ name, mode, layout, clusterMode, topic, noteType, tag, relation, levelMin, levelMax, selectedId, localDepth, physics })
    );
    setMessage("Graph snapshot saved locally.");
  }

  function loadSnapshot() {
    const raw = window.localStorage.getItem(GRAPH_SNAPSHOT_KEY);
    if (!raw) {
      setMessage("No local graph snapshot found.");
      return;
    }
    const snapshot = JSON.parse(raw) as Partial<{
      mode: GraphMode;
      layout: LayoutMode;
      clusterMode: ClusterMode;
      topic: string;
      noteType: string;
      tag: string;
      relation: string;
      levelMin: number;
      levelMax: number;
      selectedId: string;
      localDepth: number;
      physics: PhysicsSettings;
    }>;
    setMode(snapshot.mode ?? "global");
    setLayout(snapshot.layout ?? "force");
    setClusterMode(snapshot.clusterMode ?? "topic");
    setTopic(snapshot.topic ?? "");
    setNoteType(snapshot.noteType ?? "");
    setTag(snapshot.tag ?? "");
    setRelation(snapshot.relation ?? "");
    setLevelMin(snapshot.levelMin ?? 1);
    setLevelMax(snapshot.levelMax ?? 12);
    setSelectedId(snapshot.selectedId ?? selectedId);
    setLocalDepth(snapshot.localDepth ?? 1);
    if (snapshot.physics) setPhysics({ ...DEFAULT_PHYSICS, ...snapshot.physics });
    setMessage("Graph snapshot loaded.");
  }

  async function suggestLinksWithAI(forOrphans = false) {
    const source = forOrphans ? notes.find((note) => orphanIds.has(note.id)) : selectedNote;
    if (!source) {
      setMessage(forOrphans ? "No orphan note is available for AI suggestions." : "Select a note first.");
      return;
    }
    setAiBusy(true);
    setAiSuggestions([]);
    setPossibleNewNotes([]);
    try {
      const candidates = notes
        .filter((note) => note.id !== source.id)
        .sort((a, b) => {
          const sameTopicA = topicIncludes(a.topic, primaryTopic(source.topic)) ? 0 : 1;
          const sameTopicB = topicIncludes(b.topic, primaryTopic(source.topic)) ? 0 : 1;
          return sameTopicA - sameTopicB || a.title.localeCompare(b.title);
        })
        .slice(0, 40);
      const response = await fetch("/api/ai/note-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggest_related_notes",
          instruction: "Graph assistant: return structured link suggestions only. Choose only from existing note IDs.",
          note: {
            id: source.id,
            title: source.title,
            topic: source.topic,
            note_type: source.note_type,
            difficulty: source.difficulty,
            description: source.description,
            tags: source.tags,
            body_markdown: "",
            recognition_triggers: source.recognition_triggers,
            false_uses: source.false_uses
          },
          codexNotes: candidates.map((note) => ({
            id: note.id,
            title: note.title,
            topic: note.topic,
            note_type: note.note_type,
            tags: note.tags,
            description: note.description
          }))
        })
      });
      const payload = (await response.json()) as {
        link_suggestions?: Array<Omit<LinkSuggestion, "sourceNoteId" | "sourceTitle">>;
        possible_new_notes?: Array<{ title: string; reason?: string }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "AI request failed.");
      setAiSuggestions(
        (payload.link_suggestions ?? [])
          .filter((item) => notesById.has(item.targetNoteId))
          .filter((item) => !graphLinks.some((link) => link.source_note_id === source.id && link.target_note_id === item.targetNoteId))
          .map((item) => ({
            ...item,
            sourceNoteId: source.id,
            sourceTitle: source.title
          }))
      );
      setPossibleNewNotes(payload.possible_new_notes ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI graph request failed.");
    } finally {
      setAiBusy(false);
    }
  }

  function togglePathRelation(relationType: string) {
    setPathRelations((current) => current.includes(relationType) ? current.filter((item) => item !== relationType) : [...current, relationType]);
  }

  const visibleCount = filteredNotes.length;
  const hiddenCount = notes.length - visibleCount;
  const tooltipNote = hoverId ? notesById.get(hoverId) : null;
  const tooltipNode = hoverId ? nodesRef.current.find((node) => node.id === hoverId) : null;
  const tooltipPoint = tooltipNode ? worldToScreen(tooltipNode) : null;

  return (
    <div className="graph-page flex h-auto min-h-screen flex-col bg-[#f9f9f9] text-[#1a1c1c] xl:h-screen xl:min-h-0 xl:overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col px-3 py-4 lg:px-6 xl:overflow-hidden">
        <header className="flex shrink-0 flex-col gap-4 border-b border-[#c3c6d0] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Relationship map</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Interactive Note Graph</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#43474f]">
              Drag, inspect, filter, link, and clean up your Olympiad knowledge network.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={mode === "global" ? "primary" : "secondary"} onClick={() => setMode("global")}>
              Global
            </Button>
            <Button type="button" size="sm" variant={mode === "local" ? "primary" : "secondary"} onClick={() => setMode("local")}>
              Local
            </Button>
            <Button type="button" size="sm" variant={linkMode ? "primary" : "secondary"} onClick={() => setLinkMode((current) => !current)}>
              <GitBranch className="h-4 w-4" /> Link Mode
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={fitView}>
              <Maximize2 className="h-4 w-4" /> Fit
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetLayout}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setPaused((current) => !current)}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void suggestLinksWithAI(false)} loading={aiBusy} loadingLabel="Asking AI..." disabled={!selectedNote}>
              <Brain className="h-4 w-4" /> AI Links
            </Button>
          </div>
        </header>

        {message ? (
          <div className="mt-3 shrink-0 rounded border border-[#c3c6d0] bg-white px-4 py-2 text-sm text-[#43474f]">{message}</div>
        ) : null}
        {notes.length > 300 ? (
          <div className="mt-3 shrink-0 rounded border border-[#facc15] bg-[#fef9c3] px-4 py-2 text-sm text-[#854d0e]">
            Large graph warning: start with a topic filter, local graph, or cluster preset for smoother exploration.
          </div>
        ) : null}

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 xl:flex-row xl:overflow-hidden">
          <aside className="graph-control-panel codex-scrollbar grid max-h-[34vh] min-h-0 shrink-0 gap-3 overflow-y-auto pr-1 xl:h-full xl:max-h-none xl:w-[300px] xl:flex-none">
            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#0e3b69]" />
                <input
                  id="graph-search"
                  className={inputClassName()}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && visibleSearchResults[0]) {
                      router.push(`/app/notes/${visibleSearchResults[0].id}`);
                    }
                  }}
                  placeholder="Search titles, tags, triggers..."
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#43474f]">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={showOnlyMatches} onChange={(event) => setShowOnlyMatches(event.target.checked)} /> Show only matches</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={fadeNonMatches} onChange={(event) => setFadeNonMatches(event.target.checked)} /> Fade non-matches</label>
              </div>
              {query ? (
                <div className="mt-3 max-h-40 overflow-auto codex-scrollbar rounded border border-[#e2e4ea] bg-[#f9f9f9] p-2">
                  {visibleSearchResults.slice(0, 10).map((note) => (
                    <button key={note.id} type="button" onClick={() => focusNode(note.id)} className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-white">
                      {note.title}
                    </button>
                  ))}
                  {!visibleSearchResults.length ? <p className="text-sm text-[#43474f]">No visible matches.</p> : null}
                </div>
              ) : null}
            </section>
 
            <details className="rounded-lg border border-[#c3c6d0] bg-white p-4" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                <Filter className="h-4 w-4 text-[#0e3b69]" /> Filters
              </summary>
              <div className="mt-3 grid gap-3">
                <select className={inputClassName()} value={topic} onChange={(event) => setTopic(event.target.value)}>
                  <option value="">All topics</option>
                  {MATH_TOPICS.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className={inputClassName()} value={noteType} onChange={(event) => setNoteType(event.target.value)}>
                  <option value="">All note types</option>
                  {NOTE_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className={inputClassName()} value={tag} onChange={(event) => setTag(event.target.value)}>
                  <option value="">All tags</option>
                  {allTags.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className={inputClassName()} value={relation} onChange={(event) => setRelation(event.target.value)}>
                  <option value="">All relation types</option>
                  {NOTE_LINK_RELATIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-[#43474f]">
                    Min level
                    <input className={inputClassName("mt-1")} type="number" min={1} max={12} value={levelMin} onChange={(event) => setLevelMin(Number(event.target.value))} />
                  </label>
                  <label className="text-xs text-[#43474f]">
                    Max level
                    <input className={inputClassName("mt-1")} type="number" min={1} max={12} value={levelMax} onChange={(event) => setLevelMax(Number(event.target.value))} />
                  </label>
                </div>
                <select className={inputClassName()} value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value as QualityFilter)}>
                  <option value="any">Any quality status</option>
                  <option value="missing-links">No links</option>
                  <option value="missing-metadata">Missing metadata</option>
                  <option value="strong">Strongly connected</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={hasTriggersOnly} onChange={(event) => setHasTriggersOnly(event.target.checked)} /> Has recognition triggers</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={hasFalseUsesOnly} onChange={(event) => setHasFalseUsesOnly(event.target.checked)} /> Has common false uses</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={hasDiagramsOnly} onChange={(event) => setHasDiagramsOnly(event.target.checked)} /> Has diagrams/media</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={hasRelatedOnly} onChange={(event) => setHasRelatedOnly(event.target.checked)} /> Has related notes</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={orphanOnly} onChange={(event) => setOrphanOnly(event.target.checked)} /> Orphan notes only</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} /> Recently updated</label>
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </details>
 
            <details className="rounded-lg border border-[#c3c6d0] bg-white p-4" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                <SlidersHorizontal className="h-4 w-4 text-[#0e3b69]" /> Physics & Visuals
              </summary>
              <div className="mt-3 grid gap-3">
                <select className={inputClassName()} value={layout} onChange={(event) => setLayout(event.target.value as LayoutMode)}>
                  <option value="force">Force Layout</option>
                  <option value="topic">Topic Cluster Layout</option>
                  <option value="hierarchy">Prerequisite Hierarchy Layout</option>
                  <option value="radial">Local Radial Layout</option>
                  <option value="grid">Compact Grid Layout</option>
                </select>
                <select className={inputClassName()} value={clusterMode} onChange={(event) => setClusterMode(event.target.value as ClusterMode)}>
                  <option value="topic">Cluster by topic</option>
                  <option value="type">Cluster by note type</option>
                  <option value="component">Cluster by connected component</option>
                  <option value="none">No clustering</option>
                </select>
                {mode === "local" ? (
                  <label className="text-sm text-[#43474f]">
                    Local depth: {localDepth}
                    <input className="mt-2 w-full accent-[#2c5282] cursor-pointer" type="range" min={1} max={3} value={localDepth} onChange={(event) => setLocalDepth(Number(event.target.value))} />
                  </label>
                ) : null}
                <select className={inputClassName()} value={colorMode} onChange={(event) => setColorMode(event.target.value as ColorMode)}>
                  <option value="topic">Node color by topic</option>
                  <option value="type">Node color by note type</option>
                </select>
                <select className={inputClassName()} value={sizeMode} onChange={(event) => setSizeMode(event.target.value as SizeMode)}>
                  <option value="connections">Node size by connection count</option>
                  <option value="level">Node size by concept/problem level</option>
                </select>
                {([
                  ["repulsion", "Repulsion strength", 160, 1250, 10],
                  ["linkDistance", "Link distance", 70, 260, 5],
                  ["collisionRadius", "Node collision radius", 8, 52, 1],
                  ["centering", "Centering strength", 0, 0.09, 0.005],
                  ["labelThreshold", "Label visibility threshold", 0.55, 2.2, 0.05]
                ] as const).map(([key, label, min, max, step]) => (
                  <label key={key} className="text-xs text-[#43474f]">
                    {label}: {physics[key]}
                    <input
                      className="mt-1 w-full accent-[#2c5282] cursor-pointer"
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={physics[key]}
                      onChange={(event) => setPhysics((current) => ({ ...current, [key]: Number(event.target.value) }))}
                    />
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={showArrows} onChange={(event) => setShowArrows(event.target.checked)} /> Show directional arrows</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Show contextual labels</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={darkCanvas} onChange={(event) => setDarkCanvas(event.target.checked)} /> Dark canvas</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" className="w-full whitespace-nowrap" variant="secondary" onClick={() => { viewportRef.current.scale *= 1.15; }}><ZoomIn className="h-4 w-4" /> Zoom in</Button>
                  <Button type="button" size="sm" className="w-full whitespace-nowrap" variant="secondary" onClick={() => { viewportRef.current.scale *= 0.85; }}><ZoomOut className="h-4 w-4" /> Zoom out</Button>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <Button type="button" size="sm" className="w-full whitespace-nowrap" variant="secondary" onClick={saveLayout}><Save className="h-4 w-4" /> Save layout</Button>
                  <Button type="button" size="sm" className="w-full whitespace-nowrap" variant="secondary" onClick={loadLayout}><LocateFixed className="h-4 w-4" /> Load layout</Button>
                </div>
              </div>
            </details>
 
            <details className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <summary className="cursor-pointer list-none font-semibold">Path Finder</summary>
              <div className="mt-3 grid gap-2">
                <select className={inputClassName()} value={pathStartId} onChange={(event) => setPathStartId(event.target.value)}>
                  <option value="">Start note</option>
                  {filteredNotes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <select className={inputClassName()} value={pathEndId} onChange={(event) => setPathEndId(event.target.value)}>
                  <option value="">End note</option>
                  {filteredNotes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-[#43474f] cursor-pointer"><input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={pathRespectDirection} onChange={(event) => setPathRespectDirection(event.target.checked)} /> Respect direction</label>
                <details className="rounded border border-[#e2e4ea] p-2">
                  <summary className="cursor-pointer text-sm font-medium">Relation types for path</summary>
                  <div className="mt-2 grid gap-1">
                    {NOTE_LINK_RELATIONS.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-xs text-[#43474f] cursor-pointer">
                        <input type="checkbox" className="accent-[#2c5282] cursor-pointer" checked={pathRelations.includes(item)} onChange={() => togglePathRelation(item)} />
                        {item}
                      </label>
                    ))}
                  </div>
                </details>
                {pathStartId && pathEndId ? (
                  pathIds.length > 1 ? (
                    <p className="text-sm leading-6 text-[#0e3b69]">{pathIds.map((id) => notesById.get(id)?.title ?? id).join(" -> ")}</p>
                  ) : (
                    <p className="text-sm text-[#8f1d15]">No path found.</p>
                  )
                ) : null}
              </div>
            </details>
          </aside>

          <main className="graph-canvas-panel flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#c3c6d0] bg-white xl:h-full xl:min-h-0">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#e2e4ea] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-[#1a1c1c]">{visibleCount} visible nodes</span>
                <span className="text-[#43474f]">{visibleLinks.length} visible edges</span>
                <span className="text-[#43474f]">{hiddenCount} hidden</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["full", "geometry", "prerequisite", "orphans", "confused", "formula", "current"].map((preset) => (
                  <button key={preset} type="button" className="rounded border border-[#d5d7de] px-2 py-1 text-xs text-[#43474f] hover:bg-[#f9f9f9]" onClick={() => applyPreset(preset)}>
                    {preset === "full" ? "Full Graph" : preset === "confused" ? "Commonly Confused" : preset === "current" ? "Current Neighborhood" : preset}
                  </button>
                ))}
              </div>
            </div>

            {!notes.length ? (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
                <div>
                  <Network className="mx-auto h-10 w-10 text-[#0e3b69]" />
                  <h2 className="mt-4 text-xl font-semibold">No notes yet</h2>
                  <p className="mt-2 text-sm text-[#43474f]">Create notes first, then the graph becomes your navigation map.</p>
                </div>
              </div>
            ) : !filteredNotes.length ? (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
                <div>
                  <Filter className="mx-auto h-10 w-10 text-[#0e3b69]" />
                  <h2 className="mt-4 text-xl font-semibold">Filters hide all notes</h2>
                  <p className="mt-2 text-sm text-[#43474f]">Clear filters or switch back to Global Graph.</p>
                  <Button type="button" className="mt-4" variant="secondary" onClick={clearFilters}>Clear filters</Button>
                </div>
              </div>
            ) : (
              <div ref={wrapRef} className={cn("graph-canvas relative min-h-0 flex-1 overflow-hidden", darkCanvas ? "bg-[#0b1120]" : "bg-white")}>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={() => {
                    setHoverId("");
                    setHoverEdgeId("");
                    mouseRef.current = { draggingId: null, panning: false, lastX: 0, lastY: 0 };
                  }}
                  onWheel={handleWheel}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                  aria-label="Interactive force-directed note graph canvas"
                />
                <div className={cn("pointer-events-none absolute left-3 top-3 rounded px-3 py-2 text-xs", darkCanvas ? "bg-[#0f172a]/80 text-slate-200" : "bg-white/85 text-[#43474f]")}>
                  Drag nodes to pin · drag background to pan · wheel to zoom · double-click to open
                </div>
                {tooltipNote && tooltipPoint ? (
                  <div
                    className="pointer-events-none absolute z-10 max-w-72 rounded border border-[#c3c6d0] bg-white px-3 py-2 text-xs shadow-[0_16px_40px_rgba(26,32,44,0.16)]"
                    style={{ left: Math.min(canvasSize.width - 290, tooltipPoint.x + 14), top: Math.max(12, tooltipPoint.y + 12) }}
                  >
                    <p className="font-semibold text-[#1a1c1c]">{tooltipNote.title}</p>
                    <p className="mt-1 text-[#43474f]">{tooltipNote.topic} · {tooltipNote.note_type} · {allDegree.get(tooltipNote.id)?.total ?? 0} links</p>
                  </div>
                ) : null}
                {contextMenu ? (
                  <div className="fixed z-50 grid w-56 gap-1 rounded border border-[#c3c6d0] bg-white p-2 text-sm shadow-[0_16px_40px_rgba(26,32,44,0.16)]" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#eef4ff]" onClick={() => router.push(`/app/notes/${contextMenu.id}`)}>Open note</button>
                    <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#eef4ff]" onClick={() => router.push(`/app/workspace?note=${contextMenu.id}`)}>Open in workspace</button>
                    <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#eef4ff]" onClick={() => void copyText(`${window.location.origin}/app/notes/${contextMenu.id}`, "Note link copied.")}>Copy note link</button>
                    <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#eef4ff]" onClick={() => focusNode(contextMenu.id)}>Focus local graph</button>
                    <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#eef4ff]" onClick={() => { setPinnedIds((current) => new Set([...current, contextMenu.id])); const node = nodesRef.current.find((item) => item.id === contextMenu.id); if (node) node.pinned = true; setContextMenu(null); }}>Pin node</button>
                    <button type="button" className="rounded px-2 py-1 text-left hover:bg-[#eef4ff]" onClick={() => { setLinkMode(true); setLinkSourceId(contextMenu.id); setContextMenu(null); }}>Create link from this note</button>
                    <button type="button" className="rounded px-2 py-1 text-left text-[#8f1d15] hover:bg-[#fff4f2]" onClick={() => setHiddenIds((current) => new Set([...current, contextMenu.id]))}>Hide node</button>
                  </div>
                ) : null}
              </div>
            )}
          </main>

          <aside className="graph-inspector codex-scrollbar grid max-h-[38vh] min-h-0 shrink-0 content-start gap-3 overflow-y-auto pr-1 xl:h-full xl:max-h-none xl:w-[360px] xl:flex-none">
            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="text-base font-semibold text-[#1a1c1c]">Inspector</h2>
              {!selectedNote && !selectedEdge ? (
                <div className="mt-3 grid gap-3 text-sm text-[#43474f]">
                  <p>{visibleCount} nodes, {visibleLinks.length} edges, {clusters.length} clusters, {orphanIds.size} orphan notes.</p>
                  <p>Current mode: {mode}. Layout: {layout}. Cluster mode: {clusterMode}.</p>
                </div>
              ) : null}
              {selectedNote ? (
                <div className="mt-3 grid gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a1c1c]">{selectedNote.title}</h3>
                    <p className="mt-1 text-sm text-[#43474f]">{selectedNote.topic} · {selectedNote.note_type}</p>
                    {difficultyLabel(selectedNote) ? <p className="mt-1 text-xs text-[#0e3b69]">{difficultyLabel(selectedNote)}</p> : null}
                  </div>
                  {selectedNote.description ? <p className="text-sm leading-6 text-[#43474f]">{selectedNote.description}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.tags.slice(0, 8).map((item) => <span key={item} className="rounded border border-[#d5d7de] px-2 py-1 text-xs text-[#43474f]">{item}</span>)}
                  </div>
                  {selectedNote.recognition_triggers.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Recognition</p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#43474f]">{selectedNote.recognition_triggers.slice(0, 2).join("; ")}</p>
                    </div>
                  ) : null}
                  {selectedNote.false_uses.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8f1d15]">False uses</p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#43474f]">{selectedNote.false_uses.slice(0, 2).join("; ")}</p>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded border border-[#d5d7de] p-2"><b>{selectedOutgoing.length}</b><br />outgoing</div>
                    <div className="rounded border border-[#d5d7de] p-2"><b>{selectedIncoming.length}</b><br />incoming</div>
                    <div className="rounded border border-[#d5d7de] p-2"><b>{selectedNote.diagram_urls.length}</b><br />media</div>
                    <div className="rounded border border-[#d5d7de] p-2"><b>{selectedNote.recognition_triggers.length}</b><br />triggers</div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" size="sm" onClick={() => router.push(`/app/notes/${selectedNote.id}`)}><ExternalLink className="h-4 w-4" /> Open</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/app/notes/${selectedNote.id}/edit`)}><Edit3 className="h-4 w-4" /> Edit</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/app/workspace?note=${selectedNote.id}`)}>Workspace</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => focusNode(selectedNote.id)}><Focus className="h-4 w-4" /> Focus</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => { setPinnedIds((current) => new Set([...current, selectedNote.id])); const node = nodesRef.current.find((item) => item.id === selectedNote.id); if (node) node.pinned = true; }}><Pin className="h-4 w-4" /> Pin</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setHiddenIds((current) => new Set([...current, selectedNote.id]))}>Hide</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => { setLinkMode(true); setLinkSourceId(selectedNote.id); setLinkTargetId(""); }}>Link from</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => void suggestLinksWithAI(false)} loading={aiBusy}>AI suggest</Button>
                  </div>
                </div>
              ) : null}
              {selectedEdge ? (
                <div className="mt-3 grid gap-3">
                  <p className="text-sm text-[#43474f]">{relationMeaning(selectedEdge, selectedEdgeSource ?? undefined, selectedEdgeTarget ?? undefined)}</p>
                  <p className="text-sm"><b>Source:</b> {selectedEdgeSource?.title ?? selectedEdge.source_note_id}</p>
                  <p className="text-sm"><b>Target:</b> {selectedEdgeTarget?.title ?? selectedEdge.target_note_id}</p>
                  <select className={inputClassName()} value={selectedEdge.relation_type} onChange={(event) => void updateEdge(selectedEdge, event.target.value)}>
                    {NOTE_LINK_RELATIONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <Button type="button" size="sm" variant="danger" onClick={() => void deleteEdge(selectedEdge)}><Trash2 className="h-4 w-4" /> Delete relation</Button>
                </div>
              ) : null}
            </section>

            {mode === "local" ? (
              <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
                <h2 className="font-semibold text-[#1a1c1c]">Local Graph</h2>
                <p className="mt-2 text-sm text-[#43474f]">{selectedNote ? `Centered on ${selectedNote.title}` : "Select a note to center the graph."}</p>
                <select className={`${inputClassName()} mt-3`} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                  <option value="">Choose center note</option>
                  {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={centerSelected}>Center selected</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setMode("global")}>Switch to Global Graph</Button>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold text-[#1a1c1c]">Link Mode</h2>
              <div className="mt-3 grid gap-2">
                <select className={inputClassName()} value={linkSourceId} onChange={(event) => setLinkSourceId(event.target.value)}>
                  <option value="">Source note</option>
                  {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <select className={inputClassName()} value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}>
                  <option value="">Target note</option>
                  {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <select className={inputClassName()} value={linkRelation} onChange={(event) => setLinkRelation(event.target.value)}>
                  {NOTE_LINK_RELATIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
                {linkRelation === "prerequisite" && linkSourceId && linkTargetId ? (
                  <p className="rounded border border-[#f4c26b] bg-[#fff8e6] p-2 text-xs text-[#6b4a00]">
                    {notesById.get(linkTargetId)?.title} is a prerequisite of {notesById.get(linkSourceId)?.title}.
                  </p>
                ) : null}
                <Button type="button" size="sm" onClick={() => void saveGraphLink()}>Save directional link</Button>
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold text-[#1a1c1c]">Graph Health</h2>
              <div className="mt-3 grid gap-3 text-sm text-[#43474f]">
                <p>{orphanIds.size} orphan notes · {filteredComponents.length} visible clusters.</p>
                {health.relationImbalance ? <p className="text-[#8a5a00]">Many links are generic related links. Consider more specific relations.</p> : null}
                <details>
                  <summary className="cursor-pointer font-medium text-[#0e3b69]">Orphan notes</summary>
                  <div className="mt-2 grid gap-1">
                    {notes.filter((note) => orphanIds.has(note.id)).slice(0, 8).map((note) => (
                      <button key={note.id} type="button" className="text-left hover:text-[#0e3b69]" onClick={() => focusNode(note.id)}>{note.title}</button>
                    ))}
                    {!orphanIds.size ? <span>No orphan notes.</span> : null}
                  </div>
                </details>
                <details>
                  <summary className="cursor-pointer font-medium text-[#0e3b69]">Possible duplicates</summary>
                  <div className="mt-2 grid gap-1">
                    {health.duplicates.map(([a, b]) => <span key={`${a.id}-${b.id}`}>{a.title} / {b.title}</span>)}
                    {!health.duplicates.length ? <span>No obvious duplicates.</span> : null}
                  </div>
                </details>
                <details>
                  <summary className="cursor-pointer font-medium text-[#0e3b69]">Missing prerequisites</summary>
                  <div className="mt-2 grid gap-1">
                    {health.missingPrerequisites.slice(0, 8).map((note) => (
                      <button key={note.id} type="button" className="text-left hover:text-[#0e3b69]" onClick={() => focusNode(note.id)}>{note.title}</button>
                    ))}
                  </div>
                </details>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setOrphanOnly(true)}>Focus orphan notes</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => router.push("/app/manage")}>Open in Manage</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void suggestLinksWithAI(true)} loading={aiBusy}>AI for orphans</Button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold text-[#1a1c1c]">Clusters</h2>
              <div className="mt-3 grid gap-2 text-sm">
                {clusters.map(([label, clusterNotes]) => (
                  <div key={label} className="rounded border border-[#e2e4ea] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className="font-medium text-[#0e3b69]" onClick={() => { setTopic(MATH_TOPICS.includes(label as never) ? label : ""); setMessage(`Focused cluster: ${label}`); }}>{label}</button>
                      <span className="text-[#43474f]">{clusterNotes.length}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="text-xs text-[#43474f] hover:text-[#0e3b69]" onClick={() => setCollapsedClusters((current) => new Set([...current, label]))}>Collapse</button>
                      <button type="button" className="text-xs text-[#43474f] hover:text-[#0e3b69]" onClick={() => exportJson(label)}>Export JSON</button>
                      <button type="button" className="text-xs text-[#43474f] hover:text-[#0e3b69]" onClick={() => void copyText(visibleMarkdown(label), "Cluster note list copied.")}>Copy Markdown</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold text-[#1a1c1c]">Legend & Export</h2>
              <div className="mt-3 grid gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#43474f]">Relation type legend</p>
                  <div className="mt-2 grid gap-1">
                    {NOTE_LINK_RELATIONS.map((item) => {
                      const style = relationStyle(item);
                      return (
                        <div key={item} className="flex items-center gap-2">
                          <span className="h-0.5 w-8" style={{ background: style.color, borderTop: style.dash ? `1px dashed ${style.color}` : undefined }} />
                          <span>{formatRelationLabel(item)}{style.directional ? " ->" : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#43474f]">Topic color legend</p>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {Object.entries(TOPIC_COLORS).slice(0, 8).map(([label, color]) => (
                      <span key={label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[#43474f]">Node size means {sizeMode === "connections" ? "connection count" : "concept/problem level"}.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={exportPng}><Download className="h-4 w-4" /> PNG</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={exportSvg}><Download className="h-4 w-4" /> SVG</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => exportJson()}><Download className="h-4 w-4" /> JSON</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void copyText(visibleMarkdown(), "Visible note list copied as Markdown.")}><Copy className="h-4 w-4" /> Markdown</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={saveSnapshot}><Save className="h-4 w-4" /> Snapshot</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={loadSnapshot}><LocateFixed className="h-4 w-4" /> Load</Button>
                </div>
              </div>
            </section>

            {aiSuggestions.length || possibleNewNotes.length ? (
              <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
                <h2 className="font-semibold text-[#1a1c1c]">AI Graph Suggestions</h2>
                <div className="mt-3 grid gap-2">
                  {aiSuggestions.map((item) => (
                    <article key={`${item.sourceNoteId}-${item.targetNoteId}-${item.relationType}`} className="rounded border border-[#d5d7de] p-3">
                      <p className="text-sm font-semibold text-[#0e3b69]">{item.sourceTitle}{" -> "}{item.targetTitle}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#43474f]">{item.relationType} · {Math.round(item.confidence * 100)}%</p>
                      <p className="mt-2 text-sm leading-6 text-[#43474f]">{item.reason}</p>
                      <Button type="button" size="sm" className="mt-2" variant="secondary" onClick={() => void saveGraphLink(item.sourceNoteId, item.targetNoteId, item.relationType)}>Add link</Button>
                    </article>
                  ))}
                  {possibleNewNotes.map((item) => (
                    <article key={item.title} className="rounded border border-dashed border-[#d5d7de] p-3">
                      <p className="text-sm font-semibold">Possible new note: {item.title}</p>
                      {item.reason ? <p className="mt-1 text-sm text-[#43474f]">{item.reason}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
