# Historical verification

This site is built to make the difference between documented history and unverified material visible. This file explains what is currently in the data, what must be checked, and how to replace demonstration records responsibly.

## 1. Current state: Verified-First

The site follows a **Verified-First** rule (`"Verified_First": true` in `site_content.json`): the public data in `public/data/` holds only records and details that the sources cited with them support. Everything else — unconfirmed, disputed and withheld records, alternative dates, original wording — is kept in the **research register** in `research/data/`, which is never built or served. Each research record has a `Public_Status` and a `Public_Note` explaining what the public site shows and why. `research/archive/proposal-v4/` is an unchanged copy of the data the register was built from.

| | Public site (`public/data/`) | Research register (`research/data/`) |
| --- | --- | --- |
| Events | 30, all Verified | 45: 30 Verified, 9 Needs Verification, 6 Disputed |
| Places | 25: 23 Verified, 2 Illustrative | 26: 25 Verified, 1 Illustrative |
| Voyage stops | 10, all Verified, plus 36 schematic waypoints | 10 stops, 36 waypoints |
| Specifications | 18 with values; 6 shown as "Data pending verification" | 24: 18 Verified, 4 Needs Verification, 2 Disputed |
| Ship spaces | 38, all Verified | 57: 38 Verified, 18 Needs Verification, 1 Disputed |
| Sources | 38 relied on; 19 listed under "Further References (Not Relied On)" | 57, with full research notes |

Rules applied to the public data:

1. A record is published only when its cited sources support **each** of its details. An unsupported detail is removed or qualified, never replaced with another claim.
2. Wikipedia is not used as the basis for any public claim (decision D1). The only Wikipedia citation left is the provisional map pin for Lumut Naval Base, which is labelled as not independently verified (N5). The Woodlands pin is at the former base jetty, identified by NParks and the National Heritage Board (N4).
3. Disputed and unconfirmed events stay off the timeline and other factual pages (D8). The timeline has gaps where records are withheld; no replacement events are added.
4. A pin that marks an area rather than a position is Illustrative and says "not a recorded position" (D4). Voyage lines are schematic.
5. Plans are shown as plans: the 2027 opening is on the Legacy page under "Planned opening", not on the timeline (D6).
6. Sources not relied on for any public claim are listed separately (D7) and may not be cited by a public record.

`npm test` and `npm run validate-data` check these rules (`src/data/verifiedFirst.ts`).

### TLDM reference materials (Phase 2, 4 November 2026)

The TLDM briefing deck (SRC038), the list of former commanding officers (SRC039), a TLDM officer's account of Op Fajar 2009 (SRC040), newspaper clippings (SRC041–SRC050, SRC053–SRC055, SRC057) and two TLDM photograph albums (SRC051, SRC052, SRC056) were reviewed. Each source record gives the file name and the page or clipping used. Owner's decisions D-01 to D-10 (4 Nov 2026) were applied:

- Published: the commissioning at Southampton on 22 July 1977 (D-01); entry into TLDM service on 16 May 1977 (D-02); Casablanca, Alexandria and Abu Dhabi as 1977 ports, with Tunisia as an illustrative pin (D-01); HMS Mermaid's basing at Singapore in 1974–1975 and the Baldur incident of 6 May 1976 (D-03); visits in 1983, 1985, 2000 and 2007, roles, awards and later changes (D-04); the general facts of Op Fajar 2009 (D-05); official Malay names for deck spaces (D-07); the commanding-officers list with its gaps and overlaps disclosed (D-08).
- Withdrawn to the research register: the re-engining contract date, which two TLDM sources give as 22 August 1994 and 22 August 1995 (D-06, EVT025 Disputed); the ship's office, which the TLDM deck plan places on a different deck (CMP024).
- Not used anywhere: a RESTRICTED equipment list and a folder of personal forms found next to the reference folder; service numbers; operational details of Op Fajar; the 1986 court-martial reports. No photograph from the materials is published (D-09); they are listed in `research/tldm_reference_inventory.json`.
- v6.1 (owner's corrections, 4 Nov 2026): Malay wording revised (EVT012 'berhadapan', EVT015 'Mula berkhidmat dalam TLDM', 'nombor penant' kept as the TLDM spelling, 'slipping' kept); the Op Fajar text reduced to departure, mission, takeover and return (the Aden pin and the Aden report withdrawn from public use); public source descriptions no longer show local file names or paths (the research register keeps them).
- v6.2 (verified-content integration): every map pin states what its coordinates represent (`Coordinate_Basis`, shown on the map, in the place card and on event pages); the playback position is labelled schematic; page texts with historical statements show their sources (`Page_Text_Sources`); the third-party hero image of the original project is blocked from the build by its SHA-256 (`research/reference_images.json` → `Blocked_Public_Files`).
- Every change to the research register is recorded in the record's `Change_Log` (before, after, evidence, decision); `research/archive/proposal-v5.2/` is the register as it was before Phase 2.

### Open research questions (kept in the research register)

1. **What happened on 29 December 1966.** The TLDM briefing says construction began ('mula dibina'); other sources give the launch (EVT004).
2. **Re-engining contract date.** 22 August 1994 (TLDM briefing) or 22 August 1995 (on-board panel) (EVT025, D-06).
3. **Southampton details.** Ambassador (briefing) or High Commissioner (Utusan Malaysia); first crew 205 or 167; departure from Portsmouth (briefing, panel) or from Southampton (Utusan Malaysia) (EVT016, EVT017).
4. **When the training role began** (EVT023) and **when the 4-inch guns were replaced** (EVT028): the briefing confirms both changes but gives no dates.
5. **Undated visits.** Fremantle and Port Hedland (1978?), India, Pakistan and Sri Lanka (1979?), Hong Kong (1983–84?), the Langkawi salute (year not shown) (EVT042–EVT045).
6. **Deck spaces.** The ship's office deck (CMP024); the deck of 'Bilik Tidur Anggota Kapal' (CMP037); possible matches for Wisma Bintara, Junior Rate Club, Bengkel Teknikal and Bilik Kemudi Kecemasan (CMP050–CMP057); the unnamed 'Bilik' (CMP036, D9).
7. **Specifications.** Crew, the number of 40 mm guns as built, the 2007 speed figure, power and range after 1997, and the sensors as built.
8. **Commanding officers.** Three gaps and two overlaps in the TLDM list.
9. **Lumut pin.** Still provisional (N5); see `research/data/coordinate_review.json`.

### Photographs

No photograph is published yet. The project's own photographs of the on-board panels and of a technical drawing are kept in `research/photos/` until they are approved; `research/` is never included in the built site, and the development server is configured to refuse it. Images from other people are listed in `research/reference_images.json` as reference only.

## 2. Where to look for sources

Prefer primary and official sources, and record exactly where each fact was found.

- **Royal Malaysian Navy (TLDM)**: official website and publications, press releases, commissioning and decommissioning announcements, annual reports, the TLDM Museum at Lumut.
- **Archives**: Arkib Negara Malaysia; the archives of the navy that operated the ship before 1977; shipbuilder records (yard lists, launch registers) held by maritime archives.
- **Parliamentary records**: Hansard (Dewan Rakyat) for acquisitions and decommissioning.
- **Published references**: naval yearbooks and fleet directories of the period (cite edition and page), books on Malaysian naval history.
- **Newspapers**: Malaysian and foreign press coverage of commissioning, port visits, decommissioning and museum opening (cite paper, date, page).
- **The ship itself**: builder's plate, commemorative plaques, displayed captions (photograph and transcribe exactly), and interviews with former crew (record name, role, years on board, interview date and consent).
- **Photographs**: obtain permission and record the photographer/archive, date and rights for every image.

Treat websites without named sources, wikis and social media as leads only: follow them back to the original document.

## 3. How to verify and replace a record

1. **Add the source first** to `sources.json` with a full title, author/organisation, date, page or file reference and URL (only if you opened it yourself). Set `Is_Placeholder` to `false`.
2. **Edit the record** (event, location, specification…): correct the text so it says only what the source supports. Use the date precision the source gives; never add a day or month the source does not give.
3. **Link it**: add the source ID to the record's `Source_IDs`, and the record's ID to the source's `Related_Event_IDs` / `Related_Location_IDs`.
4. **Set the status**:
   - `Verified` — at least one reliable source directly supports the statement. Two independent sources are better.
   - `Needs Verification` — you believe it but only have a secondary or unclear source.
   - `Disputed` — sources disagree. Put your main source's date in `Date`, the others in `Alternative_Dates` with their `Source_ID` and a note. Do not choose silently.
5. **Set `Is_Demo_Data` to `false`** once the record is your own researched content.
6. **Write `Historical_Notes`** explaining any judgement you made (for example why one source was preferred).
7. **Run `npm run validate-data`** and check the record on the site.

For voyages, a line is only drawn solid when both of its end points are `Documented Location` + `Verified`. Ports you can document but whose route between them is unknown should stay dashed: the chart then honestly shows sequence, not track. Do not add sea waypoints and present them as recorded positions; mark them `Illustrative Waypoint`.

## 4. Before publishing

- [ ] `npm test` passes (timeline ordering, photo-privacy and Verified-First checks).

- [ ] No record intended as history still has `Is_Demo_Data: true`. The banner stays as "Research edition" while any record is Needs Verification or Disputed.
- [ ] Every `Verified` record lists at least one source (the site downgrades it otherwise).
- [ ] Disputed facts show all versions.
- [ ] Every photograph has a credit and known rights.
- [ ] Visitor information comes from the operator and has a `Last_Checked` date.
- [ ] `SRC004` and other demonstration-only records are deleted.
- [ ] Malay text has been reviewed by a fluent speaker.
- [ ] `npm run validate-data` reports no errors.
