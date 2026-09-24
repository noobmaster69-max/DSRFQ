# DSRFQ / OneZera — likely questions after the presentation

Short answers you can say out loud first, then the detail if they push.
Grouped by who usually asks. **Bold** = the one-line answer.

---

## 1. Business value (management, sales)

**Q1. How much time does this actually save?**
**An estimator reads a drawing and prices it by hand in hours; here the reading, costing and ballooning run unattended in minutes, and the person reviews instead of typing.**
Detail: on the demo part (0043-07547, 5 sheets + STEP) the pipeline ran drawing conversion ~1 min, costing ~5 min, ballooning under a minute per page. The dashboard shows real per-stage timings for every part, so the saving can be measured on your own drawings rather than taken on trust.

**Q2. Does it replace the estimator / the quality engineer?**
**No — it removes the typing, not the judgement.** Every result is a draft: cost lines, BOM, special processes and balloons are all editable, and anything a person corrects is kept on a re-run (deleted balloons stay deleted, hand-added ones are never overwritten).

**Q3. What does it cost to run?**
**Mostly one local Windows machine.** The ballooning engine, geometry analysis and parts-list reader run on-premise. Title-block recognition calls a hosted vision model per drawing (see Q16), which is the only per-use cost.

**Q4. What is the ROI / when does it pay back?**
**It depends on quote volume — measure it on a week of real RFQs.** The dashboard already records how long each stage takes and how many parts fail, which gives the before/after numbers without extra work. (Don't quote a payback figure you haven't measured.)

**Q5. Can we use it for our customers' drawings, not just the demo?**
**Yes — it has run on several customer formats** (Applied Materials sheets with ASME notes, Walta sheets with separate MATERIAL/TREATMENT columns, landscape sheets laid sideways on a portrait page). Each new title-block style is the thing to test first.

---

## 2. Accuracy and trust (quality, engineering)

**Q6. How accurate is the ballooning?**
**On clean vector PDFs it finds essentially every dimension; the operator audits the rest.** The demo drawing produced 172 balloons across 5 pages. Each balloon carries its tolerance and grid zone, and there is an audit mark (F2) so a reviewer can tick through them and see what is still unchecked.

**Q7. What happens when it reads something wrong?**
**You fix it in place, and the fix survives a re-run.** Recent real examples, all found and fixed: a rotated "43" read as a Chinese character on a low-resolution page (now pages are rendered at 200 dpi and turned upright before recognition); "SS 400" matched to stainless SS 304 (now a different grade number is never matched).

**Q8. How does it decide what is a "special process"?**
**By the AS9100D test: can the result be verified by inspecting the finished part?** Plating, coating, painting, cleaning, heat treatment and welding — no, so they are special. Packaging, marking, cosmetic acceptance — yes, so they are not. Notes are read from the PDF text, from OCR of the notes block, and from the title block's surface/heat-treatment cells.

**Q9. What if the customer's own flow-down defines special processes differently?**
**The classification is a rule, not a black box, so it can follow their list.** Rows can also be added or removed by hand and are kept.

**Q10. How is the cost calculated — can I trust the number?**
**It is built from the 3D model: machining operations, setup, roughing, finishing, material by volume and density.** Every line is visible, so the number can be checked line by line rather than trusted. If the material on the drawing is not in the material master, the part gets no material line instead of a guessed one — that is deliberate.

**Q11. Does it handle multi-page drawings / assemblies / rotated sheets?**
**Yes to all three.** Numbering continues across pages; an assembly STEP is split and the largest part is costed; a sideways sheet is detected from its text direction and read upright.

**Q12. What drawing formats are supported?**
**PDF (including 3D/MBD PDFs), images, DWG/DXF (converted), and STEP/STP for costing.** Costing needs a 3D model; ballooning and drawing reading need only the 2D drawing.

---

## 3. Process and daily use (operators, estimators)

**Q13. What if I only need balloons, not a quote?**
**Untick Costing and Drawing when uploading.** The upload dialog offers Drawing / Costing / Ballooning, all ticked by default; unticked stages show as "Skipped", and any stage can be run later from the grid.

**Q14. What if a stage fails?**
**The card shows which stage failed and why, and there is a Re-run button per stage.** Jobs go through a queue with time-outs, so one stuck part cannot block the rest.

**Q15. Can several people use it at once / from home?**
**Yes — it is a web application.** Access is by login; for remote users it is published over the company's private Tailscale network only, not the open internet. The grid updates live as stages finish.

**Q16. How does it compare with One Supply (the ballooning tool)?**
**It covers the same ballooning workflow inside the quoting system** — area/single recognition, undo/redo, audit, styles, number categories, grid zones, notes first — so the drawing, the quote and the inspection mark-up live in one place. Remaining gaps (customer Excel report templates, replace-drawing-revision) are on the roadmap.

---

## 4. IT, security, data (IT, management)

**Q17. Where does our data go? Is anything sent to the cloud?**
**Drawings, models and results are stored on our own server and database.** Be precise here: ballooning, geometry/costing and the parts-list reader run locally; **title-block recognition sends the rendered title-block image to a hosted vision model**. If that is a problem for a customer, that one step can be switched to a local model — say so rather than claiming "fully offline".

**Q18. What does it run on?**
**One Windows machine with a GPU-capable Python environment, SQL Server, RabbitMQ and MySQL; each part is a Windows service that restarts itself.** A scripted installer sets up a new machine end to end.

**Q19. Who can see what?**
**Standard role-based permissions** (Serenity framework): users see the modules their role allows; costing and shop settings can be restricted to administrators.

**Q20. How is it backed up / what if the server dies?**
**Everything is in the database plus the upload folder — back up both.** The installer can rebuild the application on a new machine from a payload; the data comes from the backup.

**Q21. Does it integrate with our ERP?**
**It shares the same stack as DS_ERP and exposes services and APIs, so pushing a costed part across is an integration step, not a rewrite.** (Only claim what is connected today.)

---

## 5. Limitations — say these before someone else does

**Q22. What doesn't it do well yet?**
- **Poor scans / lettering drawn as outlines:** notes and text are read by OCR instead of from the PDF text, so they need more review.
- **Costing needs a 3D model;** a 2D-only part can be read and ballooned but not priced.
- **Materials must exist in the material master** (e.g. SS 400, Assab 760, XW 42 have to be added) to get a material cost line.
- **Parts list reading needs the local vision model installed** on the server.
- **Customer-specific inspection report templates** are not built yet — ballooned results export to one standard Excel/PDF format.

**Q23. What is next on the roadmap?**
Customer inspection report templates, "replace with new revision and keep balloons", higher-resolution page images for the on-screen drawing, and a local option for title-block recognition.

---

## Handling tips

- **"How accurate is it?"** — never give a single percentage you haven't measured. Say: "it drafts, a person approves, and every correction is kept".
- **A question you can't answer** — "Good question — I'll check it on your drawing and come back to you." Then do exactly that.
- **"Can it do X for our drawings?"** — offer to run one of their drawings. That converts better than any answer.
- Have the demo part (#12, 0043-07547) and one Walta sheet (#31–35) open in case someone asks to see a rotated drawing or a failure case.
