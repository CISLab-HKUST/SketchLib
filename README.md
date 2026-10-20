# SketchLib

**SketchLib** is an online library for research on sketching, drawing, and vector graphics. It brings papers from across sketch understanding, sketch-based image synthesis, 3D sketching, modeling, processing, animation, and non-photorealistic rendering into one searchable collection.

The library is a lightweight static website backed by [`papers.csv`](papers.csv). It currently contains **799 papers**. Browse by topic, year, or venue; search titles, authors, and bibliographic details; and follow links to the paper or DOI.

## Features

- Search across the paper metadata, including titles, full author lists, venues, topics, DOI, URL, and BibTeX.
- Filter by year, topic, and publication venue.
- Browse topics using the collection’s topic hierarchy.
- Sort the table by paper title, authors, year, or venue.
- Open the paper or DOI from the results table, or download the complete CSV.

## Run locally

SketchLib has no build step or package dependencies. Serve the repository directory over HTTP so the browser can load `papers.csv`:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Stop the server with `Ctrl+C`.

## Browse the collection

Use the search field to find a title, author, topic, or other bibliographic detail. Choose a start year, an end year, or both to set an inclusive year range. The **Venue** and **Topics** menus support multiple selections; results match any selected venue and any selected topic. Search and all filter groups can be combined. Topic options follow the hierarchy below, and venue options are grouped by CCF tier. Use **Reset** to clear all selections.

Select a column heading to sort the results. The table shows 25 papers per page; use the controls below it to navigate. Select a paper’s title or the **Paper** link to open its source. Select **DOI** to open the DOI resolver when one is available.

## Topic taxonomy

Use these exact topic names in the `Labels` column. Multiple labels for a paper are separated with semicolons.

- Sketching and Thinking
- Sketch Representations
- Sketch Rendering
- Sketch Understanding
  - Sketch Recognition
  - Sketch Segmentation
  - Sketch Abstraction
  - Stroke Intent
  - Sketch Distortion
- Sketch-Based Image Synthesis
  - Sketch-Based Image Retrieval
  - Sketch-Based Image Generation
    - GAN-Based Methods
    - Diffusion-Based Methods
  - Sketch-Based Image Editing
  - Sketch Colorization
- 3D Sketching
  - Sketching in VR/AR
  - Lifting 2D Sketches
- Sketch-Based Modeling
  - Sketch-Based Shape Retrieval
  - Geometry-Based Methods
  - Data-Driven Methods
- Sketch Processing
  - Sketch Cleanup
  - Vectorization
  - Vector Graphics Editing
- Sketch Animation
  - Drawing Process Synthesis
  - Sketch Inbetweening
- Sketch Synthesis
  - Raster Sketch Extraction
  - Vector Sketch Generation
- Non-Photorealistic Rendering

## Dataset format

[`papers.csv`](papers.csv) is the source of truth for the library. Each row represents one paper and uses these columns:

| Column | Description |
| --- | --- |
| `DOI` | DOI identifier for the publication |
| `Paper Title` | Full paper title |
| `Authors` | Complete author list in given-name-first order, separated by a comma and a space, e.g. `Nadav Benedek, Ariel Shamir, Ohad Fried` |
| `Year` | Publication year |
| `Publication Venue` | Venue name or abbreviation shown in the library |
| `URL` | Link to the paper or its publisher page |
| `BibTeX` | Bibliographic entry for citation managers |
| `Labels` | One or more taxonomy labels, separated by semicolons |
| `Selected` | Optional curation marker retained in the dataset |

CSV values containing commas, quotes, or line breaks must follow standard CSV quoting rules. The website reads the column names above directly, so preserve them when editing the dataset.

Display titles use title case while preserving method names, acronyms, and version identifiers. Keep the BibTeX title consistent with the display title and protect its capitalization with braces. BibTeX author names use standard BibTeX syntax with `and` between authors; the comma-separated given-name-first rule applies to the `Authors` column.

Use `Vector Graphics Editing` for geometry, structure, or program edits to vector graphics and icons, including editing benchmarks. Combine it with `Vectorization` when the method also reconstructs vector geometry from raster input, and with `Sketch Animation` when it edits animated vector content. Generation-only papers should use synthesis labels rather than the editing label. See [`label-audit.csv`](label-audit.csv) for the nine papers added in this contribution.

## Publication audit

[`publication-audit.csv`](publication-audit.csv) records the 2026-10-20 audit of all 126 entries previously labelled `arXiv`. It lists the checked arXiv record, publisher/official-conference source where verified, resulting metadata, and the reason for each decision. Eighty-nine entries were updated to verified publication or explicitly identified acceptance/workshop records; one of these was merged into an existing IJCAI paper. Thirty-seven entries remain labelled `arXiv` because a published version was not verified. This is not a claim that those papers are unpublished. Records supported only by an author's acceptance announcement are distinguished from final proceedings records, and workshop papers are distinguished from main-track papers. The audit explicitly documents conflicting publication and authorship evidence for the Paint Bucket Colorization preprint, whose existing author list is retained pending a final publisher record.

The audit also flags the administratively removed Sakuga-42M arXiv record for maintainer review. Its row is retained rather than silently removed.

## Add or update a paper

1. Check for an existing entry by DOI and title before adding a row.
2. Confirm the title, **complete author list**, year, and publication venue from a reliable publication record.
3. Include the DOI, paper URL, and BibTeX entry when available; keep venue naming consistent with existing rows.
4. Add one or more suitable labels from the taxonomy above, separated by semicolons. Use the exact spelling and capitalization shown.
5. Save the file as UTF-8 CSV and check the website’s search, filters, and paper links after serving it locally.
6. Submit a Pull Request with the updated `papers.csv` and we will review the PR.

## Project files

| File | Purpose |
| --- | --- |
| [`index.html`](index.html) | Page structure and library controls |
| [`styles.css`](styles.css) | Visual design and responsive layout |
| [`app.js`](app.js) | CSV loading, search, sorting, filters, and pagination |
| [`papers.csv`](papers.csv) | Paper metadata and topic labels |

## Citation

For citation details, use the paper’s DOI or BibTeX entry in `papers.csv`. SketchLib is a curated index; cite the original paper when referring to a research result.
