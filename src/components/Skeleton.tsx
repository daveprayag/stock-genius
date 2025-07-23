import React from "react";

export default function Skeleton({ className = "", style = {} }) {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={style}
    />
  );
}
