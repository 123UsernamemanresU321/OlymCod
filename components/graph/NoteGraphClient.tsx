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
  Pin,
  Search,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
type ColorMode = "topic" | "type";
type SizeMode = "connections" | "level";
type QualityFilter = "any" | "missing-links" | "missing-metadata" | "strong";

type GraphPosition = { x: number; y: number };
type LinkSuggestion = {
  sourceNoteId: string;
  sourceTitle: string;
  targetNoteId: string;
  targetTitle: string;
  relationType: string;
  reason: string;
  confidence: number;
};

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 980;
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
const TOPIC_COLORS: Record<string, string> = {
  "Number Theory": "#2c5282",
  Combinatorics: "#0f766e",
  Algebra: "#1f7a5b",
  Geometry: "#8f1d15",
  Inequalities: "#8a5a00",
  "Formula Bank": "#475569",
  "Problem Patterns": "#0f766e",
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

const relationStyles: Record<string, { color: string; width: number; dash?: string; directional: boolean; label: string }> = {
  prerequisite: { color: "#8f1d15", width: 2.8, directional: true, label: "Prerequisite" },
  "used together": { color: "#2c5282", width: 2, directional: false, label: "Used Together" },
  related: { color: "#94a3b8", width: 1.4, directional: false, label: "Related" },
  "commonly confused": { color: "#b7791f", width: 2, dash: "7 5", directional: false, label: "Commonly Confused" },
  generalization: { color: "#1f7a5b", width: 2.4, directional: true, label: "Generalization" },
  "special case": { color: "#1f7a5b", width: 2.4, directional: true, label: "Special Case" },
  "stronger version": { color: "#0f766e", width: 2.4, directional: true, label: "Stronger Version" },
  "weaker version": { color: "#0f766e", width: 2.4, directional: true, label: "Weaker Version" },
  "example of": { color: "#475569", width: 1.8, directional: true, label: "Example Of" }
};

function relationStyle(relation: string) {
  return relationStyles[relation] ?? { color: "#64748b", width: 1.6, directional: false, label: relation };
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

function noteUrl(id: string) {
  return `/app/notes/${id}`;
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
  if (!seedId) return new Set<string>();
  const included = new Set([seedId]);
  let frontier = new Set([seedId]);
  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const link of links) {
      if (frontier.has(link.source_note_id) && !included.has(link.target_note_id)) next.add(link.target_note_id);
      if (frontier.has(link.target_note_id) && !included.has(link.source_note_id)) next.add(link.source_note_id);
    }
    for (const id of next) included.add(id);
    frontier = next;
  }
  return included;
}

function shortestPath(startId: string, endId: string, links: NoteLink[], allowedIds: Set<string>) {
  if (!startId || !endId || startId === endId) return startId ? [startId] : [];
  const adjacency = new Map<string, string[]>();
  for (const link of links) {
    if (!allowedIds.has(link.source_note_id) || !allowedIds.has(link.target_note_id)) continue;
    adjacency.set(link.source_note_id, [...(adjacency.get(link.source_note_id) ?? []), link.target_note_id]);
    adjacency.set(link.target_note_id, [...(adjacency.get(link.target_note_id) ?? []), link.source_note_id]);
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

function topicLayout(notes: GraphNote[]) {
  const groups = new Map<string, GraphNote[]>();
  for (const note of notes) {
    const key = primaryTopic(note.topic);
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }
  const positions = new Map<string, GraphPosition>();
  Array.from(groups.entries()).forEach(([topic, group], groupIndex) => {
    const centerX = 230 + (groupIndex % 4) * 360;
    const centerY = 210 + Math.floor(groupIndex / 4) * 310;
    group.forEach((note, index) => {
      const angle = (index / Math.max(group.length, 1)) * Math.PI * 2;
      const radius = Math.max(62, 42 + group.length * 7);
      positions.set(note.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    });
  });
  return positions;
}

function gridLayout(notes: GraphNote[]) {
  const positions = new Map<string, GraphPosition>();
  const columns = Math.max(1, Math.ceil(Math.sqrt(notes.length)));
  notes.forEach((note, index) => {
    positions.set(note.id, {
      x: 150 + (index % columns) * 220,
      y: 130 + Math.floor(index / columns) * 150
    });
  });
  return positions;
}

function radialLayout(notes: GraphNote[], links: NoteLink[], selectedId: string | null) {
  const positions = new Map<string, GraphPosition>();
  const centerId = selectedId && notes.some((note) => note.id === selectedId) ? selectedId : notes[0]?.id;
  if (!centerId) return positions;
  positions.set(centerId, { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const idsByDepth = [new Set([centerId]), getNeighborhood(centerId, links, 1), getNeighborhood(centerId, links, 2), new Set(notes.map((note) => note.id))];
  const assigned = new Set([centerId]);
  idsByDepth.slice(1).forEach((ids, ringIndex) => {
    const ring = Array.from(ids).filter((id) => !assigned.has(id) && notes.some((note) => note.id === id));
    const radius = 160 + ringIndex * 170;
    ring.forEach((id, index) => {
      const angle = (index / Math.max(ring.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions.set(id, {
        x: CANVAS_WIDTH / 2 + Math.cos(angle) * radius,
        y: CANVAS_HEIGHT / 2 + Math.sin(angle) * radius
      });
      assigned.add(id);
    });
  });
  return positions;
}

function hierarchyLayout(notes: GraphNote[], links: NoteLink[]) {
  const levels = new Map(notes.map((note) => [note.id, 0]));
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
  const grouped = new Map<number, GraphNote[]>();
  for (const note of notes) {
    const level = levels.get(note.id) ?? 0;
    grouped.set(level, [...(grouped.get(level) ?? []), note]);
  }
  const positions = new Map<string, GraphPosition>();
  Array.from(grouped.entries()).forEach(([level, group]) => {
    group.forEach((note, index) => {
      positions.set(note.id, {
        x: 140 + level * 280,
        y: 120 + index * 130
      });
    });
  });
  return positions;
}

function forceLayout(notes: GraphNote[], links: NoteLink[]) {
  const positions = new Map<string, GraphPosition>();
  const velocities = new Map<string, GraphPosition>();
  notes.forEach((note, index) => {
    const angle = (index / Math.max(notes.length, 1)) * Math.PI * 2;
    positions.set(note.id, {
      x: CANVAS_WIDTH / 2 + Math.cos(angle) * 320,
      y: CANVAS_HEIGHT / 2 + Math.sin(angle) * 260
    });
    velocities.set(note.id, { x: 0, y: 0 });
  });
  const visibleLinks = links.filter((link) => positions.has(link.source_note_id) && positions.has(link.target_note_id));
  for (let tick = 0; tick < 110; tick += 1) {
    for (let i = 0; i < notes.length; i += 1) {
      for (let j = i + 1; j < notes.length; j += 1) {
        const a = positions.get(notes[i].id)!;
        const b = positions.get(notes[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSq = Math.max(dx * dx + dy * dy, 90);
        const force = 2400 / distanceSq;
        const distance = Math.sqrt(distanceSq);
        const ax = (dx / distance) * force;
        const ay = (dy / distance) * force;
        const va = velocities.get(notes[i].id)!;
        const vb = velocities.get(notes[j].id)!;
        va.x += ax;
        va.y += ay;
        vb.x -= ax;
        vb.y -= ay;
      }
    }
    for (const link of visibleLinks) {
      const source = positions.get(link.source_note_id)!;
      const target = positions.get(link.target_note_id)!;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const desired = link.relation_type === "prerequisite" ? 180 : 210;
      const force = (distance - desired) * 0.006;
      const sx = (dx / distance) * force;
      const sy = (dy / distance) * force;
      const vs = velocities.get(link.source_note_id)!;
      const vt = velocities.get(link.target_note_id)!;
      vs.x += sx;
      vs.y += sy;
      vt.x -= sx;
      vt.y -= sy;
    }
    for (const note of notes) {
      const position = positions.get(note.id)!;
      const velocity = velocities.get(note.id)!;
      velocity.x += (CANVAS_WIDTH / 2 - position.x) * 0.003;
      velocity.y += (CANVAS_HEIGHT / 2 - position.y) * 0.003;
      position.x = Math.min(CANVAS_WIDTH - 80, Math.max(80, position.x + velocity.x));
      position.y = Math.min(CANVAS_HEIGHT - 80, Math.max(80, position.y + velocity.y));
      velocity.x *= 0.82;
      velocity.y *= 0.82;
    }
  }
  return positions;
}

function buildLayout(notes: GraphNote[], links: NoteLink[], mode: LayoutMode, selectedId: string | null) {
  if (mode === "topic") return topicLayout(notes);
  if (mode === "hierarchy") return hierarchyLayout(notes, links);
  if (mode === "radial") return radialLayout(notes, links, selectedId);
  if (mode === "grid") return gridLayout(notes);
  return forceLayout(notes, links);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function NoteGraphClient({ notes, links, initialNoteId = null }: NoteGraphClientProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [graphLinks, setGraphLinks] = useState(() => dedupeLinks(links));
  const [mode, setMode] = useState<GraphMode>(initialNoteId ? "local" : "global");
  const [layout, setLayout] = useState<LayoutMode>(initialNoteId ? "radial" : "force");
  const [selectedId, setSelectedId] = useState<string>(initialNoteId ?? notes[0]?.id ?? "");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [localDepth, setLocalDepth] = useState(1);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [noteType, setNoteType] = useState("");
  const [tag, setTag] = useState("");
  const [relation, setRelation] = useState("");
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(12);
  const [hasTriggersOnly, setHasTriggersOnly] = useState(false);
  const [hasFalseUsesOnly, setHasFalseUsesOnly] = useState(false);
  const [hasDiagramsOnly, setHasDiagramsOnly] = useState(false);
  const [orphanOnly, setOrphanOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("any");
  const [showLabels, setShowLabels] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [detailedNodes, setDetailedNodes] = useState(false);
  const [darkCanvas, setDarkCanvas] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>("topic");
  const [sizeMode, setSizeMode] = useState<SizeMode>("connections");
  const [zoom, setZoom] = useState(1);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(() => new Set());
  const [linkMode, setLinkMode] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState(initialNoteId ?? "");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkRelation, setLinkRelation] = useState("related");
  const [pathStartId, setPathStartId] = useState("");
  const [pathEndId, setPathEndId] = useState("");
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<LinkSuggestion[]>([]);
  const [possibleNewNotes, setPossibleNewNotes] = useState<Array<{ title: string; reason?: string }>>([]);
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

  const filteredNotes = useMemo(() => {
    const base = notes.filter((note) => {
      if (hiddenIds.has(note.id)) return false;
      if (collapsedTopics.has(primaryTopic(note.topic))) return false;
      if (topic && !topicIncludes(note.topic, topic)) return false;
      if (noteType && note.note_type !== noteType) return false;
      if (tag && !note.tags.includes(tag)) return false;
      if (note.difficulty && (note.difficulty < levelMin || note.difficulty > levelMax)) return false;
      if (hasTriggersOnly && !note.recognition_triggers.length) return false;
      if (hasFalseUsesOnly && !note.false_uses.length) return false;
      if (hasDiagramsOnly && !note.diagram_urls.length) return false;
      if (orphanOnly && !orphanIds.has(note.id)) return false;
      if (recentOnly && new Date(note.updated_at).getTime() < recentCutoff) return false;
      if (qualityFilter === "missing-links" && (allDegree.get(note.id)?.total ?? 0) > 0) return false;
      if (qualityFilter === "missing-metadata" && note.tags.length && note.description) return false;
      if (qualityFilter === "strong" && ((allDegree.get(note.id)?.total ?? 0) < 2 || !note.tags.length)) return false;
      return true;
    });

    let visible = base;
    if (relation) {
      const relationIds = new Set(
        graphLinks
          .filter((link) => link.relation_type === relation)
          .flatMap((link) => [link.source_note_id, link.target_note_id])
      );
      visible = visible.filter((note) => relationIds.has(note.id));
    }

    if (mode === "local") {
      const seedId = selectedId || visible[0]?.id || notes[0]?.id || null;
      const localIds = getNeighborhood(seedId, graphLinks, localDepth);
      visible = visible.filter((note) => localIds.has(note.id));
    }

    return visible;
  }, [
    allDegree,
    collapsedTopics,
    graphLinks,
    hasDiagramsOnly,
    hasFalseUsesOnly,
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
    recentCutoff,
    recentOnly,
    relation,
    selectedId,
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
  const positions = useMemo(() => buildLayout(filteredNotes, visibleLinks, layout, selectedId), [filteredNotes, layout, selectedId, visibleLinks]);
  const selectedNote = notesById.get(selectedId) ?? null;
  const selectedEdge = visibleLinks.find((link) => link.id === selectedEdgeId) ?? graphLinks.find((link) => link.id === selectedEdgeId) ?? null;
  const selectedEdgeSource = selectedEdge ? notesById.get(selectedEdge.source_note_id) : null;
  const selectedEdgeTarget = selectedEdge ? notesById.get(selectedEdge.target_note_id) : null;
  const viewBoxWidth = CANVAS_WIDTH / zoom;
  const viewBoxHeight = CANVAS_HEIGHT / zoom;
  const viewBox = `${(CANVAS_WIDTH - viewBoxWidth) / 2} ${(CANVAS_HEIGHT - viewBoxHeight) / 2} ${viewBoxWidth} ${viewBoxHeight}`;
  const pathIds = useMemo(() => (pathStartId && pathEndId ? shortestPath(pathStartId, pathEndId, graphLinks, visibleIds) : []), [graphLinks, pathEndId, pathStartId, visibleIds]);
  const pathNodeIds = useMemo(() => new Set(pathIds), [pathIds]);
  const pathEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (let index = 0; index < pathIds.length - 1; index += 1) {
      keys.add(`${pathIds[index]}:${pathIds[index + 1]}`);
      keys.add(`${pathIds[index + 1]}:${pathIds[index]}`);
    }
    return keys;
  }, [pathIds]);

  const topicClusters = useMemo(() => {
    const groups = new Map<string, GraphNote[]>();
    for (const note of filteredNotes) {
      const key = primaryTopic(note.topic);
      groups.set(key, [...(groups.get(key) ?? []), note]);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredNotes]);

  const components = useMemo(() => connectedComponents(filteredNotes, visibleLinks), [filteredNotes, visibleLinks]);
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
      relationImbalance: graphLinks.length >= 6 && relatedCount / graphLinks.length > 0.55
    };
  }, [allDegree, graphLinks, notes]);

  const hiddenCount = notes.length - filteredNotes.length;

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
    setOrphanOnly(false);
    setRecentOnly(false);
    setQualityFilter("any");
    setHiddenIds(new Set());
    setCollapsedTopics(new Set());
    setQuery("");
    setMessage("Filters cleared.");
  }

  function applyPreset(preset: string) {
    clearFilters();
    if (preset === "geometry") setTopic("Geometry");
    if (preset === "prerequisite") setRelation("prerequisite");
    if (preset === "orphans") setOrphanOnly(true);
    if (preset === "confused") setRelation("commonly confused");
    if (preset === "current") {
      setMode("local");
      setLayout("radial");
      setLocalDepth(2);
    }
    setMessage(`${preset.replace(/^\w/, (letter) => letter.toUpperCase())} graph preset loaded.`);
  }

  function focusNode(noteId: string) {
    setSelectedId(noteId);
    setSelectedEdgeId("");
    setMode("local");
    setLayout("radial");
    setLocalDepth(2);
  }

  function handleNodeClick(note: GraphNote) {
    setContextMenu(null);
    setSelectedId(note.id);
    setSelectedEdgeId("");
    if (linkMode) {
      if (!linkSourceId || (linkSourceId && linkTargetId)) {
        setLinkSourceId(note.id);
        setLinkTargetId("");
      } else if (note.id !== linkSourceId) {
        setLinkTargetId(note.id);
      }
    }
  }

  async function saveGraphLink(sourceId = linkSourceId, targetId = linkTargetId, relationType = linkRelation) {
    if (!sourceId || !targetId || sourceId === targetId) {
      setMessage("Choose two different notes before saving a link.");
      return;
    }
    const source = notesById.get(sourceId);
    const target = notesById.get(targetId);
    if (!source || !target) return;
    if (
      relationType === "prerequisite" &&
      !window.confirm(`${target.title} is a prerequisite of ${source.title}. Save this directional link?`)
    ) {
      return;
    }
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

  async function exportSvg() {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    downloadBlob(new Blob([source], { type: "image/svg+xml" }), "olympiad-codex-graph.svg");
  }

  async function exportPng() {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = darkCanvas ? "#0f172a" : "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, "olympiad-codex-graph.png");
      });
    };
    image.src = url;
  }

  function exportJson(clusterTopic?: string) {
    const selectedNotes = clusterTopic ? filteredNotes.filter((note) => primaryTopic(note.topic) === clusterTopic) : filteredNotes;
    const selectedIds = new Set(selectedNotes.map((note) => note.id));
    const payload = {
      exported_at: new Date().toISOString(),
      mode,
      layout,
      filters: { topic, noteType, tag, relation, levelMin, levelMax, orphanOnly, qualityFilter },
      notes: selectedNotes,
      links: visibleLinks.filter((link) => selectedIds.has(link.source_note_id) && selectedIds.has(link.target_note_id))
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "olympiad-codex-graph.json");
  }

  function saveSnapshot() {
    const name = window.prompt("Graph snapshot name", "Current graph view");
    if (!name) return;
    window.localStorage.setItem(
      "olympiad-codex:graph-snapshot",
      JSON.stringify({ name, mode, layout, topic, noteType, tag, relation, levelMin, levelMax, selectedId, localDepth })
    );
    setMessage("Graph snapshot saved locally.");
  }

  function loadSnapshot() {
    const raw = window.localStorage.getItem("olympiad-codex:graph-snapshot");
    if (!raw) {
      setMessage("No local graph snapshot found.");
      return;
    }
    const snapshot = JSON.parse(raw) as Partial<{
      mode: GraphMode;
      layout: LayoutMode;
      topic: string;
      noteType: string;
      tag: string;
      relation: string;
      levelMin: number;
      levelMax: number;
      selectedId: string;
      localDepth: number;
    }>;
    setMode(snapshot.mode ?? "global");
    setLayout(snapshot.layout ?? "force");
    setTopic(snapshot.topic ?? "");
    setNoteType(snapshot.noteType ?? "");
    setTag(snapshot.tag ?? "");
    setRelation(snapshot.relation ?? "");
    setLevelMin(snapshot.levelMin ?? 1);
    setLevelMax(snapshot.levelMax ?? 12);
    setSelectedId(snapshot.selectedId ?? selectedId);
    setLocalDepth(snapshot.localDepth ?? 1);
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
          instruction: "Graph assistant: return structured link suggestions only.",
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

  const selectedIncoming = selectedNote ? graphLinks.filter((link) => link.target_note_id === selectedNote.id) : [];
  const selectedOutgoing = selectedNote ? graphLinks.filter((link) => link.source_note_id === selectedNote.id) : [];

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <div className="mx-auto max-w-[1800px] px-3 py-5 lg:px-6">
        <header className="flex flex-col gap-4 border-b border-[#c3c6d0] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">Relationship map</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1a1c1c]">Visual Note Graph</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#43474f]">
              Explore prerequisites, generalizations, confused pairs, clusters, and weak spots in your Codex.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === "global" ? "primary" : "secondary"} onClick={() => setMode("global")}>
              Global
            </Button>
            <Button type="button" variant={mode === "local" ? "primary" : "secondary"} onClick={() => setMode("local")}>
              Local
            </Button>
            <Button type="button" variant={linkMode ? "primary" : "secondary"} onClick={() => setLinkMode((current) => !current)}>
              <GitBranch className="h-4 w-4" /> Link Mode
            </Button>
            <Button type="button" variant="secondary" onClick={() => setZoom(1)}>
              <Maximize2 className="h-4 w-4" /> Fit View
            </Button>
            <Button type="button" variant="secondary" onClick={() => void suggestLinksWithAI(false)} loading={aiBusy} loadingLabel="Asking AI..." disabled={!selectedNote}>
              <Brain className="h-4 w-4" /> AI Suggest Links
            </Button>
          </div>
        </header>

        {message ? (
          <div className="mt-3 rounded border border-[#c3c6d0] bg-white px-4 py-2 text-sm text-[#43474f]">{message}</div>
        ) : null}
        {notes.length > 300 ? (
          <div className="mt-3 rounded border border-[#facc15] bg-[#fef9c3] px-4 py-2 text-sm text-[#854d0e]">
            This graph has more than 300 notes. Start with a topic filter, local graph, or cluster preset for smoother exploration.
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[310px_minmax(0,1fr)_340px]">
          <aside className="grid gap-3 xl:max-h-[calc(100vh-170px)] xl:overflow-y-auto">
            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#0e3b69]" />
                <input className={inputClassName()} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, tags, triggers..." />
              </div>
              {query ? (
                <div className="mt-3 max-h-40 overflow-auto rounded border border-[#e2e4ea] bg-[#f9f9f9] p-2">
                  {filteredNotes.filter((note) => searchMatches.has(note.id)).slice(0, 10).map((note) => (
                    <button key={note.id} type="button" onClick={() => focusNode(note.id)} className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-white">
                      {note.title}
                    </button>
                  ))}
                  {!filteredNotes.some((note) => searchMatches.has(note.id)) ? <p className="text-sm text-[#43474f]">No visible matches.</p> : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#0e3b69]" />
                <h2 className="font-semibold">Filters</h2>
              </div>
              <div className="grid gap-3">
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
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={hasTriggersOnly} onChange={(event) => setHasTriggersOnly(event.target.checked)} /> Has recognition triggers</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={hasFalseUsesOnly} onChange={(event) => setHasFalseUsesOnly(event.target.checked)} /> Has common false uses</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={hasDiagramsOnly} onChange={(event) => setHasDiagramsOnly(event.target.checked)} /> Has diagrams</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={orphanOnly} onChange={(event) => setOrphanOnly(event.target.checked)} /> Orphan notes only</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} /> Recently updated</label>
                <Button type="button" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Layout & Visuals</h2>
              <div className="mt-3 grid gap-3">
                <select className={inputClassName()} value={layout} onChange={(event) => setLayout(event.target.value as LayoutMode)}>
                  <option value="force">Force-directed</option>
                  <option value="topic">Topic clusters</option>
                  <option value="hierarchy">Hierarchical prerequisites</option>
                  <option value="radial">Radial local graph</option>
                  <option value="grid">Compact grid</option>
                </select>
                {mode === "local" ? (
                  <label className="text-sm text-[#43474f]">
                    Local depth: {localDepth}
                    <input className="mt-2 w-full" type="range" min={1} max={3} value={localDepth} onChange={(event) => setLocalDepth(Number(event.target.value))} />
                  </label>
                ) : null}
                <select className={inputClassName()} value={colorMode} onChange={(event) => setColorMode(event.target.value as ColorMode)}>
                  <option value="topic">Color by topic</option>
                  <option value="type">Color by note type</option>
                </select>
                <select className={inputClassName()} value={sizeMode} onChange={(event) => setSizeMode(event.target.value as SizeMode)}>
                  <option value="connections">Size by connection count</option>
                  <option value="level">Size by note/problem level</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Show labels</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={showArrows} onChange={(event) => setShowArrows(event.target.checked)} /> Show arrows</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={detailedNodes} onChange={(event) => setDetailedNodes(event.target.checked)} /> Detailed nodes</label>
                <label className="flex items-center gap-2 text-sm text-[#43474f]"><input type="checkbox" checked={darkCanvas} onChange={(event) => setDarkCanvas(event.target.checked)} /> Dark graph background</label>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setZoom((value) => Math.max(0.55, value - 0.15))}>-</Button>
                  <Button type="button" variant="secondary" onClick={() => setZoom((value) => Math.min(1.8, value + 0.15))}>+</Button>
                  <Button type="button" variant="secondary" onClick={() => setLayout((value) => value)}>Reset layout</Button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Path Finder</h2>
              <div className="mt-3 grid gap-2">
                <select className={inputClassName()} value={pathStartId} onChange={(event) => setPathStartId(event.target.value)}>
                  <option value="">Start note</option>
                  {filteredNotes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <select className={inputClassName()} value={pathEndId} onChange={(event) => setPathEndId(event.target.value)}>
                  <option value="">End note</option>
                  {filteredNotes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                {pathStartId && pathEndId ? (
                  pathIds.length > 1 ? (
                    <p className="text-sm leading-6 text-[#0e3b69]">{pathIds.map((id) => notesById.get(id)?.title ?? id).join(" -> ")}</p>
                  ) : (
                    <p className="text-sm text-[#8f1d15]">No path found.</p>
                  )
                ) : null}
              </div>
            </section>
          </aside>

          <main className="min-h-[720px] overflow-hidden rounded-lg border border-[#c3c6d0] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e4ea] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-[#1a1c1c]">{filteredNotes.length} visible nodes</span>
                <span className="text-[#43474f]">{visibleLinks.length} visible edges</span>
                <span className="text-[#43474f]">{hiddenCount} hidden by filters</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["full", "geometry", "prerequisite", "orphans", "confused", "current"].map((preset) => (
                  <button key={preset} type="button" className="rounded border border-[#d5d7de] px-2 py-1 text-xs text-[#43474f] hover:bg-[#f9f9f9]" onClick={() => applyPreset(preset)}>
                    {preset === "full" ? "Full Graph" : preset === "confused" ? "Commonly Confused" : preset === "current" ? "Current Neighborhood" : preset}
                  </button>
                ))}
              </div>
            </div>

            {!notes.length ? (
              <div className="grid min-h-[680px] place-items-center p-8 text-center">
                <div>
                  <Network className="mx-auto h-10 w-10 text-[#0e3b69]" />
                  <h2 className="mt-4 text-xl font-semibold">No notes yet</h2>
                  <p className="mt-2 text-sm text-[#43474f]">Create notes first, then the graph becomes your navigation map.</p>
                </div>
              </div>
            ) : filteredNotes.length ? (
              <div className="relative">
                <svg
                  ref={svgRef}
                  viewBox={viewBox}
                  className={cn("h-[690px] w-full touch-pan-x touch-pan-y", darkCanvas ? "bg-[#0f172a]" : "bg-[#fbfbfb]")}
                  role="img"
                  aria-label="Interactive Olympiad Codex note graph"
                  onClick={() => setContextMenu(null)}
                >
                  <defs>
                    <marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                    </marker>
                  </defs>
                  {topicClusters.map(([clusterTopic, group]) => {
                    const groupPositions = group.map((note) => positions.get(note.id)).filter((position): position is GraphPosition => Boolean(position));
                    if (!groupPositions.length || layout !== "topic") return null;
                    const minX = Math.min(...groupPositions.map((position) => position.x)) - 82;
                    const minY = Math.min(...groupPositions.map((position) => position.y)) - 70;
                    const maxX = Math.max(...groupPositions.map((position) => position.x)) + 82;
                    const maxY = Math.max(...groupPositions.map((position) => position.y)) + 70;
                    return (
                      <g key={clusterTopic} opacity="0.18">
                        <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} rx="28" fill={TOPIC_COLORS[clusterTopic] ?? TOPIC_COLORS.Mixed} />
                        <text x={minX + 18} y={minY + 28} className="fill-[#0f172a] text-[18px] font-semibold">{clusterTopic}</text>
                      </g>
                    );
                  })}
                  {visibleLinks.map((link) => {
                    const source = positions.get(link.source_note_id);
                    const target = positions.get(link.target_note_id);
                    if (!source || !target) return null;
                    const style = relationStyle(link.relation_type);
                    const inPath = pathEdgeKeys.has(`${link.source_note_id}:${link.target_note_id}`);
                    const searchDimmed = query && !searchMatches.has(link.source_note_id) && !searchMatches.has(link.target_note_id);
                    return (
                      <g key={link.id} onClick={(event) => { event.stopPropagation(); setSelectedEdgeId(link.id); setSelectedId(""); }}>
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={inPath ? "#16a34a" : style.color}
                          strokeWidth={inPath ? style.width + 2 : style.width}
                          strokeDasharray={style.dash}
                          markerEnd={showArrows && style.directional ? "url(#graph-arrow)" : undefined}
                          opacity={searchDimmed ? 0.15 : 0.82}
                          className="cursor-pointer"
                        />
                        {detailedNodes ? (
                          <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8} textAnchor="middle" className={cn("pointer-events-none text-[12px]", darkCanvas ? "fill-slate-200" : "fill-[#43474f]")}>
                            {link.relation_type}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  {filteredNotes.map((note) => {
                    const position = positions.get(note.id);
                    if (!position) return null;
                    const degree = visibleDegree.get(note.id)?.total ?? allDegree.get(note.id)?.total ?? 0;
                    const radius = sizeMode === "connections" ? 18 + Math.min(22, degree * 4) : 18 + Math.min(22, (note.difficulty ?? 3) * 2);
                    const selected = note.id === selectedId;
                    const matched = !query || searchMatches.has(note.id);
                    const inPath = pathNodeIds.has(note.id);
                    const pinned = pinnedIds.has(note.id);
                    return (
                      <g
                        key={note.id}
                        className="cursor-pointer"
                        opacity={matched || inPath ? 1 : 0.18}
                        onClick={(event) => { event.stopPropagation(); handleNodeClick(note); }}
                        onDoubleClick={(event) => { event.stopPropagation(); router.push(noteUrl(note.id)); }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setSelectedId(note.id);
                          setSelectedEdgeId("");
                          setContextMenu({ id: note.id, x: event.clientX, y: event.clientY });
                        }}
                      >
                        <title>{`${note.title} · ${note.topic} · ${note.note_type} · ${degree} relations`}</title>
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={radius + (selected ? 5 : 0)}
                          fill={inPath ? "#dcfce7" : matched && query ? "#fef3c7" : darkCanvas ? "#1e293b" : "#ffffff"}
                          stroke={inPath ? "#16a34a" : noteColor(note, colorMode)}
                          strokeWidth={selected || pinned ? 5 : matched && query ? 4 : 2.5}
                        />
                        <circle cx={position.x} cy={position.y} r={Math.max(8, radius * 0.45)} fill={noteColor(note, colorMode)} opacity="0.88" />
                        {showLabels ? (
                          <text x={position.x} y={position.y + radius + 18} textAnchor="middle" className={cn("pointer-events-none text-[12px] font-semibold", darkCanvas ? "fill-slate-100" : "fill-[#1a1c1c]")}>
                            {note.title.length > 24 ? `${note.title.slice(0, 23)}...` : note.title}
                          </text>
                        ) : null}
                        {detailedNodes ? (
                          <text x={position.x} y={position.y + radius + 34} textAnchor="middle" className={cn("pointer-events-none text-[10px]", darkCanvas ? "fill-slate-300" : "fill-[#43474f]")}>
                            {note.note_type} · {degree}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
                {contextMenu ? (
                  <div className="fixed z-50 grid w-56 gap-1 rounded-lg border border-[#c3c6d0] bg-white p-2 text-sm shadow-lg" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <Link className="rounded px-2 py-1 hover:bg-[#f9f9f9]" href={noteUrl(contextMenu.id)}>Open note</Link>
                    <Link className="rounded px-2 py-1 hover:bg-[#f9f9f9]" href={`/app/workspace?note=${contextMenu.id}`}>Open in workspace</Link>
                    <button className="rounded px-2 py-1 text-left hover:bg-[#f9f9f9]" type="button" onClick={() => { void copyText(`${window.location.origin}${noteUrl(contextMenu.id)}`, "Note link copied."); setContextMenu(null); }}>Copy note link</button>
                    <button className="rounded px-2 py-1 text-left hover:bg-[#f9f9f9]" type="button" onClick={() => { setLinkMode(true); setLinkSourceId(contextMenu.id); setLinkTargetId(""); setContextMenu(null); }}>Create link from this note</button>
                    <button className="rounded px-2 py-1 text-left hover:bg-[#f9f9f9]" type="button" onClick={() => { setHiddenIds((current) => new Set([...current, contextMenu.id])); setContextMenu(null); }}>Hide node</button>
                    <button className="rounded px-2 py-1 text-left hover:bg-[#f9f9f9]" type="button" onClick={() => { setPinnedIds((current) => { const next = new Set(current); next.has(contextMenu.id) ? next.delete(contextMenu.id) : next.add(contextMenu.id); return next; }); setContextMenu(null); }}>Pin/unpin node</button>
                    <button className="rounded px-2 py-1 text-left hover:bg-[#f9f9f9]" type="button" onClick={() => { focusNode(contextMenu.id); setContextMenu(null); }}>Focus local graph</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid min-h-[680px] place-items-center p-8 text-center">
                <div>
                  <Filter className="mx-auto h-10 w-10 text-[#0e3b69]" />
                  <h2 className="mt-4 text-xl font-semibold">Filters hide all notes</h2>
                  <p className="mt-2 text-sm text-[#43474f]">Clear filters or load the Full Graph preset.</p>
                  <Button type="button" className="mt-4" onClick={clearFilters}>Clear filters</Button>
                </div>
              </div>
            )}
          </main>

          <aside className="grid gap-3 xl:max-h-[calc(100vh-170px)] xl:overflow-y-auto">
            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="text-lg font-semibold">Inspector</h2>
              {selectedEdge ? (
                <div className="mt-4 grid gap-3 text-sm">
                  <p className="font-semibold text-[#0e3b69]">Edge: {selectedEdge.relation_type}</p>
                  <p>{relationMeaning(selectedEdge, selectedEdgeSource ?? undefined, selectedEdgeTarget ?? undefined)}</p>
                  <p className="text-[#43474f]">Source: {selectedEdgeSource?.title ?? "Unknown"}</p>
                  <p className="text-[#43474f]">Target: {selectedEdgeTarget?.title ?? "Unknown"}</p>
                  <p className="text-[#43474f]">Created: {selectedEdge.created_at?.slice(0, 10) ?? "Unknown"}</p>
                  <select className={inputClassName()} value={selectedEdge.relation_type} onChange={(event) => void updateEdge(selectedEdge, event.target.value)}>
                    {NOTE_LINK_RELATIONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <Button type="button" variant="danger" onClick={() => void deleteEdge(selectedEdge)}>
                    <Trash2 className="h-4 w-4" /> Delete relation
                  </Button>
                </div>
              ) : selectedNote ? (
                <div className="mt-4 grid gap-4 text-sm">
                  <div>
                    <h3 className="text-xl font-semibold text-[#1a1c1c]">{selectedNote.title}</h3>
                    <p className="mt-1 text-[#43474f]">{selectedNote.topic} · {selectedNote.note_type}</p>
                    {difficultyLabel(selectedNote) ? <p className="mt-1 text-[#43474f]">{difficultyLabel(selectedNote)}</p> : null}
                  </div>
                  {selectedNote.description ? <p className="leading-6 text-[#43474f]">{selectedNote.description}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.tags.slice(0, 8).map((item) => <span key={item} className="rounded border border-[#d5d7de] px-2 py-1 text-xs text-[#43474f]">{item}</span>)}
                  </div>
                  {selectedNote.recognition_triggers.length ? (
                    <div>
                      <p className="font-semibold">Recognition triggers</p>
                      <ul className="mt-1 list-disc pl-5 text-[#43474f]">
                        {selectedNote.recognition_triggers.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {selectedNote.false_uses.length ? (
                    <div>
                      <p className="font-semibold">Common false uses</p>
                      <ul className="mt-1 list-disc pl-5 text-[#43474f]">
                        {selectedNote.false_uses.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#43474f]">
                    <div className="rounded border border-[#e2e4ea] p-2">Outgoing: {selectedOutgoing.length}</div>
                    <div className="rounded border border-[#e2e4ea] p-2">Incoming: {selectedIncoming.length}</div>
                  </div>
                  <div className="grid gap-2">
                    <Link href={noteUrl(selectedNote.id)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#2c5282] bg-[#2c5282] px-3 py-2 text-sm font-medium text-white">
                      <ExternalLink className="h-4 w-4" /> Open Note
                    </Link>
                    <Link href={`/app/notes/${selectedNote.id}/edit`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#c3c6d0] px-3 py-2 text-sm font-medium text-[#0e3b69]">
                      <Edit3 className="h-4 w-4" /> Edit Note
                    </Link>
                    <Button type="button" variant="secondary" onClick={() => focusNode(selectedNote.id)}>
                      <Focus className="h-4 w-4" /> Focus Graph Here
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setPinnedIds((current) => new Set([...current, selectedNote.id]))}>
                      <Pin className="h-4 w-4" /> Pin Node
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#43474f]">Click a node or edge to inspect it.</p>
              )}
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Link Mode</h2>
              <p className="mt-1 text-sm leading-6 text-[#43474f]">Select a source note, then a target note. Only one directional database edge is stored.</p>
              <div className="mt-3 grid gap-2">
                <select className={inputClassName()} value={linkSourceId} onChange={(event) => setLinkSourceId(event.target.value)}>
                  <option value="">Source note</option>
                  {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <select className={inputClassName()} value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}>
                  <option value="">Target note</option>
                  {notes.filter((note) => note.id !== linkSourceId).map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
                <select className={inputClassName()} value={linkRelation} onChange={(event) => setLinkRelation(event.target.value)}>
                  {NOTE_LINK_RELATIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
                {linkSourceId && linkTargetId && linkRelation === "prerequisite" ? (
                  <p className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-2 text-xs text-[#43474f]">
                    {notesById.get(linkTargetId)?.title} is a prerequisite of {notesById.get(linkSourceId)?.title}.
                  </p>
                ) : null}
                <Button type="button" onClick={() => void saveGraphLink()}>
                  Save directional link
                </Button>
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Graph Health</h2>
              <div className="mt-3 grid gap-3 text-sm text-[#43474f]">
                <p>Orphan notes: {orphanIds.size}</p>
                <p>Connected clusters: {components.length}</p>
                <p>Missing prerequisites: {health.missingPrerequisites.length}</p>
                <p>Possible duplicates: {health.duplicates.length}</p>
                {health.relationImbalance ? <p className="text-[#8a5a00]">Many links are generic “related”; consider stronger relation types.</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => { setOrphanOnly(true); setMode("global"); }}>View orphan notes</Button>
                  <Link href="/app/manage" className="inline-flex min-h-9 items-center justify-center rounded border border-[#c3c6d0] px-3 py-2 text-sm text-[#0e3b69]">Open in Manage</Link>
                  <Button type="button" variant="secondary" onClick={() => void suggestLinksWithAI(true)} loading={aiBusy} loadingLabel="Asking AI...">
                    <Brain className="h-4 w-4" /> Ask AI
                  </Button>
                </div>
                <details>
                  <summary className="cursor-pointer font-semibold text-[#1a1c1c]">Hubs and clusters</summary>
                  <div className="mt-2 grid gap-2">
                    {health.incoming.slice(0, 3).map((note) => <button key={note.id} type="button" onClick={() => focusNode(note.id)} className="text-left hover:text-[#0e3b69]">Incoming hub: {note.title}</button>)}
                    {components.slice(0, 4).map((component, index) => <p key={component.join(":")}>Cluster {index + 1}: {component.length} notes</p>)}
                  </div>
                </details>
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Clusters</h2>
              <div className="mt-3 grid gap-2">
                {topicClusters.map(([clusterTopic, group]) => (
                  <div key={clusterTopic} className="rounded border border-[#e2e4ea] p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => setTopic(clusterTopic)} className="font-semibold text-[#0e3b69]">{clusterTopic}</button>
                      <span className="text-[#43474f]">{group.length}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="text-xs text-[#43474f] hover:text-[#0e3b69]" onClick={() => setCollapsedTopics((current) => { const next = new Set(current); next.has(clusterTopic) ? next.delete(clusterTopic) : next.add(clusterTopic); return next; })}>
                        {collapsedTopics.has(clusterTopic) ? "Expand" : "Collapse"}
                      </button>
                      <button type="button" className="text-xs text-[#43474f] hover:text-[#0e3b69]" onClick={() => exportJson(clusterTopic)}>Export cluster JSON</button>
                    </div>
                  </div>
                ))}
                {!topicClusters.length ? <p className="text-sm text-[#43474f]">No clusters in the current graph.</p> : null}
              </div>
            </section>

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Export & Snapshots</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={() => void exportSvg()}><Download className="h-4 w-4" /> SVG</Button>
                <Button type="button" variant="secondary" onClick={() => void exportPng()}><Download className="h-4 w-4" /> PNG</Button>
                <Button type="button" variant="secondary" onClick={() => exportJson()}><Download className="h-4 w-4" /> JSON</Button>
                <Button type="button" variant="secondary" onClick={() => void copyText(filteredNotes.map((note) => note.title).join("\n"), "Visible note list copied.")}><Copy className="h-4 w-4" /> List</Button>
                <Button type="button" variant="secondary" onClick={() => void copyText(filteredNotes.map((note) => `- [${note.title}](${noteUrl(note.id)})`).join("\n"), "Markdown note list copied.")}>Markdown</Button>
                <Button type="button" variant="secondary" onClick={saveSnapshot}>Save snapshot</Button>
                <Button type="button" variant="secondary" onClick={loadSnapshot}>Load snapshot</Button>
              </div>
            </section>

            {(aiSuggestions.length || possibleNewNotes.length || aiBusy) ? (
              <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
                <h2 className="font-semibold">AI Graph Suggestions</h2>
                {aiBusy ? <p className="mt-2 text-sm text-[#43474f]">Generating structured link suggestions...</p> : null}
                <div className="mt-3 grid gap-3">
                  {aiSuggestions.map((suggestion) => (
                    <article key={`${suggestion.sourceNoteId}:${suggestion.targetNoteId}:${suggestion.relationType}`} className="rounded border border-[#e2e4ea] p-3 text-sm">
                      <p className="font-semibold">{suggestion.sourceTitle} &rarr; {suggestion.targetTitle}</p>
                      <p className="mt-1 text-[#0e3b69]">{suggestion.relationType} · {Math.round(suggestion.confidence * 100)}%</p>
                      <p className="mt-1 text-[#43474f]">{suggestion.reason}</p>
                      <Button type="button" className="mt-2" variant="secondary" onClick={() => void saveGraphLink(suggestion.sourceNoteId, suggestion.targetNoteId, suggestion.relationType)}>
                        Add link
                      </Button>
                    </article>
                  ))}
                  {possibleNewNotes.map((item) => (
                    <article key={item.title} className="rounded border border-dashed border-[#c3c6d0] p-3 text-sm">
                      <p className="font-semibold">Possible new note: {item.title}</p>
                      {item.reason ? <p className="mt-1 text-[#43474f]">{item.reason}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
              <h2 className="font-semibold">Edge Legend</h2>
              <div className="mt-3 grid gap-2 text-sm">
                {NOTE_LINK_RELATIONS.map((item) => {
                  const style = relationStyle(item);
                  return (
                    <div key={item} className="flex items-center gap-2">
                      <span className="h-0.5 w-8" style={{ backgroundColor: style.color, borderTop: style.dash ? `2px dashed ${style.color}` : undefined }} />
                      <span className="text-[#43474f]">{style.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
