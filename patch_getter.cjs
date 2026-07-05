const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = `  public get lastErrorStr(): string {
    return this.lastError || "";
  }`;

const replacement = `  public get lastErrorStr(): string {
    return this.lastError || "";
  }

  public get isLegacySchema(): boolean {
    return !this.hasAcademicYearColumn;
  }`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Added isLegacySchema getter");
} else {
    console.log("Anchor not found");
}
