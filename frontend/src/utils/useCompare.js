import { useEffect, useState } from "react";
import { COMPARE_EVENT, getCompareItems } from "./compare";

export default function useCompareItems() {
  const [items, setItems] = useState(() => getCompareItems());

  useEffect(() => {
    const update = () => setItems(getCompareItems());
    window.addEventListener(COMPARE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(COMPARE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return items;
}
