/** Shared single-banner vocabulary; rarity-specific unlock cards keep their own queue. */
export function notificationPresentation(message: string) {
  if (/没有对应等级的备弹|无备弹/.test(message))
    return { text: "无备弹 · 切换弹药", tone: "danger" };
  if (
    /立即规划撤离|最后.*分钟|手雷|蓄力|警觉|答案错误|正在蓄力|倒下|进食被打断/.test(
      message,
    )
  )
    return { text: message, tone: "danger" };
  if (/击败|完成|成功/.test(message)) return { text: message, tone: "reward" };
  if (/撤离已|撤离启动/.test(message))
    return { text: message, tone: "success" };
  if (/不足|已满|锁定|没有食物|无法|需要.*金币/.test(message))
    return { text: message, tone: "warning" };
  return { text: message, tone: "info" };
}
