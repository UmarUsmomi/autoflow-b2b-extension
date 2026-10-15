import { z } from "zod"

const QUEUE_KEY = "autoflow_task_queue"
const QueueTaskSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  createdAt: z.string().datetime(),
  payload: z.string(),
})
const QueueSchema = z.array(QueueTaskSchema)

export type QueueTask = z.infer<typeof QueueTaskSchema>

export type QueueStorage = {
  readonly get: (key: string) => Promise<unknown>
  readonly set: (key: string, value: unknown) => Promise<void>
}

export async function enqueueTask(storage: QueueStorage, task: QueueTask): Promise<void> {
  const raw = await storage.get(QUEUE_KEY)
  const current = QueueSchema.safeParse(raw)
  const queue = current.success ? current.data : []
  await storage.set(QUEUE_KEY, [...queue, task].slice(-20))
}

export async function readTasks(storage: QueueStorage): Promise<readonly QueueTask[]> {
  const parsed = QueueSchema.safeParse(await storage.get(QUEUE_KEY))
  return parsed.success ? parsed.data : []
}
