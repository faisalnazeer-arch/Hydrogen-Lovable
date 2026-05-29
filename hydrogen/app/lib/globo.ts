export interface GloboOption {
  elementId: string; // internal Globo element ID (for conditional logic)
  name: string;      // label, used as the cart attribute key
  type: "text" | "textarea" | "dropdown" | "radio" | "checkbox" | "swatch" | "image_swatch" | "date" | "number" | "file";
  required: boolean;
  placeholder?: string;
  values?: Array<{ label: string; value: string; color?: string; image?: string }>;
  min_value?: number;
  max_value?: number;
  position: number;
  conditional?: {
    match: "all" | "any";
    conditions: Array<{ selectId: string; where: string; value: string }>;
    display: "show" | "hide";
  };
}

export interface GloboOptionSet {
  id: string;
  name: string;
  options: GloboOption[];
}

// ─── Parse Globo data embedded in the Shopify storefront HTML ─────────────────
// Globo embeds its option data via a Liquid snippet as:
//   window.GPOConfigs.options[ID] = { elements: [...], products: {...} };
export function extractGloboOptionsFromHtml(
  html: string,
  numericProductId: number
): GloboOptionSet[] {
  const results: GloboOptionSet[] = [];
  const marker = "window.GPOConfigs.options[";
  let searchFrom = 0;

  while (true) {
    const markerIdx = html.indexOf(marker, searchFrom);
    if (markerIdx === -1) break;

    const idStart = markerIdx + marker.length;
    const idEnd = html.indexOf("]", idStart);
    if (idEnd === -1) break;
    const optionSetId = html.slice(idStart, idEnd);

    const assignIdx = html.indexOf("= {", idEnd);
    if (assignIdx === -1) break;
    const jsonStart = assignIdx + 2; // position of opening '{'

    const jsonStr = extractBalancedObject(html, jsonStart);
    searchFrom = jsonStart + (jsonStr?.length ?? 1);
    if (!jsonStr) continue;

    try {
      const data = JSON.parse(jsonStr);
      const rule = data.products?.rule;
      const active = data.status === 0;
      const appliesToAll = rule?.all?.enable === true;
      const appliesToProduct =
        rule?.manual?.enable === true &&
        Array.isArray(rule?.manual?.ids) &&
        rule.manual.ids.includes(numericProductId);

      if (active && (appliesToAll || appliesToProduct)) {
        const options = flattenGloboElements(data.elements ?? []);
        if (options.length > 0) {
          results.push({ id: optionSetId, name: "", options });
        }
      }
    } catch {
      // malformed JSON block — skip
    }
  }

  return results;
}

function extractBalancedObject(str: string, start: number): string | null {
  if (str[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return null;
}

function flattenGloboElements(elements: any[]): GloboOption[] {
  const opts: GloboOption[] = [];
  for (const el of elements) {
    if (el.type === "group") {
      // recurse into group children
      opts.push(...flattenGloboElements(el.elements ?? []));
    } else {
      const opt = normalizeGloboElement(el);
      if (opt) opts.push(opt);
    }
  }
  return opts;
}

function normalizeGloboElement(el: any): GloboOption | null {
  const label: string = el.label ?? el.name ?? "";
  if (!label) return null;

  const values = (el.option_values ?? el.values ?? []).map((v: any) => ({
    label: typeof v === "string" ? v : (v.value ?? v.label ?? String(v)),
    value: typeof v === "string" ? v : (v.value ?? String(v)),
    color: v.color1 ?? v.color ?? undefined,
    image: undefined,
  }));

  const opt: GloboOption = {
    elementId: el.id ?? String(Math.random()),
    name: label,
    type: normalizeType(el.type ?? "text"),
    required: el.required ?? false,
    placeholder: el.placeholder ?? "",
    values,
    position: el.position ?? 0,
  };

  if (el.conditionalField && el.clo) {
    const clo = el.clo;
    const conditions = (clo.whens ?? [])
      .filter((w: any) => w.select && w.select !== "null")
      .map((w: any) => ({
        selectId: w.select as string,
        where: (w.where as string) ?? "EQUALS",
        value: (w.value as string) ?? "",
      }));

    if (conditions.length > 0) {
      opt.conditional = {
        match: clo.match === "any" ? "any" : "all",
        conditions,
        display: clo.display === "hide" ? "hide" : "show",
      };
    }
  }

  return opt;
}

function normalizeType(raw: string): GloboOption["type"] {
  const t = raw.toLowerCase();
  if (t === "select" || t.includes("dropdown")) return "dropdown";
  if (t.includes("textarea") || t.includes("multi")) return "textarea";
  if (t.includes("swatch") && t.includes("image")) return "image_swatch";
  if (t.includes("swatch") || t.includes("color")) return "swatch";
  if (t.includes("radio") || t.includes("button")) return "radio";
  if (t.includes("checkbox")) return "checkbox";
  if (t.includes("date")) return "date";
  if (t.includes("number")) return "number";
  if (t.includes("file")) return "file";
  return "text";
}
