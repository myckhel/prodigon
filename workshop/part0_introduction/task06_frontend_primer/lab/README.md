# Lab 0.6 — Frontend Primer: DevTools Tour

## Problem statement

You've seen the three anchors in the lesson: **layout, stores, streaming**. This lab walks you through finding each of them live, using your browser's DevTools. No code to write — just read, click, inspect, and explain.

By the end you should be able to:
- Trace a streaming chat message end-to-end in the Network tab.
- Open `localStorage`, identify every `prodigon-*` key, and describe its shape.
- Navigate to the SSE reconciliation logic in `chat-store.ts` by following callers.
- Use the ⌘K command palette to jump to any Part 0 lesson.

## Prerequisites

- The baseline stack is running (`make run`) with the frontend at `http://localhost:5173`.
- You have a browser with functional DevTools (Chrome, Firefox, or Edge — Safari works but its Network tab is quirkier).
- Optional but nice: the **React Developer Tools** browser extension. It adds a "Components" tab in DevTools.

If `make run` + `npm run dev` aren't green, back up to [Lesson 0.1](../../task01_getting_started/README.md) first.

## What's in this lab

No `starter/` or `solution/` directory. This is a read-along tour. Open your DevTools and work through the four exercises below, then try at least one bonus challenge.

---

## Exercise 1 — Trace a streaming chat in DevTools

**Goal:** see tokens arrive one-by-one, both on the wire and in the store.

1. Open `http://localhost:5173` and create a new chat session (or open an existing one).
2. Open DevTools → **Network** tab. Click the "Fetch/XHR" filter. You can optionally add the `EventStream` filter if your browser shows it separately.
3. Type a prompt — something that will generate a decent amount of text, like `Write three sentences about microservices.` — and send.
4. Watch the Network tab. You should see:
   - A `POST /api/v1/chat/sessions/:id/messages` (user message, fires once).
   - A long-lived request to `/api/v1/generate/stream` with **Type: `eventsource`**. Click it.
   - Select the **EventStream** tab in the request detail panel (Chrome) or **Response** (Firefox). You'll see each `data: {token: "..."}` line appearing as the model generates.
   - Another `POST /api/v1/chat/sessions/:id/messages` when streaming finishes (assistant message persistence).

5. Now open the **Components** tab (requires React DevTools extension). In the component tree, find `<ChatView>`. Select it. Look at its hooks section — you should see `useChatStore` subscriptions.

6. With streaming still in flight (send another prompt if needed), watch the `messages` state update in real time. Each token grows the `content` field of the in-flight assistant message.

**Check your understanding:**
- How many HTTP requests does one chat turn produce? (Answer: three — user POST, stream open, assistant POST.)
- Which of those is long-lived? (The SSE stream.)
- What does the store look like during streaming vs after? (During: tempId on the assistant message. After: real server-generated id.)

---

## Exercise 2 — Inspect localStorage

**Goal:** map every `prodigon-*` key to the store that writes it.

1. DevTools → **Application** tab (Chrome) or **Storage** tab (Firefox).
2. Expand **Local Storage** → `http://localhost:5173`.
3. You should see four keys:

| Key | Written by | Shape (roughly) |
|---|---|---|
| `prodigon-settings` | `settings-store.ts` | `{ state: { theme, model, leftOpen, rightOpen, apiUrl, ... }, version: 0 }` |
| `prodigon-topics` | `topics-store.ts` | `{ state: { expandedParts: ['part0', ...] }, version: 0 }` |
| `prodigon-read-history` | `topics-store.ts` | `{ state: { readHistory: { 'task-0-1': { readAt: '...' } } }, version: 0 }` |
| `prodigon-onboarded` | onboarding flow | `"true"` (plain string) |

4. Click each key and read the JSON in the right pane. Notice how Zustand's `persist` middleware wraps state in `{ state: ..., version: ... }` for migrations.
5. **Do this now:** right-click `prodigon-read-history` → Delete. Reload the page. Open the Topics panel — none of your lessons show the "read" indicator anymore. Click one to re-read it; the key is recreated.
6. Bonus: try the same with `prodigon-settings`. On reload, the app resets to defaults (system theme, all panels open).

**Check your understanding:**
- Why isn't chat history in `localStorage`? (5MB quota, main-thread write cost, Postgres is already the source of truth.)
- What's the shape difference between `prodigon-onboarded` (plain string) and the others (wrapped JSON)? (The plain string is written by a simple `localStorage.setItem`; the others go through Zustand's `persist` middleware.)

---

## Exercise 3 — Find the SSE reconciliation logic

**Goal:** trace the four-action dance from the caller to the store.

1. Open `frontend/src/stores/chat-store.ts` in your editor.
2. Find the `appendToMessage` action (around line 280). Read its body — it immutably extends the `content` field of the matching message. Note the `set(state => ({ ... }))` pattern that returns a brand-new object.
3. Find `persistAssistantMessage` (around line 309). Read what it does: POST to the backend, then swap the temp id for the real id returned from the server.
4. Now trace the callers. In your editor, "Find all references" on `appendToMessage`. You should land on `frontend/src/components/chat/chat-view.tsx`, around line 75.
5. Read the surrounding block. You'll see the full sequence in order:
   - `persistUserMessage(...)` — optimistic append + POST
   - `addAssistantPlaceholder(...)` — temp assistant bubble
   - Open SSE via `start(...)` (from `use-stream.ts`)
   - Inside the stream callback: `appendToMessage(...)` per token
   - On `done`: `persistAssistantMessage(...)`
6. Optional: open `frontend/src/hooks/use-stream.ts` and skim the `EventSource` lifecycle — `onmessage`, `onerror`, the `close` call in cleanup.

**Check your understanding:**
- Why does `persistUserMessage` fire before `addAssistantPlaceholder`? (User message needs to be saved regardless of streaming outcome; the placeholder is only useful if we're about to receive tokens.)
- What would break if `appendToMessage` mutated the message object instead of constructing a new one? (Zustand's shallow-equal diff would skip the re-render; the UI would freeze on the first token.)

---

## Exercise 4 — Command palette tour

**Goal:** confirm Part 0 is wired into the palette, and feel the keyboard-first UX.

1. Press **⌘K** (macOS) or **Ctrl+K** (Windows/Linux) anywhere in the app.
2. Type `Task 0.1`. You should see Lesson 0.1 "Getting Started" in the results. Click it or press Enter.
3. The center panel switches from chat to the markdown viewer rendering the lesson.
4. ⌘K again. Type `Task 0.6`. You should find this very lesson.
5. Try a few more searches:
   - `settings` — opens the settings modal
   - `generate` — jumps to a chat action
   - `new chat` — creates a new session
6. Close the palette with Escape. Try **⌘B** to collapse the Topics panel, **⌘/** to see the full shortcut list.

**Check your understanding:**
- Which file wires the palette? (`frontend/src/hooks/use-command-palette.ts` + `use-keyboard-shortcuts.ts`.)
- Where does the lesson list come from? (`frontend/src/lib/topics-data.ts` — the static taxonomy.)

---

## Expected final state

After the four exercises you should have:
- Seen one full streaming chat request in the Network tab, start to finish.
- Deleted and regenerated at least one `prodigon-*` localStorage key.
- Navigated from `chat-view.tsx` to `chat-store.ts` and back, tracing the SSE reconciliation.
- Used ⌘K to jump to at least two lessons.

Nothing is saved to disk as a deliverable. The deliverable is the mental model.

## Bonus challenges

### 1. Add a new keyboard shortcut

Add **⌘J** as a shortcut that focuses the chat input (wherever you are in the app).

- File: `frontend/src/hooks/use-keyboard-shortcuts.ts`
- Add a new entry to the shortcut map. The handler should call `focus()` on the `<textarea>` in `chat-view.tsx`. You may need a ref — consider exposing it via a store action (`useChatStore.getState().focusInput?.()`) or a module-level `document.querySelector`.
- Update the help overlay (⌘/) to list your new shortcut.

### 2. Add a new store for recently-viewed jobs

The current `jobs-store.ts` tracks in-flight background jobs. Add a new store, `recent-jobs-store.ts`, that keeps the last 20 completed jobs (title + duration + timestamp) and persists them via Zustand's `persist` middleware under the key `prodigon-recent-jobs`.

- Follow the exact shape of `topics-store.ts` for the persist config (it's the simplest example).
- Wire it into the Inspector panel so completed jobs show up in a "Recent" list.
- Cap the list at 20 entries — evict the oldest when the 21st arrives. (This is the quota discipline from `production_reality.md`.)

### 3. Instrument the streaming re-render count

Use the React Profiler (DevTools → Profiler tab) to record a 10-second session that includes one long streaming response. How many times does the in-flight `<MessageBubble>` component render? Is the *other* bubbles' render count zero (the goal) or nonzero (selector leak)?

If nonzero, find the leak — usually a component subscribing to `messages` as a whole instead of a specific slice.

### 4. Find the SSE heartbeat (or notice it's missing)

Per `production_reality.md`, production SSE streams should emit heartbeat comments. Search the backend (`api_gateway` + `model_service`) for any heartbeat logic. If present, find where it's emitted and consumed. If absent — congratulations, you've found an improvement the baseline is deliberately missing.

## Where this leads

You've now toured every layer of the baseline: setup, architecture, lifecycle, request flows, persistence, and the frontend. **Part 0 is done.**

Next up: **[Part I, Task 1 — REST vs gRPC](../../../part1_design_patterns/task01_rest_vs_grpc/README.md)**. We'll take the inference endpoint you just saw streaming into the frontend and re-implement it behind a gRPC service. Benchmarks, schemas, and the real-world tradeoffs between the two protocols.

## Troubleshooting

| Symptom | Check |
|---|---|
| No `eventsource` request in the Network tab | Your browser may label it `text/event-stream` under the `Other` filter. Try "All". |
| `localStorage` is empty | You might be in a private/incognito window — `localStorage` is ephemeral there. Try a normal window. |
| React DevTools doesn't show `useChatStore` state | Install the React DevTools extension for your browser and reload. |
| ⌘K does nothing | Focus is probably in an input that intercepts the keystroke. Click outside any input, then try again. |
| Part 0 lessons don't appear in ⌘K | The taxonomy wiring in `lib/topics-data.ts` may be on an older branch — `git pull` and rebuild. |
