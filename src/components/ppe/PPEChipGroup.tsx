import React from "react";
import { PPEItem, PPEState } from "../../types";
import { PPEChip } from "./PPEChip";

interface PPEChipGroupProps {
  ppe: Record<PPEItem, PPEState>;
}

const ORDERED_ITEMS: PPEItem[] = ["helmet", "vest", "shoes", "gloves", "goggles"];

export const PPEChipGroup: React.FC<PPEChipGroupProps> = ({ ppe }) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ORDERED_ITEMS.map((item) => (
        <PPEChip 
          key={item} 
          item={item} 
          state={ppe?.[item] || "NOT_VISIBLE"} 
        />
      ))}
    </div>
  );
};
