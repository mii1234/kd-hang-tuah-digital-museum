// Data models mirroring the JSON files in public/data/.
// Field names match the JSON exactly so the files stay easy to edit by hand.

export type Verification = 'Verified' | 'Needs Verification' | 'Illustrative' | 'Disputed';
export const VERIFICATION_VALUES: Verification[] = ['Verified', 'Needs Verification', 'Illustrative', 'Disputed'];

export type DatePrecision = 'day' | 'month' | 'year';

export interface AlternativeDate {
  Date: string;
  Date_Precision?: DatePrecision | null;
  Source_ID?: string;
  Note?: string;
}

export interface HistoricalEvent {
  Event_ID: string;
  Date: string;
  Date_Precision?: DatePrecision | null;
  End_Date?: string | null;
  Event_Title: string;
  Event_Title_MS?: string;
  Event_Category: string;
  Location_ID?: string | null;
  Description: string;
  Description_MS?: string;
  Historical_Notes?: string;
  Image_URL?: string;
  Image_Caption?: string;
  Image_Credit?: string;
  Source_URL?: string;
  Source_IDs?: string[];
  Alternative_Dates?: AlternativeDate[];
  Related_Event_IDs?: string[];
  Verification: Verification;
  Is_Demo_Data: boolean;
  Display_Order?: number;
}

export interface Location {
  Location_ID: string;
  Location_Name: string;
  Location_Name_MS?: string;
  Country?: string;
  Latitude: number;
  Longitude: number;
  Location_Type?: string;
  Description?: string;
  /** What the pin's coordinates represent (e.g. "Approximate port position — not the ship's berth"). Shown next to the coordinates. */
  Coordinate_Basis?: string;
  Coordinate_Basis_MS?: string;
  Source_IDs?: string[];
  Verification: Verification;
  Is_Demo_Data: boolean;
}

export type PositionType = 'Documented Location' | 'Approximate Position' | 'Illustrative Waypoint';

export interface RoutePoint {
  Route_Point_ID: string;
  Voyage_ID: string;
  Sequence_No: number;
  Date?: string | null;
  Date_Precision?: DatePrecision | null;
  Location_ID?: string | null;
  Related_Event_ID?: string | null;
  Latitude: number;
  Longitude: number;
  Position_Type: PositionType | string;
  Route_Status: Verification;
  Source_IDs?: string[];
  Is_Demo_Data: boolean;
  Notes?: string;
}

export interface Voyage {
  Voyage_ID: string;
  Voyage_Title: string;
  Voyage_Title_MS?: string;
  Start_Date?: string;
  End_Date?: string;
  Description?: string;
  Route_Point_IDs: string[];
  Related_Event_IDs?: string[];
  Source_IDs?: string[];
  Verification: Verification;
  Is_Demo_Data: boolean;
}

export interface ShipComponent {
  Component_ID: string;
  Component_Name: string;
  Component_Name_MS?: string;
  Category: string;
  Description: string;
  Ship_Section?: string;
  Image_URLs: string[];
  Image_Captions?: string[];
  Photo_Credit?: string;
  Source_IDs?: string[];
  Verification: Verification;
  Is_Demo_Data: boolean;
}

export interface GalleryImage {
  Image_ID: string;
  Image_URL: string;
  Caption: string;
  Category: string;
  Date?: string | null;
  Date_Precision?: DatePrecision | null;
  Related_Event_IDs?: string[];
  Credit?: string;
  Rights_Status?: string;
  Is_Demo_Data: boolean;
}

export interface Source {
  Source_ID: string;
  Source_Title: string;
  Author_or_Organisation?: string;
  Source_Type?: string;
  Publication_Date?: string;
  Source_URL?: string;
  Document_Reference?: string;
  Related_Event_IDs?: string[];
  Related_Location_IDs?: string[];
  Image_Credit?: string;
  Rights_Status?: string;
  Verification_Notes?: string;
  Is_Placeholder?: boolean;
  /** false = listed under "Further References (Not Relied On)"; such a source must not be cited by any public record. */
  Relied_On?: boolean;
}

export interface VerifiedField {
  Value: string;
  Verification: Verification;
  Source_IDs?: string[];
}

export interface Specification extends VerifiedField {
  Key: string;
  Label: string;
  Label_MS?: string;
  Unit?: string;
}

export interface ShipName {
  Name: string;
  Navy?: string;
  From?: string;
  To?: string;
  Verification: Verification;
  Source_IDs?: string[];
  Notes?: string;
}

export interface ShipSection {
  Section_ID: string;
  Title: string;
  Body: string;
  Verification: Verification;
  Source_IDs?: string[];
  Image_URL?: string;
  Image_Caption?: string;
  Image_Credit?: string;
}

/** One entry of the commanding-officers list, as written in the TLDM source (no service numbers). */
export interface CommandingOfficer {
  No: number;
  Rank: string;
  Name: string;
  From: string; // ISO date
  To: string;   // ISO date
  From_As_Written?: string;
  To_As_Written?: string;
  Later?: string;
  Later_MS?: string;
}

/** The commanding-officers list with a disclosure of its gaps and overlaps. */
export interface CommandingOfficers {
  Title: string;
  Title_MS?: string;
  Intro?: string;
  Intro_MS?: string;
  Note: string;
  Note_MS?: string;
  Verification: Verification;
  Source_IDs: string[];
  Entries: CommandingOfficer[];
}

export interface ShipProfile {
  Ship_Name: string;
  Pennant_Number?: VerifiedField;
  Historical_Names: ShipName[];
  Summary: string;
  Sections: ShipSection[];
  Specifications: Specification[];
  Commanding_Officers?: CommandingOfficers;
  Hero_Image_URL?: string;
  Hero_Image_Caption?: string;
  Hero_Image_Credit?: string;
  Is_Demo_Data: boolean;
}

export type LocalisedContent = Record<string, string>;

/** An announced plan (not a historical event). Shown on the Legacy page, never on the timeline. */
export interface PlannedItem {
  Status: 'Planned';
  Date: string;
  Date_Precision?: DatePrecision | null;
  Title: string;
  Title_MS?: string;
  Text: string;
  Text_MS?: string;
  Source_IDs: string[];
}

export interface SiteContent {
  Show_Demo_Notice: boolean;
  Institution_Name: string;
  Institution_Note: string;
  /** Credit used wherever a record says {project_photo_credit}. Change it here to update every credit at once. */
  Project_Photo_Credit?: string;
  /** true: public data holds only records supported by their cited sources (checked by checkVerifiedFirst). */
  Verified_First?: boolean;
  /** Sources for page text that makes historical statements, keyed by the text key (e.g. legacy_body). */
  Page_Text_Sources?: Record<string, string[]>;
  Planned_Opening?: PlannedItem;
  Home_Coordinates?: { Label: string; Latitude: number; Longitude: number; Note?: string };
  en: LocalisedContent;
  ms: LocalisedContent;
  Visitor_Info: Record<string, string>;
}

export interface DataIssue {
  file: string;
  id?: string;
  level: 'error' | 'warning';
  message: string;
}

export interface MuseumData {
  ship: ShipProfile;
  events: HistoricalEvent[]; // sorted chronologically
  locations: Location[];
  voyages: Voyage[];
  routePoints: RoutePoint[]; // sorted by voyage + sequence
  components: ShipComponent[];
  gallery: GalleryImage[];
  sources: Source[];
  content: SiteContent;
  issues: DataIssue[];
  // Lookup maps built once after loading.
  eventById: Map<string, HistoricalEvent>;
  locationById: Map<string, Location>;
  sourceById: Map<string, Source>;
}
