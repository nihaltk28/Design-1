// One representative URL per template in the CLAUDE.md §2 route table — shared by every e2e spec.
// Add a row here with each new template.
export const PAGES = ["/"];

export const url = (locale: string, page: string) => `/${locale}${page === "/" ? "" : page}`;
