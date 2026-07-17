import { useEffect, useState } from "react";
import { api } from "../api";
import type { ActivityDef } from "../types";

let cache: ActivityDef[] | null = null;

export function useActivities(): ActivityDef[] {
  const [activities, setActivities] = useState<ActivityDef[]>(cache || []);

  useEffect(() => {
    if (cache) return;
    api.get<{ activities: ActivityDef[] }>("/meta/activities").then((res) => {
      cache = res.activities;
      setActivities(res.activities);
    });
  }, []);

  return activities;
}
