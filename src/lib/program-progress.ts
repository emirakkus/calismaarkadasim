export function programProgressPercent(
  totalTopics: number,
  completedTopics: number,
  totalTasks: number,
  completedTasks: number,
): number {
  const totalItems = totalTopics + totalTasks;
  if (totalItems === 0) return 0;
  return Math.round(((completedTopics + completedTasks) / totalItems) * 100);
}
