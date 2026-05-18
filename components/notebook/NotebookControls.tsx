"use client";

import {
  NOTEBOOK_CONTENT_SOURCES,
  NOTEBOOK_DETAIL_LEVELS,
  NOTEBOOK_LAYOUT_STYLES,
  NOTEBOOK_NOTE_TYPE_OPTIONS,
  NOTEBOOK_PROBLEM_STATUSES,
  NOTEBOOK_REVIEW_STATUSES,
  NOTEBOOK_SECTION_TOGGLES,
  NOTEBOOK_SORT_ORDERS,
  NOTEBOOK_TOPIC_OPTIONS
} from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig, NotebookContentSource, NotebookSectionToggle } from "@/lib/notebook/types";
import { Field, inputClassName } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

interface NotebookControlsProps {
  config: NotebookConfig;
  availableTopics: string[];
  availableTags: string[];
  onChange: (config: NotebookConfig) => void;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function NotebookControls({ config, availableTopics, availableTags, onChange }: NotebookControlsProps) {
  const topics = Array.from(new Set([...NOTEBOOK_TOPIC_OPTIONS, ...availableTopics])).filter(Boolean);
  const tags = Array.from(new Set(availableTags)).filter(Boolean).sort();

  function update(update: Partial<NotebookConfig>) {
    onChange({ ...config, ...update });
  }

  function updateSource(source: NotebookContentSource, checked: boolean) {
    update({ contentSources: { ...config.contentSources, [source]: checked } });
  }

  function updateToggle(toggle: NotebookSectionToggle, checked: boolean) {
    update({ sectionToggles: { ...config.sectionToggles, [toggle]: checked } });
  }

  function csv(value: string) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  const filterVerb = config.selectionMode === "blacklist" ? "Exclude selected" : "Include selected";

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1a1c1c]">Content Sources</h2>
        <div className="mt-3 rounded border border-[#d5d7de] bg-[#f9f9f9] p-3">
          <p className="text-sm font-semibold text-[#1a1c1c]">Selection Mode</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => update({ selectionMode: "whitelist" })}
              className={cn(
                "rounded border px-3 py-2 text-sm text-[#43474f]",
                config.selectionMode === "whitelist" && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
              )}
            >
              Include only
            </button>
            <button
              type="button"
              onClick={() => update({ selectionMode: "blacklist" })}
              className={cn(
                "rounded border px-3 py-2 text-sm text-[#43474f]",
                config.selectionMode === "blacklist" && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
              )}
            >
              Include everything except
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#43474f]">
            {config.selectionMode === "blacklist"
              ? "Start with selected sources, then remove items matching exclusions."
              : "Start with selected sources, then include only matching filters."}
          </p>
        </div>
        <div className="mt-3 grid gap-2">
          {NOTEBOOK_CONTENT_SOURCES.map((source) => (
            <label key={source.key} className="flex items-center gap-3 text-sm text-[#43474f]">
              <input
                type="checkbox"
                checked={config.contentSources[source.key]}
                onChange={(event) => updateSource(source.key, event.target.checked)}
              />
              {source.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1a1c1c]">Filters</h2>
        <p className="mt-1 text-sm text-[#43474f]">{filterVerb} topics, note types, tags, and statuses.</p>
        <div className="mt-4 grid gap-4">
          <Field label="Topics">
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => update({ topics: toggleValue(config.topics, topic) })}
                  className={cn(
                    "rounded border px-3 py-2 text-[13px] text-[#43474f]",
                    config.topics.includes(topic) && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                  )}
                >
                  {topic}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Note Types">
            <div className="flex flex-wrap gap-2">
              {NOTEBOOK_NOTE_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update({ noteTypes: toggleValue(config.noteTypes, type) })}
                  className={cn(
                    "rounded border px-3 py-2 text-[13px] text-[#43474f]",
                    config.noteTypes.includes(type) && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Min Difficulty">
              <input
                className={inputClassName()}
                type="number"
                min={1}
                max={12}
                value={config.difficultyMin}
                onChange={(event) => update({ difficultyMin: Number(event.target.value) })}
              />
            </Field>
            <Field label="Max Difficulty">
              <input
                className={inputClassName()}
                type="number"
                min={1}
                max={12}
                value={config.difficultyMax}
                onChange={(event) => update({ difficultyMax: Number(event.target.value) })}
              />
            </Field>
          </div>

          <Field label="Tags">
            <input
              className={inputClassName()}
              value={config.tags.join(", ")}
              onChange={(event) =>
                update({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })
              }
              placeholder={tags.slice(0, 3).join(", ") || "modular arithmetic, geometry"}
            />
          </Field>

          <Field label="Review Status">
            <div className="flex flex-wrap gap-2">
              {NOTEBOOK_REVIEW_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => update({ reviewStatuses: toggleValue(config.reviewStatuses, status) })}
                  className={cn(
                    "rounded border px-3 py-2 text-[13px] text-[#43474f]",
                    config.reviewStatuses.includes(status) && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                  )}
                >
                  {status.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Problem Status">
            <div className="flex flex-wrap gap-2">
              {NOTEBOOK_PROBLEM_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => update({ problemStatuses: toggleValue(config.problemStatuses, status) })}
                  className={cn(
                    "rounded border px-3 py-2 text-[13px] text-[#43474f]",
                    config.problemStatuses.includes(status) && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                  )}
                >
                  {status.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </Field>

          {config.selectionMode === "blacklist" ? (
            <div className="grid gap-4 rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
              <h3 className="text-sm font-semibold text-[#1a1c1c]">Exclusions</h3>
              <Field label="Exclude topics">
                <input
                  className={inputClassName()}
                  value={config.excludeTopics.join(", ")}
                  onChange={(event) => update({ excludeTopics: csv(event.target.value) })}
                  placeholder="Formula Bank, Inbox"
                />
              </Field>
              <Field label="Exclude note types">
                <input
                  className={inputClassName()}
                  value={config.excludeNoteTypes.join(", ")}
                  onChange={(event) => update({ excludeNoteTypes: csv(event.target.value) })}
                  placeholder="Formula Log, Inbox"
                />
              </Field>
              <Field label="Exclude tags">
                <input
                  className={inputClassName()}
                  value={config.excludeTags.join(", ")}
                  onChange={(event) => update({ excludeTags: csv(event.target.value) })}
                  placeholder="too basic, mastered"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Exclude difficulty min">
                  <input
                    className={inputClassName()}
                    type="number"
                    min={1}
                    max={12}
                    value={config.excludeDifficultyMin ?? ""}
                    onChange={(event) =>
                      update({ excludeDifficultyMin: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </Field>
                <Field label="Exclude difficulty max">
                  <input
                    className={inputClassName()}
                    type="number"
                    min={1}
                    max={12}
                    value={config.excludeDifficultyMax ?? ""}
                    onChange={(event) =>
                      update({ excludeDifficultyMax: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </Field>
              </div>
              <Field label="Exclude review statuses">
                <input
                  className={inputClassName()}
                  value={config.excludeReviewStatuses.join(", ")}
                  onChange={(event) => update({ excludeReviewStatuses: csv(event.target.value) })}
                  placeholder="mastered, ignored"
                />
              </Field>
              <label className="flex items-center gap-3 text-sm text-[#43474f]">
                <input
                  type="checkbox"
                  checked={config.excludeMastered}
                  onChange={(event) => update({ excludeMastered: event.target.checked })}
                />
                Exclude mastered notes
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1a1c1c]">Detail Level</h2>
        <select
          className={inputClassName("mt-3")}
          value={config.detailLevel}
          onChange={(event) => update({ detailLevel: event.target.value as NotebookConfig["detailLevel"] })}
        >
          {NOTEBOOK_DETAIL_LEVELS.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </section>

      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1a1c1c]">Section Toggles</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {NOTEBOOK_SECTION_TOGGLES.map((toggle) => (
            <label key={toggle.key} className="flex items-center gap-3 text-sm text-[#43474f]">
              <input
                type="checkbox"
                checked={config.sectionToggles[toggle.key]}
                onChange={(event) => updateToggle(toggle.key, event.target.checked)}
              />
              {toggle.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1a1c1c]">Layout And Page</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Layout Style">
            <select
              className={inputClassName()}
              value={config.layoutStyle}
              onChange={(event) => update({ layoutStyle: event.target.value as NotebookConfig["layoutStyle"] })}
            >
              {NOTEBOOK_LAYOUT_STYLES.map((style) => (
                <option key={style}>{style}</option>
              ))}
            </select>
          </Field>
          <Field label="Sort Order">
            <select
              className={inputClassName()}
              value={config.sortOrder}
              onChange={(event) => update({ sortOrder: event.target.value as NotebookConfig["sortOrder"] })}
            >
              {NOTEBOOK_SORT_ORDERS.map((sort) => (
                <option key={sort}>{sort}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Page Size">
              <select
                className={inputClassName()}
                value={config.pageSettings.pageSize}
                onChange={(event) =>
                  update({ pageSettings: { ...config.pageSettings, pageSize: event.target.value as "A4" | "Letter" } })
                }
              >
                <option>A4</option>
                <option>Letter</option>
              </select>
            </Field>
            <Field label="Columns">
              <select
                className={inputClassName()}
                value={config.pageSettings.columns}
                onChange={(event) =>
                  update({ pageSettings: { ...config.pageSettings, columns: event.target.value as "one" | "two" } })
                }
              >
                <option value="one">One column</option>
                <option value="two">Two columns</option>
              </select>
            </Field>
            <Field label="Margins">
              <select
                className={inputClassName()}
                value={config.pageSettings.margins}
                onChange={(event) =>
                  update({
                    pageSettings: {
                      ...config.pageSettings,
                      margins: event.target.value as "compact" | "normal" | "wide"
                    }
                  })
                }
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </Field>
            <Field label="Font Size">
              <select
                className={inputClassName()}
                value={config.pageSettings.fontSize}
                onChange={(event) =>
                  update({
                    pageSettings: {
                      ...config.pageSettings,
                      fontSize: event.target.value as "small" | "normal" | "large"
                    }
                  })
                }
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </Field>
          </div>
        </div>
      </section>
    </div>
  );
}
