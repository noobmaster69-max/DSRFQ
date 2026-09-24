# DSRFQ / OneZera — presentation flow and demo script

A 30-minute demo: **25 minutes on screen, 5+ minutes of questions.**
Questions are answered from `Presentation-QA.md` — keep it open on your phone or a second screen.

**The story in one line:** *a drawing comes in, and a quote, a parts list and an inspection mark-up come out — a person reviews instead of types.*

Say lines are in quotes. Everything else is what you do.

---

## Before you start — 15 minutes of preparation

Do not skip this. Almost every demo that goes wrong goes wrong here.

**1. Services.** Open **Costing → Service Status**. Every card must say **Running**, and all three tiles at the top must say **Ready**. If not, start the missing service from the control panel and wait ~10 seconds for it to turn green. (If Ollama is not installed, the parts list reader will be down — then skip the BOM part of Act 5 rather than explaining it.)

**2. Parts to have ready.**

| Part | Why you need it |
|---|---|
| **#12 — 0043-07547** (5 sheets + STEP), fully processed | The main demo. Costing, BOM and 172 balloons all present. |
| **A Walta sheet (#31–35)** | A rotated sheet and a title block with separate MATERIAL / TREATMENT cells. |
| **One fresh drawing**, never uploaded | The live upload in Act 2. Use a small single-page PDF + STEP so it finishes fast. |
| **One failed part** | For the "what happens when it goes wrong" moment. There is usually one already. |

**3. Browser tabs**, in this order, left to right — so you never navigate by menu in front of an audience:
1. Dashboard
2. Drawing Library
3. Processing Queue
4. Workspace of part #12
5. Service Status

**4. Zoom the browser to 110–125%.** Cost lines and balloon numbers are small on a projector.

**5. Have the fresh drawing's file open in Explorer**, in a folder with a short path, so the file picker opens where you need it.

**6. Check the clock.** The stages take about: drawing conversion 1 minute, costing 5 minutes, ballooning under a minute per page. You will start an upload in Act 2 and come back to it in Act 6 — that gap is deliberate, don't try to watch it finish.

---

## Flow at a glance

| # | Act | Screen | Time |
|---|---|---|---|
| 0 | The problem | none / one slide | 2 min |
| 1 | The whole picture | Dashboard | 3 min |
| 2 | Upload a drawing | Drawing Library → upload dialog | 3 min |
| 3 | What is happening now | Processing Queue | 2 min |
| 4 | The quote | Workspace #12 — Costing tray | 5 min |
| 5 | Parts list and special processes | Workspace #12 — BOM / Special process | 3 min |
| 6 | The inspection mark-up | Workspace #12 — Balloon mode | 6 min |
| 7 | Corrections stick | Balloon mode + re-run | 2 min |
| 8 | When something breaks | Service Status + a failed part | 2 min |
| 9 | Close | one slide | 2 min |

---

## Act 0 — The problem (2 min, no screen)

Don't open anything yet. Look at the room.

> "Today, a drawing arrives from a customer. Somebody opens it, reads the title block, types the part number and the material into a spreadsheet, works out the machining time, looks up a rate, and types a price. If the customer wants an inspection report, somebody else opens the same drawing and numbers every dimension by hand — one balloon at a time, a hundred and seventy of them on a job like the one I'll show you.
>
> Two people, two tools, the same drawing read twice, and a day gone. And none of it is skilled work — the skill is in the judgement at the end, not in the typing.
>
> What I'm going to show you is that drawing going in at one end, and the quote, the parts list and the numbered inspection drawing coming out at the other — with the estimator reviewing instead of typing."

**Now open the browser.**

---

## Act 1 — The whole picture (3 min) — *Dashboard*

Start here, not on a part. It says "this is a working system with history", not "this is a demo with one file in it".

Point at the top row, left to right:

> "Parts in the system. How many of the stage runs succeeded. How long a part takes from upload to finished, end to end. And the total value quoted through it."

Then the cards. Spend your time on two of them only:

- **"Where the pipeline spends its time"** —
  > "This is the honest version of 'how fast is it'. Every stage is timed on every part, so the number you get is measured on your own drawings, not promised by me."
  Hover a bar. > "And that's the slowest run, not the average — so I can see the worst case too."

- **"Recent failures"** —
  > "I'm deliberately showing you this one. Things do fail — a drawing with no 3D model, a scan that can't be read. Nothing is hidden; the part, the stage and the reason are right here, and you click through to fix it."

Click **Show table** on one chart:

> "Every chart has a table behind it, so nobody has to read a colour to get a number."

*Keep this act short. The dashboard sets the frame; the value is in the next acts.*

---

## Act 2 — Upload a drawing (3 min) — *Drawing Library*

Switch to the Drawing Library tab.

> "This is the library. One card per part."

Point at one card:

> "The thumbnail comes from the 3D model. These four chips are the pipeline — **Conversion**, **OCR**, **Costing**, **Balloon** — so at a glance I know where every part stands. And these three buttons re-run any one stage on its own."

Now click **Upload Drawing** and pick the fresh file.

> "I pick the drawing. It can be a PDF, an image, a DWG or DXF, and a STEP file for the 3D."

**Point at the stage tick boxes — this is a moment worth 30 seconds:**

> "Three things can run: **Drawing** reads the title block and the notes, **Costing** prices it from the 3D model, **Ballooning** numbers the dimensions. All three are ticked by default — but an inspector who only wants balloons unticks the other two and doesn't wait for a costing run he doesn't need. A stage you skip can always be run later from the grid."

**Then point at the readiness line beside each stage:**

> "And before I upload anything, the system tells me whether the services behind each stage are actually running. If the costing engine is down, it says so here — it doesn't let me upload and then fail silently twenty minutes later."

*(If a service happens to be down, lean into it — click Import, let the confirm box appear, and read it out: "it will wait in the queue and start when the service is back." That is a better moment than a clean run.)*

Point at **One step at a time** vs **All at once**:

> "And how hard to push the machine. One at a time is slower and much harder to fail — that's the recommendation. All at once is for a small drawing on an idle machine."

Click **Import**.

> "That's the whole operator interaction. Now leave it running — we'll come back to it."

---

## Act 3 — What is happening now (2 min) — *Processing Queue*

Switch tabs.

> "This is for whoever runs the machine. Three lanes — drawing, costing, ballooning. Each shows what's running, for how long, how many are waiting, and how many failed today."

Point at the queue rows:

> "Every job is a queued row with a position, an attempt count and the last error. You can move a rush job up, cancel one, or retry a failed one. One stuck part can't block the rest — the lanes have time-outs."

Click **Live**:

> "And it refreshes itself. Nobody sits here pressing F5."

*Keep it to two minutes. This is the "it's operable" proof, not the pitch.*

---

## Act 4 — The quote (5 min) — *Workspace of part #12*

Switch to the workspace tab. This is where the demo actually lands. Slow down.

> "This is a real part — five sheets and a STEP model. Everything you see was produced by the machine reading the drawing; nobody typed it."

**The header:**
> "Part number, revision, customer, the four stage chips again, and the running total of every cost line."

**The right panel — Part detail:**
> "Part number, revision, description, customer, material — read off the title block. Below it, measured off the 3D model: gross and net volume, how much material is removed, the weights, the face count, the hole count."
>
> "And every one of these fields is editable. This is a draft for a person to approve, not an answer to be trusted."

**The timings panel, below it:**
> "And every run is timed step by step, per part."

**Now the Costing tray at the bottom — click "Costing".**

Read two or three lines out loud:

> "This is the quote, built from the 3D model — the machining operations, setup, roughing, finishing, and the material by volume and density. Not a percentage of a guess: a line for each thing that has to happen."

Click a **Machine** cell — this is the strongest 30 seconds of the act:

> "And the machine is a choice, not a hard-coded assumption. It offers the machines that can actually hold this part — cheapest first, marked 'suggested', and one marked 'over weight limit' that it will not price on. Each one shows its axes, its envelope, its rate, and what the line would cost on it. Change the machine and the quote re-prices."

**Then be honest, before anyone asks:**

> "Two things about the number. First, costing needs a 3D model — a 2D-only part can be read and ballooned, but not priced. Second, if the material on the drawing isn't in our material master, the part gets **no** material line at all, rather than a guessed one. I'd rather give the estimator a visible gap than an invisible wrong number."

---

## Act 5 — Parts list and special processes (3 min)

Click the **BOM** tab in the tray.

> "On an assembly drawing it reads the parts list off the sheet — part number, description, quantity, engineering number."

Click **Special process**.

> "And this is the one the quality people care about. It reads the notes and pulls out the special processes."

Then the rule — say it precisely, it earns credibility with any AS9100 auditor in the room:

> "The test it uses is the AS9100D one: can you verify the result by inspecting the finished part? You cannot inspect a part and tell me it was passivated correctly, or heat treated to the right spec, or welded properly — so plating, coating, painting, cleaning, heat treatment and welding are special processes. You *can* look at a part and see that it was marked, or packed, or that the cosmetic finish is acceptable — so those are not."

> "It reads them from the PDF text, from OCR of the notes block, and from the title block itself — some customers put the treatment in a table cell, not in a note. And if a customer's own flow-down defines the list differently, that's a rule we change, not a black box."

*If you have a Walta sheet open in another tab, this is the place to flick to it:*
> "This one is a good example — the material and the treatment are in separate columns of the table, and the sheet is drawn sideways on a portrait page. It's read upright, from the text direction."

---

## Act 6 — The inspection mark-up (6 min) — *Balloon mode*

This is the act people remember. Give it the time.

Click **Balloon** in the mode switch.

> "Same part, same system — and this is the inspection mark-up. A hundred and seventy-two balloons across five sheets, found automatically."

**Let them look at the sheet for three seconds before you say anything else.**

Then the list on the right:

> "Every balloon is a row: the number, the page, a crop of the actual dimension off the drawing, the symbol, the upper and lower tolerance, the quantity, and a tick."

**Do these five things, in this order — each is a different objection answered:**

**1. It reads what a person reads.** Press **W** (Area Read), drag a box around a cluster of dimensions.
> "Draw a box, and every dimension inside it becomes a balloon, in reading order. One Ctrl+Z takes them all away again."

**2. It knows where things are.** Press **G** for the grid.
> "Every balloon is filed in its drawing zone — B3, C5 — so the inspection report tells the inspector where to look, not just what to measure."

**3. It can be checked off.** Select a balloon, press **F2**.
> "F2 marks it audited — with who and when — and jumps to the next unchecked one, across pages, and tells you when you're done. The header counts them: audited out of total. That's a reviewer's workflow, not a viewer's."

**4. It renumbers the way your customer wants.** Click **Renumber**.
> "Numbering runs continuously across all five pages. If you draw areas, it walks the areas in your order. Notes come first if that's your convention. And a related feature control frame gets numbered right after the dimension it belongs to."

**5. It comes out as a document.** Click **Export PDF**, then show **Export Excel**.
> "The marked-up PDF, with each balloon drawn in its own shape and colour — and the Excel, one line per characteristic, ready for the inspection report."

**Then the honest line:**

> "What it doesn't do yet: your customer's own inspection report template. Today it exports one standard format. That's the next thing on the list."

---

## Act 7 — Corrections stick (2 min)

This is the single most important trust point in the whole demo. Do not skip it.

Delete a balloon. Add one by hand somewhere else. Type a correction into a tolerance field.

> "Now — the question everybody asks. What happens when it reads something wrong?"

> "You fix it, here, in place. And then the important part: **your fix survives a re-run.** A balloon you deleted stays deleted — it doesn't come back next time. A balloon you added by hand is never overwritten. A tolerance you corrected stays corrected."

> "That's the difference between a tool people adopt and a tool people abandon. If correcting it is wasted work, nobody corrects it twice."

Then, briefly, a real example — it is more convincing than the principle:

> "Two real ones from the last two weeks. A rotated '43' on a low-resolution page was read as a Chinese character — the pages are now rendered at four times the resolution and turned upright before reading. And an 'SS 400' was matched to stainless 304 in the material master — it now refuses to match a different grade number. Both found by using it, both fixed, both still in the test suite so they can't come back."

---

## Act 8 — When something breaks (2 min) — *Service Status*

Switch to the Service Status tab.

> "Last thing, and it's the one IT will ask about. This is a pipeline of separate services — a message queue, the consumer, the title-block reader, the costing engine, the ballooning model. Any of them can stop."

Point at the three tiles:

> "So the system watches itself, every ten seconds, and tells you in plain language: can Drawing run right now, can Costing, can Ballooning — and if not, exactly which service it's waiting for."

Point at the strip and the line on a card:

> "An hour of history per service: up or down each minute, and its response time. So 'it felt slow this morning' becomes a chart instead of an argument."

Then flick to the failed part in the Drawing Library:

> "And when a part fails, the card says which stage failed and why — and there's a re-run button for that one stage. You don't re-do the whole part because one step tripped."

---

## Act 9 — Close (2 min)

Back to the Dashboard tab, or a slide.

> "So: one drawing in. Out the other end — a priced quote you can check line by line, a parts list, the special processes classified against AS9100D, and a fully numbered inspection drawing with its Excel. Minutes, unattended, and everything a draft that a person approves."

> "It doesn't replace the estimator or the quality engineer. It removes the typing and leaves the judgement — and every correction a person makes is kept."

> "It runs on our own machine. The drawings, the models and the results stay in our database. One step — reading the title block — currently calls a hosted vision model; if that's a problem for a customer, that step can run locally too."

> "What's next: your customers' own inspection report templates, replacing a drawing with a new revision while keeping the balloons, and a local option for the title-block reading."

> "The fastest way to judge this is your drawings, not mine. Send me three — a clean one, an awkward one, and one you'd expect it to fail — and I'll run them and show you exactly what came back."

**That ask is the point of the presentation. Say it last, and stop talking.**

---

## If something goes wrong on the day

| What happens | What you do |
|---|---|
| A service is down mid-demo | Open Service Status, point at it. *"This is what I meant — it tells you."* Start it; it turns green in ten seconds. Carry on with part #12, which is already processed. |
| The live upload hasn't finished by Act 6 | Ignore it. Everything after Act 3 uses part #12. Mention the real timings from the Dashboard instead. |
| A stage fails on the live upload | Use it. Show the failure on the card, the reason, and the per-stage **re-run** button. A recovery is more persuasive than a clean run. |
| The projector eats fine detail | Zoom to 150% and use the balloon **list** rather than the sheet — the crops are readable at any size. |
| No internet / hosted model unreachable | Drawing conversion and OCR degrade. Demo Costing and Ballooning, which are fully local, and say so plainly. |
| A question you can't answer | *"Good question — I'll run it on your drawing and come back to you."* Then actually do it. |

---

## The five-minute version

If you get cut to five minutes, do only this:

1. **Drawing Library** — *"one card per part, four stages, this is what a day's quoting looks like."* (30 s)
2. **Workspace → Costing tray** — *"priced from the 3D model, line by line, and the machine is a choice you can change."* (90 s)
3. **Balloon mode** — *"172 balloons, found automatically, with zones and tolerances, exported to PDF and Excel."* (2 min)
4. **The ask** — *"send me three of your drawings."* (30 s)

Skip the Dashboard, the queue, the upload and the service status entirely.

---

## Slide outline (if you want slides behind you)

Keep them to seven. The demo is the presentation; slides are only the frame.

1. **Title** — DSRFQ / OneZera: from drawing to quote.
2. **Today** — two people, two tools, the same drawing read twice. (Act 0)
3. **The pipeline** — one diagram: Drawing → Costing → Ballooning, with what each produces.
4. *(demo — blank or logo slide, so nobody reads while you talk)*
5. **What it produces** — quote / parts list / special processes / inspection mark-up + Excel.
6. **What it doesn't do yet** — the five limitations from `Presentation-QA.md` Q22. Put them on a slide yourself; it disarms the room.
7. **The ask** — send three drawings.

---

## After the presentation

Open `Presentation-QA.md`. It has the twenty-three questions you are most likely to get, grouped by who asks them, with the one-line answer in bold and the detail underneath.

Two habits from that file are worth repeating here:

- **Never quote an accuracy percentage you haven't measured.** Say: *"it drafts, a person approves, and every correction is kept."*
- **When asked "can it do X for our drawings?" — offer to run one.** That converts better than any answer you can give from the stage.
