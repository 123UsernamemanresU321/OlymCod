"use client";

import { MATH_TOPICS, SPECIAL_TOPICS, buildTopicValue, splitTopicValue } from "@/lib/constants/notes";
import { cn } from "@/lib/utils/cn";

interface TopicSelectorProps {
  value: string;
  onChange: (topic: string) => void;
  includeInbox?: boolean;
  allowEmpty?: boolean;
}

export function TopicSelector({ value, onChange, includeInbox = false, allowEmpty = false }: TopicSelectorProps) {
  const selected = splitTopicValue(value);
  const selectedSpecial = SPECIAL_TOPICS.find((topic) => selected.includes(topic));
  const selectedMath = selected.filter((topic) => MATH_TOPICS.includes(topic as (typeof MATH_TOPICS)[number]));
  const visibleSpecialTopics = includeInbox
    ? SPECIAL_TOPICS
    : SPECIAL_TOPICS.filter((topic) => topic !== "Inbox");

  function toggleMathTopic(topic: string) {
    const nextTopics = selectedMath.includes(topic)
      ? selectedMath.filter((item) => item !== topic)
      : [...selectedMath, topic];
    onChange(buildTopicValue(nextTopics));
  }

  function chooseSpecialTopic(topic: string) {
    onChange(topic);
  }

  return (
    <div className="rounded border border-[#c3c6d0] bg-white p-3">
      <div className="flex flex-wrap gap-2">
        {MATH_TOPICS.map((topic) => {
          const active = !selectedSpecial && selectedMath.includes(topic);
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
        {visibleSpecialTopics.map((topic) => {
          const active = selectedSpecial === topic;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => chooseSpecialTopic(topic)}
              className={cn(
                "rounded border px-3 py-2 text-[13px] font-medium text-[#43474f] hover:bg-[#f9f9f9]",
                active && "border-[#2c5282] bg-[#dbeafe] text-[#0e3b69]"
              )}
            >
              {topic}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[#43474f]">
        Selected: <span className="font-semibold text-[#1a1c1c]">{value || "No topic guess"}</span>
      </p>
    </div>
  );
}
