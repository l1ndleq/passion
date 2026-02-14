"use client";

import { useState } from "react";

type Section = {
  title: string;
  content: string;
};

export default function ProductDetails({
  sections,
}: {
  sections: Section[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-10 border-t border-black/10">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;

        return (
          <div key={i} className="border-b border-black/10">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left text-sm tracking-wide uppercase"
            >
              <span>{section.title}</span>
              <span
                className={`transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-96 pb-5" : "max-h-0"
              }`}
            >
              <p className="text-sm leading-relaxed text-black/70">
                {section.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
