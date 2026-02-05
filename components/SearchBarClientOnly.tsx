"use client";

import dynamic from "next/dynamic";

const SearchBar = dynamic(() => import("./SearchBar"), {
  ssr: false,
});

export default function SearchBarClientOnly({
  className = "",
}: {
  className?: string;
}) {
  return <SearchBar className={className} />;
}
