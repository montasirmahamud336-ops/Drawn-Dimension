export const SERVICES = [
    "Web Design & Development",
    "AutoCAD Technical Drawings",
    "3D SolidWorks Modeling",
    "PFD & P&ID Diagrams",
    "HAZOP Study & Risk Analysis",
    "Graphic Design & Branding"
] as const;

export type ServiceName = typeof SERVICES[number];
