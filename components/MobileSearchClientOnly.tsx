"use client";

import dynamic from "next/dynamic";

const MobileSearch = dynamic(() => import("./MobileSearch"), { ssr: false });

export default MobileSearch;
