import { describe, expect, it } from "vitest";
import { parseAsvsPtMarkdown } from "../services/asvsPtCatalog.js";

const SAMPLE = `# V3 Segurança de Frontend Web

## V3.2 Interpretação Não Intencional de Conteúdo

| # | Descrição | Nível |
| :---: | :--- | :---: |
| **3.2.1** | Verifique se há controles de segurança em vigor para evitar renderização incorreta. | 1 |
| **3.2.2** | Verifique se o conteúdo de texto usa funções seguras de renderização. | 1 |
`;

describe("parseAsvsPtMarkdown", () => {
  it("normaliza req_id e extrai descrições pt-BR", () => {
    const rows = parseAsvsPtMarkdown(SAMPLE);
    expect(rows).toHaveLength(2);
    expect(rows[0].req_id).toBe("V3.2.1");
    expect(rows[0].req_description).toContain("controles de segurança");
    expect(rows[0].chapter_name).toBe("Segurança de Frontend Web");
    expect(rows[0].section_name).toContain("V3.2");
  });
});
