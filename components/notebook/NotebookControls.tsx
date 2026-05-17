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

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#c3c6d0] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1a1c1c]">Content Sources</h2>
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
