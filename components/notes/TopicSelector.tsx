"use client";

import {
  COLLECTION_TOPICS,
  EXCLUSIVE_TOPICS,
  MATH_TOPICS,
  buildTopicValue,
  splitTopicValue
} from "@/lib/constants/notes";
import { cn } from "@/lib/utils/cn";

interface TopicSelectorProps {
  value: string;
  onChange: (topic: string) => void;
  includeInbox?: boolean;
  allowEmpty?: boolean;
}

export function TopicSelector({ value, onChange, includeInbox = false, allowEmpty = false }: TopicSelectorProps) {
  const selected = splitTopicValue(value);
  const selectedInbox = selected.includes("Inbox");
  const selectedCollections = selected.filter((topic) =>
    COLLECTION_TOPICS.includes(topic as (typeof COLLECTION_TOPICS)[number])
  );
  const selectedMath = selected.filter((topic) => MATH_TOPICS.includes(topic as (typeof MATH_TOPICS)[number]));

  function toggleMathTopic(topic: string) {
    const nextTopics = selectedMath.includes(topic)
      ? selectedMath.filter((item) => item !== topic)
      : [...selectedMath, topic];
    onChange(buildTopicValue([...selectedCollections, ...nextTopics]));
  }

  function toggleCollectionTopic(topic: string) {
    const nextCollections = selectedCollections.includes(topic)
      ? selectedCollections.filter((item) => item !== topic)
      : [...selectedCollections, topic];
    onChange(buildTopicValue([...nextCollections, ...selectedMath]));
  }

  function chooseInboxTopic() {
    onChange("Inbox");
  }

  return (
    <div className="rounded border border-[#c3c6d0] bg-white p-3">
      <div className="flex flex-wrap gap-2">
        {MATH_TOPICS.map((topic) => {
          const active = !selectedInbox && selectedMath.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggleMathTopic(topic)}
              className={cn(
                "rounded border px-3 py-2 text-[13px] font-medium text-[#43474f] hover:bg-[#eef4ff]",
                active && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
              )}
            >
              {topic}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#d5d7de] pt-3">
        {allowEmpty ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn(
              "rounded border px-3 py-2 text-[13px] font-medium text-[#43474f] hover:bg-[#f9f9f9]",
              !value && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
            )}
          >
            No topic guess
          </button>
        ) : null}
        {COLLECTION_TOPICS.map((topic) => {
          const active = !selectedInbox && selectedCollections.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggleCollectionTopic(topic)}
              className={cn(
                "rounded border px-3 py-2 text-[13px] font-medium text-[#43474f] hover:bg-[#f9f9f9]",
                active && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
              )}
            >
              {topic}
            </button>
          );
        })}
        {includeInbox
          ? EXCLUSIVE_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={chooseInboxTopic}
                className={cn(
                  "rounded border px-3 py-2 text-[13px] font-medium text-[#43474f] hover:bg-[#f9f9f9]",
                  selectedInbox && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
                )}
              >
                {topic}
              </button>
            ))
          : null}
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[#43474f]">
        Selected: <span className="font-semibold text-[#1a1c1c]">{value || "No topic guess"}</span>
      </p>
    </div>
  );
}
